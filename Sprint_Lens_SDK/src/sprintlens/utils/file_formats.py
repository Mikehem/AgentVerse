"""
Advanced File Format Support for Sprint Lens SDK.

This module provides comprehensive support for multiple file formats including:
- Parquet files
- Excel files (XLS, XLSX)
- Compressed files (ZIP, GZIP, TAR)
- Advanced CSV handling with encoding detection
- JSON/JSONL with schema inference
"""

import io
import gzip
import zipfile
import tarfile
import json
import csv
from pathlib import Path
from typing import List, Dict, Any, Optional, Union, BinaryIO, TextIO
from dataclasses import dataclass
from enum import Enum
import tempfile
import logging

# Optional imports with graceful fallbacks
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    import pyarrow as pa
    import pyarrow.parquet as pq
    HAS_PYARROW = True
except ImportError:
    HAS_PYARROW = False

try:
    import chardet
    HAS_CHARDET = True
except ImportError:
    HAS_CHARDET = False

from ..utils.logging import get_logger

logger = get_logger(__name__)


class FileFormat(Enum):
    """Supported file formats."""
    CSV = "csv"
    JSON = "json"
    JSONL = "jsonl"
    PARQUET = "parquet"
    EXCEL_XLS = "xls"
    EXCEL_XLSX = "xlsx"
    ZIP = "zip"
    GZIP = "gzip"
    TAR = "tar"
    TAR_GZ = "tar.gz"
    UNKNOWN = "unknown"


@dataclass
class FileInfo:
    """Information about a file."""
    format: FileFormat
    size_bytes: int
    encoding: Optional[str] = None
    compression: Optional[str] = None
    sheets: Optional[List[str]] = None  # For Excel files
    estimated_rows: Optional[int] = None
    estimated_columns: Optional[int] = None


@dataclass
class ParseResult:
    """Result of file parsing operation."""
    data: List[Dict[str, Any]]
    file_info: FileInfo
    warnings: List[str]
    errors: List[str]
    metadata: Dict[str, Any]


class FileFormatDetector:
    """Detects file formats based on content and extension."""
    
    @staticmethod
    def detect_format(file_path: Union[str, Path], content: Optional[bytes] = None) -> FileFormat:
        """
        Detect file format from path and/or content.
        
        Args:
            file_path: Path to the file
            content: Optional file content for content-based detection
            
        Returns:
            Detected file format
        """
        path = Path(file_path)
        extension = path.suffix.lower()
        
        # Extension-based detection
        extension_map = {
            '.csv': FileFormat.CSV,
            '.json': FileFormat.JSON,
            '.jsonl': FileFormat.JSONL,
            '.parquet': FileFormat.PARQUET,
            '.xls': FileFormat.EXCEL_XLS,
            '.xlsx': FileFormat.EXCEL_XLSX,
            '.zip': FileFormat.ZIP,
            '.gz': FileFormat.GZIP,
            '.tar': FileFormat.TAR,
        }
        
        # Handle compound extensions
        if path.name.endswith('.tar.gz'):
            return FileFormat.TAR_GZ
        
        if extension in extension_map:
            return extension_map[extension]
        
        # Content-based detection
        if content:
            return FileFormatDetector._detect_from_content(content)
        
        logger.warning(f"Unknown file format for {file_path}")
        return FileFormat.UNKNOWN
    
    @staticmethod
    def _detect_from_content(content: bytes) -> FileFormat:
        """Detect format from file content."""
        # Check for common magic bytes
        if content.startswith(b'PK\x03\x04'):  # ZIP
            return FileFormat.ZIP
        elif content.startswith(b'\x1f\x8b'):  # GZIP
            return FileFormat.GZIP
        elif content.startswith(b'PAR1'):  # Parquet
            return FileFormat.PARQUET
        elif content.startswith(b'\xd0\xcf\x11\xe0'):  # Old Excel
            return FileFormat.EXCEL_XLS
        elif content.startswith(b'PK') and b'xl/' in content[:1000]:  # New Excel
            return FileFormat.EXCEL_XLSX
        
        # Try to decode as text and check content
        try:
            text_content = content.decode('utf-8')[:1000]
            if text_content.strip().startswith('{') and text_content.strip().endswith('}'):
                return FileFormat.JSON
            elif '\n' in text_content and all(line.strip().startswith('{') for line in text_content.split('\n')[:5] if line.strip()):
                return FileFormat.JSONL
            elif ',' in text_content and '\n' in text_content:
                return FileFormat.CSV
        except UnicodeDecodeError:
            pass
        
        return FileFormat.UNKNOWN


class EncodingDetector:
    """Detects text file encoding."""
    
    @staticmethod
    def detect_encoding(content: bytes) -> str:
        """
        Detect text encoding from file content.
        
        Args:
            content: File content as bytes
            
        Returns:
            Detected encoding (defaults to 'utf-8')
        """
        if HAS_CHARDET:
            try:
                result = chardet.detect(content)
                if result and result['encoding'] and result['confidence'] > 0.7:
                    return result['encoding']
            except Exception as e:
                logger.warning(f"Encoding detection failed: {e}")
        
        # Fallback: try common encodings
        encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
        for encoding in encodings:
            try:
                content.decode(encoding)
                return encoding
            except UnicodeDecodeError:
                continue
        
        logger.warning("Could not detect encoding, defaulting to utf-8")
        return 'utf-8'


class CompressionHandler:
    """Handles compressed file formats."""
    
    @staticmethod
    def decompress_gzip(content: bytes) -> bytes:
        """Decompress GZIP content."""
        try:
            return gzip.decompress(content)
        except Exception as e:
            raise ValueError(f"Failed to decompress GZIP content: {e}")
    
    @staticmethod
    def decompress_zip(content: bytes) -> Dict[str, bytes]:
        """
        Decompress ZIP content.
        
        Returns:
            Dictionary mapping file names to their content
        """
        try:
            files = {}
            with zipfile.ZipFile(io.BytesIO(content), 'r') as zip_ref:
                for file_info in zip_ref.infolist():
                    if not file_info.is_dir():
                        files[file_info.filename] = zip_ref.read(file_info.filename)
            return files
        except Exception as e:
            raise ValueError(f"Failed to decompress ZIP content: {e}")
    
    @staticmethod
    def decompress_tar(content: bytes, compression: Optional[str] = None) -> Dict[str, bytes]:
        """
        Decompress TAR content.
        
        Args:
            content: TAR file content
            compression: Optional compression type ('gz', 'bz2', 'xz')
            
        Returns:
            Dictionary mapping file names to their content
        """
        try:
            files = {}
            mode = 'r'
            if compression:
                mode = f'r:{compression}'
            
            with tarfile.open(fileobj=io.BytesIO(content), mode=mode) as tar_ref:
                for member in tar_ref.getmembers():
                    if member.isfile():
                        file_obj = tar_ref.extractfile(member)
                        if file_obj:
                            files[member.name] = file_obj.read()
            return files
        except Exception as e:
            raise ValueError(f"Failed to decompress TAR content: {e}")


class ExcelParser:
    """Handles Excel file parsing."""
    
    @staticmethod
    def parse_excel(content: bytes, sheet_name: Optional[str] = None) -> ParseResult:
        """
        Parse Excel file content.
        
        Args:
            content: Excel file content
            sheet_name: Optional specific sheet to parse
            
        Returns:
            ParseResult with parsed data
        """
        if not HAS_PANDAS:
            raise ImportError("pandas is required for Excel file support")
        
        try:
            # Read Excel file
            with io.BytesIO(content) as buffer:
                # Get sheet names
                excel_file = pd.ExcelFile(buffer)
                sheets = excel_file.sheet_names
                
                # Determine which sheet to read
                target_sheet = sheet_name if sheet_name else sheets[0]
                
                if target_sheet not in sheets:
                    raise ValueError(f"Sheet '{target_sheet}' not found. Available sheets: {sheets}")
                
                # Read the sheet
                df = pd.read_excel(buffer, sheet_name=target_sheet)
                
                # Convert to list of dictionaries
                data = df.to_dict('records')
                
                # Clean up NaN values
                for record in data:
                    for key, value in record.items():
                        if pd.isna(value):
                            record[key] = None
                
                file_info = FileInfo(
                    format=FileFormat.EXCEL_XLSX,
                    size_bytes=len(content),
                    sheets=sheets,
                    estimated_rows=len(df),
                    estimated_columns=len(df.columns)
                )
                
                return ParseResult(
                    data=data,
                    file_info=file_info,
                    warnings=[],
                    errors=[],
                    metadata={
                        'sheet_name': target_sheet,
                        'available_sheets': sheets,
                        'columns': list(df.columns)
                    }
                )
                
        except Exception as e:
            logger.error(f"Failed to parse Excel file: {e}")
            raise ValueError(f"Excel parsing failed: {e}")


class ParquetParser:
    """Handles Parquet file parsing."""
    
    @staticmethod
    def parse_parquet(content: bytes) -> ParseResult:
        """
        Parse Parquet file content.
        
        Args:
            content: Parquet file content
            
        Returns:
            ParseResult with parsed data
        """
        if not HAS_PYARROW:
            raise ImportError("pyarrow is required for Parquet file support")
        
        try:
            # Read Parquet file
            with io.BytesIO(content) as buffer:
                table = pq.read_table(buffer)
                
                # Convert to pandas DataFrame for easier handling
                if HAS_PANDAS:
                    df = table.to_pandas()
                    data = df.to_dict('records')
                    
                    # Clean up NaN values
                    for record in data:
                        for key, value in record.items():
                            if pd.isna(value):
                                record[key] = None
                else:
                    # Convert to Python objects
                    data = []
                    for i in range(len(table)):
                        record = {}
                        for j, column in enumerate(table.column_names):
                            value = table.column(j)[i].as_py()
                            record[column] = value
                        data.append(record)
                
                file_info = FileInfo(
                    format=FileFormat.PARQUET,
                    size_bytes=len(content),
                    estimated_rows=len(table),
                    estimated_columns=len(table.column_names)
                )
                
                return ParseResult(
                    data=data,
                    file_info=file_info,
                    warnings=[],
                    errors=[],
                    metadata={
                        'columns': table.column_names,
                        'schema': str(table.schema)
                    }
                )
                
        except Exception as e:
            logger.error(f"Failed to parse Parquet file: {e}")
            raise ValueError(f"Parquet parsing failed: {e}")


class AdvancedCSVParser:
    """Advanced CSV parser with encoding detection and error handling."""
    
    @staticmethod
    def parse_csv(content: bytes, encoding: Optional[str] = None) -> ParseResult:
        """
        Parse CSV content with advanced error handling.
        
        Args:
            content: CSV file content
            encoding: Optional encoding (auto-detected if not provided)
            
        Returns:
            ParseResult with parsed data
        """
        warnings = []
        errors = []
        
        # Detect encoding if not provided
        if not encoding:
            encoding = EncodingDetector.detect_encoding(content)
            warnings.append(f"Auto-detected encoding: {encoding}")
        
        try:
            # Decode content
            text_content = content.decode(encoding)
            
            # Detect CSV dialect
            sample = text_content[:10000]  # Use first 10KB for dialect detection
            sniffer = csv.Sniffer()
            
            try:
                dialect = sniffer.sniff(sample)
            except csv.Error:
                dialect = csv.excel  # Fallback to excel dialect
                warnings.append("Could not detect CSV dialect, using Excel format")
            
            # Parse CSV
            data = []
            reader = csv.DictReader(io.StringIO(text_content), dialect=dialect)
            
            for row_num, row in enumerate(reader, 1):
                # Clean up row data
                cleaned_row = {}
                for key, value in row.items():
                    if key is None:
                        key = f"column_{len(cleaned_row)}"
                    cleaned_row[key] = value.strip() if isinstance(value, str) else value
                data.append(cleaned_row)
                
                # Limit rows for memory safety (can be made configurable)
                if len(data) >= 100000:
                    warnings.append(f"Truncated at 100,000 rows (file has more data)")
                    break
            
            file_info = FileInfo(
                format=FileFormat.CSV,
                size_bytes=len(content),
                encoding=encoding,
                estimated_rows=len(data),
                estimated_columns=len(data[0]) if data else 0
            )
            
            metadata = {
                'delimiter': dialect.delimiter,
                'quote_char': dialect.quotechar,
                'columns': list(data[0].keys()) if data else []
            }
            
            return ParseResult(
                data=data,
                file_info=file_info,
                warnings=warnings,
                errors=errors,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Failed to parse CSV file: {e}")
            raise ValueError(f"CSV parsing failed: {e}")


class FileFormatProcessor:
    """Main processor for all file formats."""
    
    def __init__(self):
        self.compression_handler = CompressionHandler()
        self.excel_parser = ExcelParser()
        self.parquet_parser = ParquetParser()
        self.csv_parser = AdvancedCSVParser()
    
    def process_file(
        self,
        file_path: Union[str, Path],
        content: Optional[bytes] = None,
        format_hint: Optional[FileFormat] = None,
        **kwargs
    ) -> ParseResult:
        """
        Process a file and return parsed data.
        
        Args:
            file_path: Path to the file
            content: Optional file content (will read from path if not provided)
            format_hint: Optional format hint to skip detection
            **kwargs: Additional parsing options
            
        Returns:
            ParseResult with parsed data
        """
        # Read content if not provided
        if content is None:
            with open(file_path, 'rb') as f:
                content = f.read()
        
        # Detect format
        file_format = format_hint or FileFormatDetector.detect_format(file_path, content)
        
        logger.info(f"Processing file {file_path} as {file_format.value}")
        
        # Handle compressed files first
        if file_format in [FileFormat.ZIP, FileFormat.GZIP, FileFormat.TAR, FileFormat.TAR_GZ]:
            return self._process_compressed_file(content, file_format, **kwargs)
        
        # Handle specific formats
        if file_format == FileFormat.PARQUET:
            return self.parquet_parser.parse_parquet(content)
        elif file_format in [FileFormat.EXCEL_XLS, FileFormat.EXCEL_XLSX]:
            return self.excel_parser.parse_excel(content, **kwargs)
        elif file_format == FileFormat.CSV:
            return self.csv_parser.parse_csv(content, **kwargs)
        elif file_format in [FileFormat.JSON, FileFormat.JSONL]:
            return self._process_json_file(content, file_format)
        else:
            raise ValueError(f"Unsupported file format: {file_format}")
    
    def _process_compressed_file(
        self,
        content: bytes,
        compression_format: FileFormat,
        **kwargs
    ) -> ParseResult:
        """Process compressed files."""
        try:
            # Decompress based on format
            if compression_format == FileFormat.GZIP:
                decompressed = self.compression_handler.decompress_gzip(content)
                # Try to detect the format of decompressed content
                inner_format = FileFormatDetector._detect_from_content(decompressed)
                return self._process_inner_content(decompressed, inner_format, **kwargs)
            
            elif compression_format == FileFormat.ZIP:
                files = self.compression_handler.decompress_zip(content)
                # Process the first data file found
                for filename, file_content in files.items():
                    if not filename.startswith('__MACOSX/') and not filename.endswith('/'):
                        inner_format = FileFormatDetector.detect_format(filename, file_content)
                        result = self._process_inner_content(file_content, inner_format, **kwargs)
                        result.metadata['archive_filename'] = filename
                        result.metadata['archive_files'] = list(files.keys())
                        return result
                
                raise ValueError("No processable files found in ZIP archive")
            
            elif compression_format in [FileFormat.TAR, FileFormat.TAR_GZ]:
                compression = 'gz' if compression_format == FileFormat.TAR_GZ else None
                files = self.compression_handler.decompress_tar(content, compression)
                
                # Process the first data file found
                for filename, file_content in files.items():
                    if not filename.endswith('/'):
                        inner_format = FileFormatDetector.detect_format(filename, file_content)
                        result = self._process_inner_content(file_content, inner_format, **kwargs)
                        result.metadata['archive_filename'] = filename
                        result.metadata['archive_files'] = list(files.keys())
                        return result
                
                raise ValueError("No processable files found in TAR archive")
            
        except Exception as e:
            logger.error(f"Failed to process compressed file: {e}")
            raise ValueError(f"Compressed file processing failed: {e}")
    
    def _process_inner_content(
        self,
        content: bytes,
        file_format: FileFormat,
        **kwargs
    ) -> ParseResult:
        """Process content from within compressed files."""
        if file_format == FileFormat.CSV:
            return self.csv_parser.parse_csv(content, **kwargs)
        elif file_format in [FileFormat.JSON, FileFormat.JSONL]:
            return self._process_json_file(content, file_format)
        elif file_format == FileFormat.PARQUET:
            return self.parquet_parser.parse_parquet(content)
        elif file_format in [FileFormat.EXCEL_XLS, FileFormat.EXCEL_XLSX]:
            return self.excel_parser.parse_excel(content, **kwargs)
        else:
            raise ValueError(f"Unsupported inner file format: {file_format}")
    
    def _process_json_file(self, content: bytes, file_format: FileFormat) -> ParseResult:
        """Process JSON/JSONL files."""
        encoding = EncodingDetector.detect_encoding(content)
        text_content = content.decode(encoding)
        
        try:
            if file_format == FileFormat.JSON:
                # Single JSON object or array
                json_data = json.loads(text_content)
                if isinstance(json_data, list):
                    data = json_data
                else:
                    data = [json_data]
            else:  # JSONL
                # Multiple JSON objects, one per line
                data = []
                for line in text_content.strip().split('\n'):
                    if line.strip():
                        data.append(json.loads(line.strip()))
            
            file_info = FileInfo(
                format=file_format,
                size_bytes=len(content),
                encoding=encoding,
                estimated_rows=len(data),
                estimated_columns=len(data[0]) if data else 0
            )
            
            return ParseResult(
                data=data,
                file_info=file_info,
                warnings=[],
                errors=[],
                metadata={'encoding': encoding}
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON file: {e}")
            raise ValueError(f"JSON parsing failed: {e}")


# Public interface functions
def detect_file_format(file_path: Union[str, Path], content: Optional[bytes] = None) -> FileFormat:
    """
    Detect file format from path and/or content.
    
    Args:
        file_path: Path to the file
        content: Optional file content for content-based detection
        
    Returns:
        Detected file format
    """
    return FileFormatDetector.detect_format(file_path, content)


def parse_file(
    file_path: Union[str, Path],
    content: Optional[bytes] = None,
    format_hint: Optional[FileFormat] = None,
    **kwargs
) -> ParseResult:
    """
    Parse a file and return structured data.
    
    Args:
        file_path: Path to the file
        content: Optional file content (will read from path if not provided)
        format_hint: Optional format hint to skip detection
        **kwargs: Additional parsing options
        
    Returns:
        ParseResult with parsed data
    """
    processor = FileFormatProcessor()
    return processor.process_file(file_path, content, format_hint, **kwargs)


def get_supported_formats() -> List[str]:
    """
    Get list of supported file formats.
    
    Returns:
        List of supported format extensions
    """
    return [fmt.value for fmt in FileFormat if fmt != FileFormat.UNKNOWN]


def check_dependencies() -> Dict[str, bool]:
    """
    Check availability of optional dependencies.
    
    Returns:
        Dictionary showing which optional features are available
    """
    return {
        'pandas': HAS_PANDAS,
        'pyarrow': HAS_PYARROW,
        'chardet': HAS_CHARDET,
        'excel_support': HAS_PANDAS,
        'parquet_support': HAS_PYARROW,
        'encoding_detection': HAS_CHARDET
    }
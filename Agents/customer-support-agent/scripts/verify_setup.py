#!/usr/bin/env python3
"""
Verify that the development environment is properly set up.
"""

import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check Python version compatibility."""
    version = sys.version_info
    if version.major != 3 or version.minor < 9:
        print("❌ Python 3.9+ required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_package(package_name: str) -> bool:
    """Check if a package is importable."""
    try:
        __import__(package_name)
        print(f"✅ {package_name}")
        return True
    except ImportError:
        print(f"❌ {package_name}")
        return False

def check_environment():
    """Check environment variables."""
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    print("✅ .env file exists")
    return True

def main():
    """Run all verification checks."""
    print("🔍 Verifying Agent Development Environment\n")
    
    checks = [
        check_python_version(),
        check_package("sprintlens"),
        check_package("langgraph"), 
        check_package("langchain"),
        check_package("openai"),
        check_package("dotenv"),
        check_environment()
    ]
    
    if all(checks):
        print("\n🎉 Environment setup complete! Ready to build agents.")
        return 0
    else:
        print("\n❌ Setup incomplete. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
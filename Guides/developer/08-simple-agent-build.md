# Building Your First Simple Agent with Sprint Lens

## 🎯 Objective

Learn to build a simple, single-purpose AI agent from scratch using Sprint Lens SDK. This guide assumes you have **never used our system before** and covers every step in detail.

## 📋 Prerequisites

Before starting, ensure you have completed:
- ✅ [01-environment-setup.md](./01-environment-setup.md) - Development environment ready
- ✅ [02-sdk-installation.md](./02-sdk-installation.md) - Sprint Lens SDK installed
- ✅ [03-basic-integration.md](./03-basic-integration.md) - Basic SDK integration working

## 🏗️ What We'll Build

A **Weather Information Agent** that:
- Accepts user queries about weather
- Calls a weather API (we'll simulate this)
- Returns formatted weather information
- Has **complete observability** with Sprint Lens tracing
- Includes **automatic evaluation** of responses

## 🔧 Step 1: Project Setup

### 1.1 Create Project Directory

```bash
# Create a new directory for your agent
mkdir weather-agent
cd weather-agent

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate
```

### 1.2 Install Dependencies

```bash
# Install required packages
pip install sprintlens requests python-dotenv

# Create requirements.txt
echo "sprintlens>=1.0.0" > requirements.txt
echo "requests>=2.31.0" >> requirements.txt
echo "python-dotenv>=1.0.0" >> requirements.txt
```

### 1.3 Create Environment Configuration

Create `.env` file with your configuration:

```bash
# Create .env file
cat > .env << EOF
# Sprint Lens Configuration
SPRINTLENS_URL=http://localhost:3000
SPRINTLENS_USERNAME=admin
SPRINTLENS_PASSWORD=MasterAdmin2024!
SPRINTLENS_PROJECT_NAME=weather-agent

# LLM Configuration (choose one)
# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-azure-api-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Weather API (we'll use a free service)
WEATHER_API_KEY=your-weather-api-key  # Optional for this tutorial
EOF
```

> ⚠️ **Important**: Replace the placeholder values with your actual API keys and configuration.

## 🔧 Step 2: Basic Agent Implementation

### 2.1 Create Core Agent Class

Create `weather_agent.py`:

```python
"""
Simple Weather Agent with Sprint Lens Integration
This agent answers weather-related questions with complete observability.
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Load environment variables
load_dotenv()

class WeatherAgent:
    """A simple weather information agent with Sprint Lens observability."""
    
    def __init__(self):
        """Initialize the weather agent with Sprint Lens configuration."""
        
        # Configure Sprint Lens
        self.setup_sprintlens()
        
        # Agent configuration
        self.agent_name = "Weather Information Agent"
        self.version = "1.0.0"
        
        print(f"🌤️ {self.agent_name} v{self.version} initialized")
        print(f"📊 Sprint Lens tracking enabled for project: {os.getenv('SPRINTLENS_PROJECT_NAME')}")
    
    def setup_sprintlens(self):
        """Configure Sprint Lens SDK with environment variables."""
        
        # Configure Sprint Lens client
        sprintlens.configure(
            url=os.getenv('SPRINTLENS_URL', 'http://localhost:3000'),
            username=os.getenv('SPRINTLENS_USERNAME', 'admin'),
            password=os.getenv('SPRINTLENS_PASSWORD', 'MasterAdmin2024!'),
            project_name=os.getenv('SPRINTLENS_PROJECT_NAME', 'weather-agent')
        )
        
        print("✅ Sprint Lens configured successfully")
    
    @sprintlens.track(
        name="weather-query-processing",
        span_type="agent",
        capture_input=True,
        capture_output=True,
        tags={"agent": "weather", "version": "1.0.0"}
    )
    def process_weather_query(self, user_query: str, user_id: str = "anonymous") -> Dict[str, Any]:
        """
        Process a weather-related query from the user.
        
        Args:
            user_query (str): The user's weather question
            user_id (str): Identifier for the user making the request
            
        Returns:
            Dict[str, Any]: Structured response with weather information
        """
        
        # Log the incoming request
        print(f"🔍 Processing query: '{user_query}' for user: {user_id}")
        
        # Step 1: Analyze the query
        query_analysis = self._analyze_query(user_query)
        
        # Step 2: Get weather data
        weather_data = self._get_weather_data(query_analysis['location'])
        
        # Step 3: Generate response
        response = self._generate_response(user_query, query_analysis, weather_data)
        
        # Step 4: Log completion
        print(f"✅ Query processed successfully for location: {query_analysis['location']}")
        
        return response
    
    @sprintlens.track(
        name="query-analysis",
        span_type="processing",
        capture_input=True,
        capture_output=True
    )
    def _analyze_query(self, query: str) -> Dict[str, Any]:
        """
        Analyze the user's query to extract location and intent.
        
        Args:
            query (str): User's weather query
            
        Returns:
            Dict[str, Any]: Analysis results with location and intent
        """
        
        # Simple keyword-based analysis (in production, you'd use an LLM)
        query_lower = query.lower()
        
        # Extract location (simplified logic)
        location = "Unknown"
        if "new york" in query_lower or "nyc" in query_lower:
            location = "New York, NY"
        elif "london" in query_lower:
            location = "London, UK"
        elif "tokyo" in query_lower:
            location = "Tokyo, Japan"
        elif "paris" in query_lower:
            location = "Paris, France"
        elif "sydney" in query_lower:
            location = "Sydney, Australia"
        else:
            # Try to extract any city name (simplified)
            words = query.split()
            for word in words:
                if word.istitle() and len(word) > 3:
                    location = word
                    break
        
        # Extract intent
        intent = "current_weather"
        if "tomorrow" in query_lower or "forecast" in query_lower:
            intent = "weather_forecast"
        elif "rain" in query_lower:
            intent = "rain_check"
        elif "temperature" in query_lower or "temp" in query_lower:
            intent = "temperature_check"
        
        analysis = {
            "location": location,
            "intent": intent,
            "query_length": len(query),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        print(f"🧠 Query analysis: Location='{location}', Intent='{intent}'")
        
        return analysis
    
    @sprintlens.track(
        name="weather-data-retrieval",
        span_type="external_api",
        capture_input=True,
        capture_output=True,
        tags={"api": "weather", "service": "simulated"}
    )
    def _get_weather_data(self, location: str) -> Dict[str, Any]:
        """
        Retrieve weather data for the specified location.
        Note: This is simulated data for the tutorial. In production, you'd call a real weather API.
        
        Args:
            location (str): Location to get weather for
            
        Returns:
            Dict[str, Any]: Weather data for the location
        """
        
        import random
        import time
        
        # Simulate API call delay
        time.sleep(0.1)
        
        # Simulate weather data (in production, call real weather API)
        weather_conditions = ["Sunny", "Cloudy", "Partly Cloudy", "Rainy", "Snowy"]
        
        weather_data = {
            "location": location,
            "temperature": random.randint(-10, 35),  # Celsius
            "condition": random.choice(weather_conditions),
            "humidity": random.randint(30, 90),
            "wind_speed": random.randint(0, 25),
            "feels_like": random.randint(-10, 35),
            "timestamp": datetime.now().isoformat(),
            "source": "simulated_api"
        }
        
        print(f"🌡️ Weather data retrieved: {weather_data['temperature']}°C, {weather_data['condition']}")
        
        return weather_data
    
    @sprintlens.track(
        name="response-generation",
        span_type="processing",
        capture_input=True,
        capture_output=True
    )
    def _generate_response(self, original_query: str, analysis: Dict[str, Any], weather_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a user-friendly response based on the weather data.
        
        Args:
            original_query (str): Original user query
            analysis (Dict[str, Any]): Query analysis results
            weather_data (Dict[str, Any]): Weather data from API
            
        Returns:
            Dict[str, Any]: Formatted response for the user
        """
        
        # Generate human-friendly response based on intent
        if analysis['intent'] == 'temperature_check':
            main_response = f"The current temperature in {weather_data['location']} is {weather_data['temperature']}°C (feels like {weather_data['feels_like']}°C)."
        elif analysis['intent'] == 'rain_check':
            rain_status = "it is raining" if weather_data['condition'] == "Rainy" else "it is not raining"
            main_response = f"In {weather_data['location']}, {rain_status}. Current condition: {weather_data['condition']}."
        else:
            # Default current weather response
            main_response = f"The weather in {weather_data['location']} is currently {weather_data['condition']} with a temperature of {weather_data['temperature']}°C."
        
        # Add additional details
        additional_info = f"Humidity: {weather_data['humidity']}%, Wind: {weather_data['wind_speed']} km/h"
        
        response = {
            "success": True,
            "response": main_response,
            "additional_info": additional_info,
            "location": weather_data['location'],
            "intent": analysis['intent'],
            "confidence": 0.85,  # Simulated confidence score
            "timestamp": datetime.now().isoformat(),
            "agent_version": self.version,
            "raw_weather_data": weather_data
        }
        
        print(f"💬 Response generated: '{main_response}'")
        
        return response


# Example usage and testing
if __name__ == "__main__":
    """Example usage of the WeatherAgent."""
    
    # Create the agent
    agent = WeatherAgent()
    
    # Test queries
    test_queries = [
        "What's the weather like in New York?",
        "Is it raining in London?",
        "What's the temperature in Tokyo?",
        "How's the weather in Paris today?"
    ]
    
    print("\n🧪 Testing Weather Agent with Sprint Lens Tracing:")
    print("=" * 60)
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n🔎 Test {i}/4: {query}")
        print("-" * 40)
        
        try:
            # Process the query
            result = agent.process_weather_query(query, user_id=f"test-user-{i}")
            
            # Display results
            print(f"✅ Success: {result['response']}")
            print(f"📍 Location: {result['location']}")
            print(f"🎯 Intent: {result['intent']}")
            print(f"📊 Confidence: {result['confidence']}")
            
        except Exception as e:
            print(f"❌ Error processing query: {e}")
    
    print("\n🎉 All tests completed!")
    print("📊 Check your Sprint Lens dashboard to see the traces:")
    print(f"   👉 {os.getenv('SPRINTLENS_URL', 'http://localhost:3000')}")
```

### 2.2 Test Your Simple Agent

Run your agent to test it:

```bash
# Run the weather agent
python weather_agent.py
```

You should see output like:

```
🌤️ Weather Information Agent v1.0.0 initialized
📊 Sprint Lens tracking enabled for project: weather-agent
✅ Sprint Lens configured successfully

🧪 Testing Weather Agent with Sprint Lens Tracing:
============================================================

🔎 Test 1/4: What's the weather like in New York?
----------------------------------------
🔍 Processing query: 'What's the weather like in New York?' for user: test-user-1
🧠 Query analysis: Location='New York, NY', Intent='current_weather'
🌡️ Weather data retrieved: 22°C, Sunny
💬 Response generated: 'The weather in New York, NY is currently Sunny with a temperature of 22°C.'
✅ Success: The weather in New York, NY is currently Sunny with a temperature of 22°C.
📍 Location: New York, NY
🎯 Intent: current_weather
📊 Confidence: 0.85
```

## 🔧 Step 3: Verify Sprint Lens Integration

### 3.1 Check Your Dashboard

1. **Open Sprint Lens Dashboard**:
   ```bash
   # Open your dashboard
   open http://localhost:3000
   # Or manually navigate to your Sprint Lens URL
   ```

2. **Navigate to Your Project**:
   - Go to **Projects** in the sidebar
   - Find and click on **"weather-agent"** project
   - Click on the **"Traces"** tab

3. **Verify Traces**:
   You should see traces for each query with the following structure:
   ```
   📊 weather-query-processing (parent span)
   ├── 🧠 query-analysis 
   ├── 🌐 weather-data-retrieval
   └── 💬 response-generation
   ```

### 3.2 Explore Trace Details

Click on any trace to see:
- **Input/Output**: Complete function arguments and return values
- **Timing**: Execution time for each step
- **Tags**: Metadata like agent version, intent, location
- **Hierarchy**: Parent-child relationships between operations

## 🔧 Step 4: Add Error Handling and Monitoring

### 4.1 Enhanced Error Handling

Create `weather_agent_enhanced.py`:

```python
"""
Enhanced Weather Agent with comprehensive error handling and monitoring.
"""

import os
import json
import asyncio
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Load environment variables
load_dotenv()

class EnhancedWeatherAgent:
    """Weather agent with comprehensive error handling and monitoring."""
    
    def __init__(self):
        """Initialize the enhanced weather agent."""
        self.setup_sprintlens()
        self.agent_name = "Enhanced Weather Agent"
        self.version = "1.1.0"
        
        # Performance tracking
        self.request_count = 0
        self.error_count = 0
        self.total_processing_time = 0
        
        print(f"🌤️ {self.agent_name} v{self.version} initialized")
    
    def setup_sprintlens(self):
        """Configure Sprint Lens SDK with error handling."""
        try:
            sprintlens.configure(
                url=os.getenv('SPRINTLENS_URL', 'http://localhost:3000'),
                username=os.getenv('SPRINTLENS_USERNAME', 'admin'),
                password=os.getenv('SPRINTLENS_PASSWORD', 'MasterAdmin2024!'),
                project_name=os.getenv('SPRINTLENS_PROJECT_NAME', 'weather-agent-enhanced')
            )
            print("✅ Sprint Lens configured successfully")
        except Exception as e:
            print(f"❌ Failed to configure Sprint Lens: {e}")
            print("⚠️ Continuing without Sprint Lens tracking")
    
    @sprintlens.track(
        name="weather-query-with-monitoring",
        span_type="agent",
        capture_input=True,
        capture_output=True,
        tags={"agent": "weather-enhanced", "version": "1.1.0"}
    )
    def process_weather_query(self, user_query: str, user_id: str = "anonymous") -> Dict[str, Any]:
        """
        Process weather query with comprehensive error handling and monitoring.
        
        Args:
            user_query (str): User's weather question
            user_id (str): User identifier
            
        Returns:
            Dict[str, Any]: Response with success/error information
        """
        
        start_time = datetime.now()
        self.request_count += 1
        
        try:
            # Input validation
            if not user_query or not user_query.strip():
                raise ValueError("Query cannot be empty")
            
            if len(user_query) > 500:
                raise ValueError("Query too long (max 500 characters)")
            
            print(f"🔍 Processing query #{self.request_count}: '{user_query[:50]}...' for user: {user_id}")
            
            # Process the query with error tracking
            query_analysis = self._analyze_query_with_validation(user_query)
            weather_data = self._get_weather_data_with_retry(query_analysis['location'])
            response = self._generate_response_with_fallback(user_query, query_analysis, weather_data)
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            self.total_processing_time += processing_time
            
            # Add monitoring metadata
            response.update({
                "processing_time_seconds": processing_time,
                "request_id": f"req_{self.request_count}_{int(start_time.timestamp())}",
                "agent_stats": {
                    "total_requests": self.request_count,
                    "error_count": self.error_count,
                    "average_processing_time": self.total_processing_time / self.request_count
                }
            })
            
            print(f"✅ Query #{self.request_count} processed successfully in {processing_time:.2f}s")
            return response
            
        except Exception as e:
            self.error_count += 1
            error_response = self._handle_error(e, user_query, user_id, start_time)
            print(f"❌ Query #{self.request_count} failed: {str(e)}")
            return error_response
    
    @sprintlens.track(
        name="query-analysis-validated",
        span_type="processing",
        capture_input=True,
        capture_output=True
    )
    def _analyze_query_with_validation(self, query: str) -> Dict[str, Any]:
        """Analyze query with validation and confidence scoring."""
        
        query_lower = query.lower().strip()
        
        # Enhanced location detection
        location_confidence = 0.0
        location = "Unknown"
        
        # Known cities with confidence scores
        known_locations = {
            "new york": ("New York, NY", 0.95),
            "nyc": ("New York, NY", 0.90),
            "london": ("London, UK", 0.95),
            "tokyo": ("Tokyo, Japan", 0.95),
            "paris": ("Paris, France", 0.95),
            "sydney": ("Sydney, Australia", 0.95),
            "los angeles": ("Los Angeles, CA", 0.95),
            "chicago": ("Chicago, IL", 0.95),
            "miami": ("Miami, FL", 0.95),
            "seattle": ("Seattle, WA", 0.95)
        }
        
        for key, (full_name, confidence) in known_locations.items():
            if key in query_lower:
                location = full_name
                location_confidence = confidence
                break
        
        # If no known location found, try to extract capitalized words
        if location == "Unknown":
            words = query.split()
            for word in words:
                if word.istitle() and len(word) > 3:
                    location = word
                    location_confidence = 0.6  # Lower confidence for unknown locations
                    break
        
        # Enhanced intent detection
        intent_confidence = 0.0
        intent = "current_weather"
        
        intent_patterns = {
            "temperature_check": (["temperature", "temp", "degrees", "hot", "cold"], 0.85),
            "rain_check": (["rain", "raining", "wet", "precipitation"], 0.85),
            "weather_forecast": (["tomorrow", "forecast", "later", "next", "will"], 0.80),
            "condition_check": (["sunny", "cloudy", "clear", "overcast"], 0.75)
        }
        
        for intent_type, (keywords, confidence) in intent_patterns.items():
            if any(keyword in query_lower for keyword in keywords):
                intent = intent_type
                intent_confidence = confidence
                break
        
        # Validate analysis quality
        if location_confidence < 0.5:
            raise ValueError(f"Cannot determine location from query: '{query}'")
        
        analysis = {
            "location": location,
            "location_confidence": location_confidence,
            "intent": intent,
            "intent_confidence": intent_confidence,
            "query_length": len(query),
            "word_count": len(query.split()),
            "analysis_timestamp": datetime.now().isoformat(),
            "validation_passed": True
        }
        
        print(f"🧠 Analysis: Location='{location}' ({location_confidence:.0%}), Intent='{intent}' ({intent_confidence:.0%})")
        
        return analysis
    
    @sprintlens.track(
        name="weather-data-with-retry",
        span_type="external_api",
        capture_input=True,
        capture_output=True,
        tags={"api": "weather", "retry_enabled": "true"}
    )
    def _get_weather_data_with_retry(self, location: str, max_retries: int = 3) -> Dict[str, Any]:
        """Get weather data with retry logic and error handling."""
        
        import random
        import time
        
        for attempt in range(max_retries):
            try:
                # Simulate potential API failures
                if random.random() < 0.1:  # 10% chance of simulated failure
                    raise Exception(f"Simulated API error (attempt {attempt + 1})")
                
                # Simulate API call delay
                time.sleep(0.1)
                
                # Enhanced weather data
                weather_conditions = [
                    "Sunny", "Partly Cloudy", "Cloudy", "Overcast", 
                    "Light Rain", "Heavy Rain", "Thunderstorm", 
                    "Snow", "Fog", "Windy"
                ]
                
                temperature = random.randint(-10, 35)
                condition = random.choice(weather_conditions)
                
                weather_data = {
                    "location": location,
                    "temperature": temperature,
                    "condition": condition,
                    "humidity": random.randint(30, 90),
                    "wind_speed": random.randint(0, 25),
                    "feels_like": temperature + random.randint(-3, 3),
                    "pressure": random.randint(980, 1030),
                    "visibility": random.randint(5, 25),
                    "uv_index": random.randint(0, 11),
                    "timestamp": datetime.now().isoformat(),
                    "source": "enhanced_simulated_api",
                    "api_attempt": attempt + 1,
                    "data_quality": "high" if attempt == 0 else "retry_success"
                }
                
                print(f"🌡️ Weather data retrieved (attempt {attempt + 1}): {temperature}°C, {condition}")
                return weather_data
                
            except Exception as e:
                print(f"⚠️ Weather API attempt {attempt + 1} failed: {e}")
                
                if attempt == max_retries - 1:
                    # Final attempt failed, return fallback data
                    print("🔄 Using fallback weather data")
                    return {
                        "location": location,
                        "temperature": 20,  # Default temperature
                        "condition": "Data Unavailable",
                        "humidity": 50,
                        "wind_speed": 10,
                        "feels_like": 20,
                        "timestamp": datetime.now().isoformat(),
                        "source": "fallback_data",
                        "api_attempt": max_retries,
                        "data_quality": "fallback",
                        "error_message": str(e)
                    }
                
                # Wait before retry
                time.sleep(0.5 * (attempt + 1))
    
    @sprintlens.track(
        name="response-generation-enhanced",
        span_type="processing",
        capture_input=True,
        capture_output=True
    )
    def _generate_response_with_fallback(self, original_query: str, analysis: Dict[str, Any], weather_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response with fallback handling for poor data quality."""
        
        # Check data quality
        data_quality = weather_data.get('data_quality', 'unknown')
        
        if data_quality == 'fallback':
            main_response = f"I'm sorry, I couldn't get current weather data for {weather_data['location']} due to a service issue. Please try again later."
            confidence = 0.3
        else:
            # Generate response based on intent and data quality
            if analysis['intent'] == 'temperature_check':
                main_response = f"The current temperature in {weather_data['location']} is {weather_data['temperature']}°C (feels like {weather_data['feels_like']}°C)."
            elif analysis['intent'] == 'rain_check':
                rain_status = "it is raining" if "Rain" in weather_data['condition'] else "it is not raining"
                main_response = f"In {weather_data['location']}, {rain_status}. Current condition: {weather_data['condition']}."
            else:
                main_response = f"The weather in {weather_data['location']} is currently {weather_data['condition']} with a temperature of {weather_data['temperature']}°C."
            
            # Adjust confidence based on data quality and analysis confidence
            base_confidence = min(analysis['location_confidence'], analysis['intent_confidence'])
            if data_quality == 'high':
                confidence = base_confidence
            else:
                confidence = base_confidence * 0.8
        
        # Enhanced additional information
        additional_info_parts = []
        if data_quality != 'fallback':
            additional_info_parts.extend([
                f"Humidity: {weather_data['humidity']}%",
                f"Wind: {weather_data['wind_speed']} km/h",
                f"Pressure: {weather_data.get('pressure', 'N/A')} hPa"
            ])
        
        if weather_data.get('uv_index') is not None:
            uv_level = "Low" if weather_data['uv_index'] < 3 else "Moderate" if weather_data['uv_index'] < 6 else "High"
            additional_info_parts.append(f"UV Index: {weather_data['uv_index']} ({uv_level})")
        
        response = {
            "success": data_quality != 'fallback',
            "response": main_response,
            "additional_info": " | ".join(additional_info_parts) if additional_info_parts else "Limited data available",
            "location": weather_data['location'],
            "intent": analysis['intent'],
            "confidence": round(confidence, 2),
            "data_quality": data_quality,
            "timestamp": datetime.now().isoformat(),
            "agent_version": self.version,
            "analysis_details": {
                "location_confidence": analysis['location_confidence'],
                "intent_confidence": analysis['intent_confidence'],
                "query_complexity": len(original_query.split())
            }
        }
        
        if data_quality == 'fallback':
            response["warning"] = "Response based on fallback data due to API issues"
        
        print(f"💬 Response generated (confidence: {confidence:.0%}, quality: {data_quality})")
        
        return response
    
    @sprintlens.track(
        name="error-handling",
        span_type="error",
        capture_input=True,
        capture_output=True
    )
    def _handle_error(self, error: Exception, query: str, user_id: str, start_time: datetime) -> Dict[str, Any]:
        """Handle errors with comprehensive logging and user-friendly responses."""
        
        processing_time = (datetime.now() - start_time).total_seconds()
        error_type = type(error).__name__
        error_message = str(error)
        
        # Generate user-friendly error messages
        user_friendly_messages = {
            "ValueError": "I couldn't understand your request. Please try asking about the weather in a specific city.",
            "ConnectionError": "I'm having trouble connecting to the weather service. Please try again in a moment.",
            "TimeoutError": "The weather service is taking too long to respond. Please try again.",
            "KeyError": "I encountered an issue processing the weather data. Please try again.",
        }
        
        user_message = user_friendly_messages.get(error_type, "I encountered an unexpected issue. Please try again or contact support.")
        
        error_response = {
            "success": False,
            "error": True,
            "error_type": error_type,
            "error_message": error_message,
            "user_message": user_message,
            "query": query,
            "user_id": user_id,
            "processing_time_seconds": processing_time,
            "timestamp": datetime.now().isoformat(),
            "agent_version": self.version,
            "request_id": f"req_{self.request_count}_{int(start_time.timestamp())}",
            "stack_trace": traceback.format_exc() if os.getenv('DEBUG') == 'true' else None
        }
        
        print(f"🚨 Error handled: {error_type} - {user_message}")
        
        return error_response
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """Get comprehensive agent performance statistics."""
        
        avg_processing_time = self.total_processing_time / self.request_count if self.request_count > 0 else 0
        error_rate = self.error_count / self.request_count if self.request_count > 0 else 0
        
        return {
            "agent_name": self.agent_name,
            "version": self.version,
            "total_requests": self.request_count,
            "successful_requests": self.request_count - self.error_count,
            "error_count": self.error_count,
            "error_rate_percentage": round(error_rate * 100, 2),
            "average_processing_time_seconds": round(avg_processing_time, 3),
            "total_processing_time_seconds": round(self.total_processing_time, 3),
            "uptime": datetime.now().isoformat()
        }


# Example usage with comprehensive testing
if __name__ == "__main__":
    """Comprehensive testing of the enhanced weather agent."""
    
    # Create the enhanced agent
    agent = EnhancedWeatherAgent()
    
    # Comprehensive test cases
    test_cases = [
        # Valid queries
        ("What's the weather like in New York?", "test-user-1"),
        ("Is it raining in London?", "test-user-2"),
        ("What's the temperature in Tokyo?", "test-user-3"),
        ("How's the weather in Paris today?", "test-user-4"),
        
        # Edge cases
        ("Weather in XYZ unknown city", "test-user-5"),
        ("", "test-user-6"),  # Empty query
        ("a" * 600, "test-user-7"),  # Too long query
        
        # Different intents
        ("Will it rain tomorrow in Seattle?", "test-user-8"),
        ("How hot is it in Miami?", "test-user-9"),
        ("Is it sunny in Sydney?", "test-user-10")
    ]
    
    print("\n🧪 Comprehensive Testing of Enhanced Weather Agent:")
    print("=" * 70)
    
    for i, (query, user_id) in enumerate(test_cases, 1):
        print(f"\n🔎 Test {i}/{len(test_cases)}: {query[:50]}{'...' if len(query) > 50 else ''}")
        print("-" * 50)
        
        try:
            result = agent.process_weather_query(query, user_id)
            
            if result['success']:
                print(f"✅ Success: {result['response']}")
                print(f"📍 Location: {result['location']}")
                print(f"🎯 Intent: {result['intent']}")
                print(f"📊 Confidence: {result['confidence']}")
                print(f"⏱️ Processing Time: {result['processing_time_seconds']:.3f}s")
                if 'data_quality' in result:
                    print(f"🔍 Data Quality: {result['data_quality']}")
            else:
                print(f"❌ Error: {result['user_message']}")
                print(f"🔧 Error Type: {result['error_type']}")
        
        except Exception as e:
            print(f"💥 Unexpected error: {e}")
    
    # Display agent statistics
    print("\n📊 Agent Performance Statistics:")
    print("=" * 50)
    stats = agent.get_agent_stats()
    for key, value in stats.items():
        print(f"{key.replace('_', ' ').title()}: {value}")
    
    print("\n🎉 All tests completed!")
    print("📊 Check your Sprint Lens dashboard to see detailed traces:")
    print(f"   👉 {os.getenv('SPRINTLENS_URL', 'http://localhost:3000')}")
```

### 4.2 Test Enhanced Agent

```bash
# Run the enhanced agent
python weather_agent_enhanced.py
```

## 🔧 Step 5: Add Custom Evaluation

### 5.1 Create Evaluation Module

Create `weather_agent_evaluation.py`:

```python
"""
Weather Agent with Custom Evaluation Metrics
Demonstrates how to add evaluation and quality scoring to your agent.
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv

# Sprint Lens imports
import sprintlens
from sprintlens.evaluation import BaseMetric, ScoreResult

# Import our enhanced agent
from weather_agent_enhanced import EnhancedWeatherAgent

# Load environment variables
load_dotenv()

class WeatherResponseQualityMetric(BaseMetric):
    """Custom metric to evaluate weather response quality."""
    
    def __init__(self):
        super().__init__(name="weather_response_quality")
    
    def score(self, input: str, output: str, **kwargs) -> ScoreResult:
        """
        Evaluate the quality of a weather response.
        
        Args:
            input (str): User's original query
            output (str): Agent's response (JSON string)
            **kwargs: Additional context
            
        Returns:
            ScoreResult: Score between 0.0 and 1.0 with reasoning
        """
        
        try:
            # Parse the output if it's JSON
            if isinstance(output, str):
                try:
                    response_data = json.loads(output)
                except json.JSONDecodeError:
                    response_data = {"response": output}
            else:
                response_data = output
            
            score = 0.0
            reasons = []
            
            # Check if response was successful
            if response_data.get('success', True):
                score += 0.3
                reasons.append("Response was successful")
            else:
                reasons.append("Response failed")
                return ScoreResult(
                    value=0.1,
                    reason="Response failed: " + response_data.get('error_message', 'Unknown error'),
                    details={"evaluation_criteria": "success_check"}
                )
            
            # Check response relevance
            response_text = response_data.get('response', '').lower()
            input_lower = input.lower()
            
            # Weather-related keywords should be present
            weather_keywords = ['weather', 'temperature', 'rain', 'sunny', 'cloudy', 'wind', 'humidity']
            if any(keyword in response_text for keyword in weather_keywords):
                score += 0.2
                reasons.append("Response contains weather-related information")
            
            # Check if location is mentioned
            location = response_data.get('location', '')
            if location and location != 'Unknown' and location.lower() in response_text:
                score += 0.2
                reasons.append(f"Response mentions the requested location: {location}")
            
            # Check confidence level
            confidence = response_data.get('confidence', 0)
            if confidence >= 0.8:
                score += 0.2
                reasons.append(f"High confidence response: {confidence}")
            elif confidence >= 0.6:
                score += 0.1
                reasons.append(f"Moderate confidence response: {confidence}")
            
            # Check data quality
            data_quality = response_data.get('data_quality', 'unknown')
            if data_quality == 'high':
                score += 0.1
                reasons.append("High quality data source")
            elif data_quality == 'fallback':
                score -= 0.1
                reasons.append("Fallback data used (lower quality)")
            
            # Ensure score is between 0 and 1
            score = max(0.0, min(1.0, score))
            
            return ScoreResult(
                value=score,
                reason="; ".join(reasons),
                details={
                    "evaluation_criteria": "weather_response_quality",
                    "confidence": confidence,
                    "data_quality": data_quality,
                    "location_identified": location != 'Unknown',
                    "response_length": len(response_text)
                }
            )
            
        except Exception as e:
            return ScoreResult(
                value=0.0,
                reason=f"Evaluation error: {str(e)}",
                details={"evaluation_error": str(e)}
            )

class WeatherLocationAccuracyMetric(BaseMetric):
    """Metric to evaluate location detection accuracy."""
    
    def __init__(self):
        super().__init__(name="location_accuracy")
    
    def score(self, input: str, output: str, **kwargs) -> ScoreResult:
        """Evaluate how accurately the agent detected the location."""
        
        try:
            # Parse output
            if isinstance(output, str):
                try:
                    response_data = json.loads(output)
                except json.JSONDecodeError:
                    return ScoreResult(value=0.0, reason="Could not parse response")
            else:
                response_data = output
            
            detected_location = response_data.get('location', 'Unknown')
            input_lower = input.lower()
            
            # Known location mappings
            location_mappings = {
                'new york': ['new york', 'nyc', 'manhattan'],
                'london': ['london', 'england', 'uk'],
                'tokyo': ['tokyo', 'japan'],
                'paris': ['paris', 'france'],
                'sydney': ['sydney', 'australia'],
                'los angeles': ['los angeles', 'la', 'california'],
                'chicago': ['chicago', 'illinois'],
                'miami': ['miami', 'florida'],
                'seattle': ['seattle', 'washington']
            }
            
            score = 0.0
            reason = "No location detected"
            
            if detected_location == 'Unknown':
                # Check if query actually contains a location
                has_location = any(
                    any(variant in input_lower for variant in variants)
                    for variants in location_mappings.values()
                )
                
                if has_location:
                    score = 0.0
                    reason = "Failed to detect location that was mentioned in query"
                else:
                    score = 0.5  # Neutral - no location to detect
                    reason = "No clear location mentioned in query"
            else:
                # Check if detected location matches input
                detected_lower = detected_location.lower()
                
                for canonical_location, variants in location_mappings.items():
                    if any(variant in detected_lower for variant in [canonical_location] + variants):
                        if any(variant in input_lower for variant in variants):
                            score = 1.0
                            reason = f"Correctly identified location: {detected_location}"
                            break
                        
                if score == 0.0:
                    # Check for partial matches
                    if any(word in input_lower for word in detected_location.lower().split()):
                        score = 0.7
                        reason = f"Partially correct location: {detected_location}"
                    else:
                        score = 0.2
                        reason = f"Incorrect location detected: {detected_location}"
            
            return ScoreResult(
                value=score,
                reason=reason,
                details={
                    "detected_location": detected_location,
                    "input_query": input,
                    "location_confidence": response_data.get('analysis_details', {}).get('location_confidence', 0)
                }
            )
            
        except Exception as e:
            return ScoreResult(
                value=0.0,
                reason=f"Evaluation error: {str(e)}",
                details={"evaluation_error": str(e)}
            )

class WeatherAgentWithEvaluation(EnhancedWeatherAgent):
    """Weather agent that includes automatic evaluation of responses."""
    
    def __init__(self):
        super().__init__()
        
        # Initialize evaluation metrics
        self.quality_metric = WeatherResponseQualityMetric()
        self.location_metric = WeatherLocationAccuracyMetric()
        
        # Evaluation tracking
        self.evaluation_results = []
        
        print("🔍 Evaluation metrics initialized")
    
    @sprintlens.track(
        name="weather-query-with-evaluation",
        span_type="agent",
        capture_input=True,
        capture_output=True,
        tags={"agent": "weather-evaluated", "version": "1.2.0", "evaluation": "enabled"}
    )
    def process_weather_query_with_evaluation(self, user_query: str, user_id: str = "anonymous") -> Dict[str, Any]:
        """Process weather query and automatically evaluate the response."""
        
        # Get the base response
        response = self.process_weather_query(user_query, user_id)
        
        # Evaluate the response
        evaluation_results = self._evaluate_response(user_query, response)
        
        # Add evaluation results to response
        response['evaluation'] = evaluation_results
        
        # Track evaluation results
        self.evaluation_results.append({
            "query": user_query,
            "user_id": user_id,
            "response": response,
            "evaluation": evaluation_results,
            "timestamp": datetime.now().isoformat()
        })
        
        return response
    
    @sprintlens.track(
        name="response-evaluation",
        span_type="evaluation",
        capture_input=True,
        capture_output=True
    )
    def _evaluate_response(self, query: str, response: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate the agent's response using custom metrics."""
        
        # Convert response to JSON string for evaluation
        response_json = json.dumps(response)
        
        # Evaluate with quality metric
        quality_score = self.quality_metric.score(query, response_json)
        
        # Evaluate with location accuracy metric
        location_score = self.location_metric.score(query, response_json)
        
        # Calculate overall score
        overall_score = (quality_score.value + location_score.value) / 2
        
        evaluation_results = {
            "overall_score": round(overall_score, 3),
            "quality_score": {
                "value": quality_score.value,
                "reason": quality_score.reason,
                "details": quality_score.details
            },
            "location_score": {
                "value": location_score.value,
                "reason": location_score.reason,
                "details": location_score.details
            },
            "evaluation_timestamp": datetime.now().isoformat(),
            "evaluator_version": "1.0.0"
        }
        
        print(f"📊 Evaluation: Overall={overall_score:.2f}, Quality={quality_score.value:.2f}, Location={location_score.value:.2f}")
        
        return evaluation_results
    
    def get_evaluation_summary(self) -> Dict[str, Any]:
        """Get summary of all evaluations performed."""
        
        if not self.evaluation_results:
            return {"message": "No evaluations performed yet"}
        
        # Calculate statistics
        total_evaluations = len(self.evaluation_results)
        overall_scores = [result['evaluation']['overall_score'] for result in self.evaluation_results]
        quality_scores = [result['evaluation']['quality_score']['value'] for result in self.evaluation_results]
        location_scores = [result['evaluation']['location_score']['value'] for result in self.evaluation_results]
        
        summary = {
            "total_evaluations": total_evaluations,
            "average_overall_score": round(sum(overall_scores) / total_evaluations, 3),
            "average_quality_score": round(sum(quality_scores) / total_evaluations, 3),
            "average_location_score": round(sum(location_scores) / total_evaluations, 3),
            "best_overall_score": max(overall_scores),
            "worst_overall_score": min(overall_scores),
            "high_quality_responses": len([s for s in overall_scores if s >= 0.8]),
            "low_quality_responses": len([s for s in overall_scores if s < 0.5]),
            "evaluation_period": {
                "start": self.evaluation_results[0]['timestamp'],
                "end": self.evaluation_results[-1]['timestamp']
            }
        }
        
        return summary


# Example usage with evaluation
if __name__ == "__main__":
    """Test the weather agent with automatic evaluation."""
    
    # Create the agent with evaluation
    agent = WeatherAgentWithEvaluation()
    
    # Test cases for evaluation
    evaluation_test_cases = [
        # Good cases
        ("What's the weather like in New York?", "eval-user-1"),
        ("Is it raining in London?", "eval-user-2"),
        ("What's the temperature in Tokyo?", "eval-user-3"),
        
        # Challenging cases
        ("Weather in XYZ?", "eval-user-4"),  # Unknown location
        ("Tell me about NYC weather", "eval-user-5"),  # Abbreviation
        ("How's Paris today?", "eval-user-6"),  # Implicit weather query
        
        # Error cases
        ("", "eval-user-7"),  # Empty query
        ("Random non-weather question", "eval-user-8"),  # Non-weather query
    ]
    
    print("\n🧪 Testing Weather Agent with Automatic Evaluation:")
    print("=" * 70)
    
    for i, (query, user_id) in enumerate(evaluation_test_cases, 1):
        print(f"\n🔎 Evaluation Test {i}/{len(evaluation_test_cases)}: {query}")
        print("-" * 60)
        
        try:
            result = agent.process_weather_query_with_evaluation(query, user_id)
            
            # Display main response
            if result['success']:
                print(f"✅ Response: {result['response']}")
                print(f"📍 Location: {result['location']}")
                print(f"🎯 Intent: {result['intent']}")
                print(f"📊 Agent Confidence: {result['confidence']}")
            else:
                print(f"❌ Error: {result['user_message']}")
            
            # Display evaluation results
            evaluation = result['evaluation']
            print(f"\n📈 Evaluation Results:")
            print(f"   Overall Score: {evaluation['overall_score']:.3f}")
            print(f"   Quality Score: {evaluation['quality_score']['value']:.3f} - {evaluation['quality_score']['reason']}")
            print(f"   Location Score: {evaluation['location_score']['value']:.3f} - {evaluation['location_score']['reason']}")
            
        except Exception as e:
            print(f"💥 Unexpected error: {e}")
    
    # Display evaluation summary
    print("\n📊 Evaluation Summary:")
    print("=" * 50)
    summary = agent.get_evaluation_summary()
    for key, value in summary.items():
        if isinstance(value, dict):
            print(f"{key.replace('_', ' ').title()}:")
            for subkey, subvalue in value.items():
                print(f"  {subkey.replace('_', ' ').title()}: {subvalue}")
        else:
            print(f"{key.replace('_', ' ').title()}: {value}")
    
    print("\n🎉 Evaluation testing completed!")
    print("📊 Check your Sprint Lens dashboard for detailed traces and evaluations:")
    print(f"   👉 {os.getenv('SPRINTLENS_URL', 'http://localhost:3000')}")
```

### 5.2 Test with Evaluation

```bash
# Run the agent with evaluation
python weather_agent_evaluation.py
```

## 🎉 Summary

You've successfully built a comprehensive **Simple Agent** with:

### ✅ What You Accomplished

1. **✅ Basic Agent Implementation**
   - Created a functional weather information agent
   - Implemented proper error handling and monitoring
   - Added comprehensive logging and debugging

2. **✅ Sprint Lens Integration**
   - Complete observability with automatic tracing
   - Hierarchical span structure for complex operations
   - Input/output capture for all functions
   - Custom tags and metadata

3. **✅ Custom Evaluation**
   - Built custom evaluation metrics
   - Automatic response quality assessment
   - Location detection accuracy measurement
   - Performance statistics tracking

4. **✅ Production-Ready Features**
   - Comprehensive error handling
   - Retry logic for external API calls
   - Fallback data mechanisms
   - Performance monitoring and statistics

### 🎯 Next Steps

Now that you have a solid foundation with a simple agent, you can:

1. **Build Autonomous Agents** → [09-autonomous-agent-build.md](./09-autonomous-agent-build.md)
2. **Create GenAI LLM Prompts** → [10-genai-llm-prompts.md](./10-genai-llm-prompts.md)
3. **Explore Advanced Features** → [11-advanced-features.md](./11-advanced-features.md)

### 📊 Verify Your Implementation

Check your Sprint Lens dashboard to see:
- 🔍 **Traces**: Complete request flows with timing
- 📊 **Metrics**: Performance and evaluation scores
- 🎯 **Project**: All data organized under "weather-agent"
- 📈 **Analytics**: Success rates, error patterns, performance trends

**Dashboard URL**: [http://localhost:3000](http://localhost:3000)

---

**Congratulations!** 🎉 You've built your first production-ready AI agent with complete observability and evaluation using Sprint Lens SDK.
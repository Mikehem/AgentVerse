# Part 5: LLM Provider Configuration Guide

Configure any LLM provider (Azure OpenAI, OpenAI, Anthropic, xAI, Google, Mistral) for your Agent Lens deployment using environment variables.

## 🎯 What You'll Learn

- Configure multiple LLM providers using environment variables
- Switch between providers without code changes
- Set up provider-specific authentication and endpoints
- Implement provider fallbacks and load balancing
- Test and validate provider configurations
- Monitor provider costs and performance

## 📋 Prerequisites

- Completed [Part 1: Environment Setup](./01-environment-setup.md)
- Access to at least one LLM provider API
- Agent Lens backend running
- Basic understanding of environment configuration

## 🏗️ Provider Architecture

```mermaid
graph TB
    Env[".env Configuration"] --> Config[Provider Config]
    Config --> Manager[Provider Manager]
    Manager --> Azure[Azure OpenAI]
    Manager --> OpenAI[OpenAI]
    Manager --> Anthropic[Anthropic Claude]
    Manager --> XAI[xAI Grok]
    Manager --> Google[Google Gemini]
    Manager --> Mistral[Mistral AI]
    
    Manager --> Router[Smart Router]
    Router --> Fallback[Fallback Logic]
    Router --> LoadBalance[Load Balancing]
    Router --> CostOpt[Cost Optimization]
    
    subgraph "Agent Lens Integration"
        Manager --> Tracing[Request Tracing]
        Manager --> Metrics[Cost Metrics]
        Manager --> Health[Health Monitoring]
    end
```

## 🛠️ Provider Configuration

### Configuration Overview

Agent Lens supports multiple providers with automatic failover and load balancing:

```env
# Primary Provider Selection
LLM_PRIMARY_PROVIDER=azure_openai
LLM_FALLBACK_PROVIDERS=openai,anthropic,google

# Enable/Disable Features
LLM_ENABLE_FALLBACK=true
LLM_ENABLE_LOAD_BALANCING=false
LLM_ENABLE_COST_OPTIMIZATION=true
LLM_ENABLE_HEALTH_CHECKS=true

# Global Settings
LLM_DEFAULT_MODEL=gpt-4o
LLM_DEFAULT_TEMPERATURE=0.7
LLM_DEFAULT_MAX_TOKENS=2000
LLM_REQUEST_TIMEOUT=30000
LLM_MAX_RETRIES=3
LLM_RETRY_DELAY=1000
```

### Azure OpenAI Configuration

**For your current Azure OpenAI setup:**

```env
# Azure OpenAI Provider
AZURE_OPENAI_ENABLED=true
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_MODEL_NAME=gpt-4o

# Optional: Multiple deployments
AZURE_OPENAI_DEPLOYMENTS=gpt-4o:msgen4o,gpt-35-turbo:msgpt35turbo,gpt-4:msgpt4

# Rate Limiting
AZURE_OPENAI_RPM=60
AZURE_OPENAI_TPM=40000
AZURE_OPENAI_RPD=1000

# Cost Settings
AZURE_OPENAI_INPUT_COST_PER_1K=0.03
AZURE_OPENAI_OUTPUT_COST_PER_1K=0.06
```

### OpenAI Configuration

```env
# OpenAI Provider
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional: for proxies
OPENAI_ORGANIZATION=org-your_org_id  # Optional

# Model Configuration
OPENAI_DEFAULT_MODEL=gpt-4o
OPENAI_AVAILABLE_MODELS=gpt-4o,gpt-4o-mini,gpt-4-turbo,gpt-3.5-turbo

# Rate Limiting
OPENAI_RPM=60
OPENAI_TPM=40000
OPENAI_RPD=1000

# Cost Settings (per 1K tokens)
OPENAI_GPT4O_INPUT_COST=0.0025
OPENAI_GPT4O_OUTPUT_COST=0.01
OPENAI_GPT4O_MINI_INPUT_COST=0.00015
OPENAI_GPT4O_MINI_OUTPUT_COST=0.0006
```

### Anthropic Claude Configuration

```env
# Anthropic Provider
ANTHROPIC_ENABLED=true
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com  # Optional

# Model Configuration
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_AVAILABLE_MODELS=claude-3-5-sonnet-20241022,claude-3-opus-20240229,claude-3-sonnet-20240229,claude-3-haiku-20240307

# Rate Limiting
ANTHROPIC_RPM=50
ANTHROPIC_TPM=40000
ANTHROPIC_RPD=1000

# Cost Settings (per 1K tokens)
ANTHROPIC_CLAUDE35_SONNET_INPUT_COST=0.003
ANTHROPIC_CLAUDE35_SONNET_OUTPUT_COST=0.015
ANTHROPIC_CLAUDE3_OPUS_INPUT_COST=0.015
ANTHROPIC_CLAUDE3_OPUS_OUTPUT_COST=0.075
```

### xAI Grok Configuration

```env
# xAI Provider
XAI_ENABLED=true
XAI_API_KEY=xai-your_xai_api_key
XAI_BASE_URL=https://api.x.ai/v1

# Model Configuration
XAI_DEFAULT_MODEL=grok-beta
XAI_AVAILABLE_MODELS=grok-beta,grok-vision-beta

# Rate Limiting
XAI_RPM=30
XAI_TPM=20000
XAI_RPD=500

# Cost Settings (per 1K tokens)
XAI_GROK_BETA_INPUT_COST=0.005
XAI_GROK_BETA_OUTPUT_COST=0.015
```

### Google Gemini Configuration

```env
# Google Provider
GOOGLE_ENABLED=true
GOOGLE_API_KEY=AIza_your_google_api_key
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com  # Optional

# Model Configuration
GOOGLE_DEFAULT_MODEL=gemini-1.5-pro
GOOGLE_AVAILABLE_MODELS=gemini-1.5-pro,gemini-1.5-flash,gemini-pro

# Rate Limiting
GOOGLE_RPM=60
GOOGLE_TPM=30000
GOOGLE_RPD=1500

# Cost Settings (per 1K tokens)
GOOGLE_GEMINI15_PRO_INPUT_COST=0.00125
GOOGLE_GEMINI15_PRO_OUTPUT_COST=0.005
GOOGLE_GEMINI15_FLASH_INPUT_COST=0.000075
GOOGLE_GEMINI15_FLASH_OUTPUT_COST=0.0003
```

### Mistral AI Configuration

```env
# Mistral Provider
MISTRAL_ENABLED=true
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_BASE_URL=https://api.mistral.ai  # Optional

# Model Configuration
MISTRAL_DEFAULT_MODEL=mistral-large-latest
MISTRAL_AVAILABLE_MODELS=mistral-large-latest,mistral-medium-latest,mistral-small-latest,open-mistral-7b

# Rate Limiting
MISTRAL_RPM=50
MISTRAL_TPM=30000
MISTRAL_RPD=1000

# Cost Settings (per 1K tokens)
MISTRAL_LARGE_INPUT_COST=0.008
MISTRAL_LARGE_OUTPUT_COST=0.024
MISTRAL_MEDIUM_INPUT_COST=0.0027
MISTRAL_MEDIUM_OUTPUT_COST=0.0081
```

## ⚙️ Advanced Configuration

### Provider Priorities and Fallback

```env
# Provider Selection Strategy
LLM_SELECTION_STRATEGY=cost_optimized  # Options: cost_optimized, performance, balanced, round_robin

# Provider Priorities (1=highest, 10=lowest)
AZURE_OPENAI_PRIORITY=1
OPENAI_PRIORITY=2
GOOGLE_PRIORITY=3
ANTHROPIC_PRIORITY=4
XAI_PRIORITY=5
MISTRAL_PRIORITY=6

# Fallback Configuration
LLM_FALLBACK_ON_ERROR=true
LLM_FALLBACK_ON_RATE_LIMIT=true
LLM_FALLBACK_ON_TIMEOUT=true
LLM_FALLBACK_MAX_ATTEMPTS=3

# Health Check Settings
LLM_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
LLM_HEALTH_CHECK_TIMEOUT=10000    # 10 seconds
LLM_HEALTH_CHECK_RETRIES=2
```

### Model-Specific Routing

```env
# Route specific models to specific providers
LLM_MODEL_ROUTING_ENABLED=true

# GPT-4 models -> Azure OpenAI (cheaper for you)
LLM_ROUTE_GPT4=azure_openai
LLM_ROUTE_GPT4_TURBO=azure_openai
LLM_ROUTE_GPT35_TURBO=azure_openai

# Claude models -> Anthropic
LLM_ROUTE_CLAUDE=anthropic

# Gemini models -> Google
LLM_ROUTE_GEMINI=google

# Grok models -> xAI
LLM_ROUTE_GROK=xai

# Mistral models -> Mistral
LLM_ROUTE_MISTRAL=mistral

# Default fallback
LLM_ROUTE_DEFAULT=azure_openai
```

### Cost Optimization

```env
# Cost Optimization Settings
LLM_COST_OPTIMIZATION_ENABLED=true
LLM_DAILY_BUDGET_USD=100.00
LLM_MONTHLY_BUDGET_USD=2000.00

# Auto-switch to cheaper models when budget threshold reached
LLM_BUDGET_THRESHOLD_SWITCH=0.8  # Switch at 80% of budget
LLM_CHEAP_MODEL_AZURE=gpt-35-turbo
LLM_CHEAP_MODEL_OPENAI=gpt-3.5-turbo
LLM_CHEAP_MODEL_GOOGLE=gemini-1.5-flash

# Cost alerts
LLM_COST_ALERT_THRESHOLD=0.5  # Alert at 50% of budget
LLM_COST_ALERT_EMAIL=admin@yourcompany.com
```

## 🧪 Provider Configuration Script

Create a configuration script to easily switch providers:

### Create `scripts/configure_providers.py`

```python
#!/usr/bin/env python3
"""
LLM Provider Configuration Script for Agent Lens
Easily configure and switch between different LLM providers.
"""

import os
import sys
from typing import Dict, List, Optional
from pathlib import Path
from dotenv import load_dotenv, set_key

class ProviderConfigurator:
    """Manage LLM provider configurations."""
    
    def __init__(self, env_file: str = ".env"):
        self.env_file = Path(env_file)
        load_dotenv(self.env_file)
        
        self.providers = {
            "azure_openai": "Azure OpenAI",
            "openai": "OpenAI",
            "anthropic": "Anthropic Claude", 
            "xai": "xAI Grok",
            "google": "Google Gemini",
            "mistral": "Mistral AI"
        }
    
    def configure_azure_openai(self):
        """Configure Azure OpenAI provider."""
        print("🔧 Configuring Azure OpenAI...")
        
        endpoint = input("Azure OpenAI Endpoint: ")
        api_key = input("Azure OpenAI API Key: ")
        deployment = input("Deployment Name (e.g., msgen4o): ")
        model = input("Model Name (e.g., gpt-4o): ")
        
        configs = {
            "AZURE_OPENAI_ENABLED": "true",
            "AZURE_OPENAI_ENDPOINT": endpoint,
            "AZURE_OPENAI_API_KEY": api_key,
            "AZURE_OPENAI_DEPLOYMENT_NAME": deployment,
            "AZURE_OPENAI_MODEL_NAME": model,
            "AZURE_OPENAI_API_VERSION": "2024-02-01"
        }
        
        self._save_configs(configs)
        print("✅ Azure OpenAI configured!")
    
    def configure_openai(self):
        """Configure OpenAI provider."""
        print("🔧 Configuring OpenAI...")
        
        api_key = input("OpenAI API Key: ")
        model = input("Default Model (gpt-4o): ") or "gpt-4o"
        
        configs = {
            "OPENAI_ENABLED": "true",
            "OPENAI_API_KEY": api_key,
            "OPENAI_DEFAULT_MODEL": model
        }
        
        self._save_configs(configs)
        print("✅ OpenAI configured!")
    
    def configure_anthropic(self):
        """Configure Anthropic provider."""
        print("🔧 Configuring Anthropic...")
        
        api_key = input("Anthropic API Key: ")
        model = input("Default Model (claude-3-5-sonnet-20241022): ") or "claude-3-5-sonnet-20241022"
        
        configs = {
            "ANTHROPIC_ENABLED": "true",
            "ANTHROPIC_API_KEY": api_key,
            "ANTHROPIC_DEFAULT_MODEL": model
        }
        
        self._save_configs(configs)
        print("✅ Anthropic configured!")
    
    def configure_xai(self):
        """Configure xAI provider."""
        print("🔧 Configuring xAI...")
        
        api_key = input("xAI API Key: ")
        model = input("Default Model (grok-beta): ") or "grok-beta"
        
        configs = {
            "XAI_ENABLED": "true",
            "XAI_API_KEY": api_key,
            "XAI_DEFAULT_MODEL": model
        }
        
        self._save_configs(configs)
        print("✅ xAI configured!")
    
    def configure_google(self):
        """Configure Google provider."""
        print("🔧 Configuring Google...")
        
        api_key = input("Google API Key: ")
        model = input("Default Model (gemini-1.5-pro): ") or "gemini-1.5-pro"
        
        configs = {
            "GOOGLE_ENABLED": "true",
            "GOOGLE_API_KEY": api_key,
            "GOOGLE_DEFAULT_MODEL": model
        }
        
        self._save_configs(configs)
        print("✅ Google configured!")
    
    def configure_mistral(self):
        """Configure Mistral provider."""
        print("🔧 Configuring Mistral...")
        
        api_key = input("Mistral API Key: ")
        model = input("Default Model (mistral-large-latest): ") or "mistral-large-latest"
        
        configs = {
            "MISTRAL_ENABLED": "true",
            "MISTRAL_API_KEY": api_key,
            "MISTRAL_DEFAULT_MODEL": model
        }
        
        self._save_configs(configs)
        print("✅ Mistral configured!")
    
    def set_primary_provider(self, provider: str):
        """Set the primary provider."""
        if provider not in self.providers:
            print(f"❌ Unknown provider: {provider}")
            return
        
        self._save_configs({"LLM_PRIMARY_PROVIDER": provider})
        print(f"✅ Primary provider set to: {self.providers[provider]}")
    
    def configure_fallbacks(self, providers: List[str]):
        """Configure fallback providers."""
        valid_providers = [p for p in providers if p in self.providers]
        if not valid_providers:
            print("❌ No valid providers specified")
            return
        
        fallback_str = ",".join(valid_providers)
        self._save_configs({
            "LLM_FALLBACK_PROVIDERS": fallback_str,
            "LLM_ENABLE_FALLBACK": "true"
        })
        print(f"✅ Fallback providers configured: {fallback_str}")
    
    def _save_configs(self, configs: Dict[str, str]):
        """Save configurations to .env file."""
        for key, value in configs.items():
            set_key(self.env_file, key, value)
    
    def list_configurations(self):
        """List current provider configurations."""
        print("\n📋 Current Provider Configurations:")
        print("=" * 50)
        
        # Check each provider
        for provider_key, provider_name in self.providers.items():
            enabled_key = f"{provider_key.upper()}_ENABLED"
            is_enabled = os.getenv(enabled_key, "false").lower() == "true"
            status = "✅ Enabled" if is_enabled else "❌ Disabled"
            print(f"{provider_name}: {status}")
        
        print(f"\nPrimary Provider: {os.getenv('LLM_PRIMARY_PROVIDER', 'Not set')}")
        print(f"Fallback Providers: {os.getenv('LLM_FALLBACK_PROVIDERS', 'Not set')}")
        print(f"Fallback Enabled: {os.getenv('LLM_ENABLE_FALLBACK', 'false')}")
    
    def test_provider_connection(self, provider: str):
        """Test connection to a provider."""
        print(f"🧪 Testing {provider} connection...")
        
        # This would integrate with Agent Lens API to test connection
        # For now, just check if credentials are configured
        provider_upper = provider.upper()
        
        if provider == "azure_openai":
            required = ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY"]
        elif provider == "openai":
            required = ["OPENAI_API_KEY"]
        elif provider == "anthropic":
            required = ["ANTHROPIC_API_KEY"]
        elif provider == "xai":
            required = ["XAI_API_KEY"]
        elif provider == "google":
            required = ["GOOGLE_API_KEY"]
        elif provider == "mistral":
            required = ["MISTRAL_API_KEY"]
        else:
            print(f"❌ Unknown provider: {provider}")
            return False
        
        missing = [key for key in required if not os.getenv(key)]
        if missing:
            print(f"❌ Missing configuration: {', '.join(missing)}")
            return False
        
        print(f"✅ {provider} configuration looks good!")
        return True
    
    def interactive_setup(self):
        """Interactive setup wizard."""
        print("🚀 Agent Lens LLM Provider Configuration Wizard")
        print("=" * 55)
        
        while True:
            print("\nSelect an option:")
            print("1. Configure Azure OpenAI")
            print("2. Configure OpenAI")
            print("3. Configure Anthropic")
            print("4. Configure xAI")
            print("5. Configure Google")
            print("6. Configure Mistral")
            print("7. Set Primary Provider")
            print("8. Configure Fallback Providers")
            print("9. List Current Configuration")
            print("10. Test Provider Connection")
            print("0. Exit")
            
            choice = input("\nEnter your choice (0-10): ").strip()
            
            if choice == "0":
                break
            elif choice == "1":
                self.configure_azure_openai()
            elif choice == "2":
                self.configure_openai()
            elif choice == "3":
                self.configure_anthropic()
            elif choice == "4":
                self.configure_xai()
            elif choice == "5":
                self.configure_google()
            elif choice == "6":
                self.configure_mistral()
            elif choice == "7":
                print("\nAvailable providers:")
                for key, name in self.providers.items():
                    print(f"  {key}: {name}")
                provider = input("Enter provider key: ").strip()
                self.set_primary_provider(provider)
            elif choice == "8":
                print("\nEnter provider keys separated by commas:")
                providers_input = input("Providers: ").strip()
                providers = [p.strip() for p in providers_input.split(",")]
                self.configure_fallbacks(providers)
            elif choice == "9":
                self.list_configurations()
            elif choice == "10":
                provider = input("Enter provider to test: ").strip()
                self.test_provider_connection(provider)
            else:
                print("❌ Invalid choice")
        
        print("\n✅ Configuration complete!")

def main():
    """Main configuration script."""
    configurator = ProviderConfigurator()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "list":
            configurator.list_configurations()
        elif command == "test" and len(sys.argv) > 2:
            provider = sys.argv[2]
            configurator.test_provider_connection(provider)
        elif command == "primary" and len(sys.argv) > 2:
            provider = sys.argv[2]
            configurator.set_primary_provider(provider)
        else:
            print("Usage:")
            print("  python configure_providers.py              # Interactive setup")
            print("  python configure_providers.py list         # List configurations")
            print("  python configure_providers.py test <provider>  # Test provider")
            print("  python configure_providers.py primary <provider>  # Set primary")
    else:
        configurator.interactive_setup()

if __name__ == "__main__":
    main()
```

### Usage Examples

```bash
# Interactive setup
python scripts/configure_providers.py

# Quick commands
python scripts/configure_providers.py list
python scripts/configure_providers.py primary azure_openai
python scripts/configure_providers.py test openai
```

## 🧪 Testing Provider Configuration

### Create `scripts/test_providers.py`

```python
#!/usr/bin/env python3
"""
Test all configured LLM providers with Agent Lens integration.
"""

import asyncio
import os
import time
from typing import Dict, Any, List
from dotenv import load_dotenv
import requests

load_dotenv()

class ProviderTester:
    """Test LLM provider configurations."""
    
    def __init__(self):
        self.agent_lens_url = os.getenv("SPRINTLENS_URL", "http://localhost:3001")
        self.results = {}
    
    async def test_all_providers(self) -> Dict[str, Any]:
        """Test all enabled providers."""
        print("🧪 Testing All LLM Providers with Agent Lens")
        print("=" * 50)
        
        providers = self._get_enabled_providers()
        
        for provider in providers:
            print(f"\n🔍 Testing {provider}...")
            result = await self._test_provider(provider)
            self.results[provider] = result
            
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"   {status} - {result.get('message', 'Unknown')}")
        
        return self.results
    
    def _get_enabled_providers(self) -> List[str]:
        """Get list of enabled providers."""
        providers = []
        
        provider_map = {
            "AZURE_OPENAI_ENABLED": "azure_openai",
            "OPENAI_ENABLED": "openai", 
            "ANTHROPIC_ENABLED": "anthropic",
            "XAI_ENABLED": "xai",
            "GOOGLE_ENABLED": "google",
            "MISTRAL_ENABLED": "mistral"
        }
        
        for env_key, provider_name in provider_map.items():
            if os.getenv(env_key, "false").lower() == "true":
                providers.append(provider_name)
        
        return providers
    
    async def _test_provider(self, provider: str) -> Dict[str, Any]:
        """Test a specific provider."""
        try:
            # Test provider configuration via Agent Lens API
            test_data = {
                "provider": provider,
                "prompt": "Say 'Hello from Agent Lens!' in a friendly way.",
                "max_tokens": 50
            }
            
            start_time = time.time()
            
            # Make request to Agent Lens test endpoint
            response = requests.post(
                f"{self.agent_lens_url}/api/v1/llm-providers/test-config",
                json=self._get_provider_config(provider),
                timeout=30
            )
            
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return {
                        "success": True,
                        "message": f"Connection successful ({elapsed:.2f}s)",
                        "response": data.get("response", ""),
                        "latency": elapsed
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Provider test failed: {data.get('error', 'Unknown error')}",
                        "latency": elapsed
                    }
            else:
                return {
                    "success": False,
                    "message": f"HTTP {response.status_code}: {response.text}",
                    "latency": elapsed
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Test failed: {str(e)}",
                "latency": time.time() - start_time if 'start_time' in locals() else 0
            }
    
    def _get_provider_config(self, provider: str) -> Dict[str, Any]:
        """Get provider configuration for testing."""
        if provider == "azure_openai":
            return {
                "type": "azure_openai",
                "config": {
                    "endpoint": os.getenv("AZURE_OPENAI_ENDPOINT"),
                    "deployment_name": os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
                    "api_version": os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
                },
                "credentials": {
                    "api_key": os.getenv("AZURE_OPENAI_API_KEY")
                }
            }
        elif provider == "openai":
            return {
                "type": "openai",
                "config": {},
                "credentials": {
                    "api_key": os.getenv("OPENAI_API_KEY")
                }
            }
        elif provider == "anthropic":
            return {
                "type": "anthropic",
                "config": {},
                "credentials": {
                    "api_key": os.getenv("ANTHROPIC_API_KEY")
                }
            }
        elif provider == "xai":
            return {
                "type": "xai",
                "config": {
                    "base_url": os.getenv("XAI_BASE_URL", "https://api.x.ai/v1")
                },
                "credentials": {
                    "api_key": os.getenv("XAI_API_KEY")
                }
            }
        elif provider == "google":
            return {
                "type": "google",
                "config": {},
                "credentials": {
                    "api_key": os.getenv("GOOGLE_API_KEY")
                }
            }
        elif provider == "mistral":
            return {
                "type": "mistral",
                "config": {},
                "credentials": {
                    "api_key": os.getenv("MISTRAL_API_KEY")
                }
            }
        else:
            return {}
    
    def print_summary(self):
        """Print test summary."""
        print("\n📊 Test Summary")
        print("=" * 30)
        
        total = len(self.results)
        passed = sum(1 for r in self.results.values() if r["success"])
        failed = total - passed
        
        print(f"Total Providers: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed > 0:
            print("\n❌ Failed Providers:")
            for provider, result in self.results.items():
                if not result["success"]:
                    print(f"  {provider}: {result['message']}")
        
        print("\n⚡ Performance:")
        for provider, result in self.results.items():
            if result["success"]:
                latency = result.get("latency", 0)
                print(f"  {provider}: {latency:.2f}s")

async def main():
    """Run provider tests."""
    tester = ProviderTester()
    
    print("🚀 Agent Lens Provider Test Suite")
    print("Ensure your Agent Lens backend is running...")
    
    await tester.test_all_providers()
    tester.print_summary()
    
    print(f"\n🔗 View results in Agent Lens: {tester.agent_lens_url}")

if __name__ == "__main__":
    asyncio.run(main())
```

## 📊 Example Complete Configuration

### Sample `.env` with Multiple Providers

```env
# ===== AGENT LENS CONFIGURATION =====
SPRINTLENS_URL=http://localhost:3001
SPRINTLENS_USERNAME=developer
SPRINTLENS_PASSWORD=dev123
SPRINTLENS_PROJECT_ID=proj_customer_support_001

# ===== LLM PROVIDER SETTINGS =====
LLM_PRIMARY_PROVIDER=azure_openai
LLM_FALLBACK_PROVIDERS=openai,google,anthropic
LLM_ENABLE_FALLBACK=true
LLM_ENABLE_COST_OPTIMIZATION=true
LLM_SELECTION_STRATEGY=cost_optimized

# ===== AZURE OPENAI (PRIMARY) =====
AZURE_OPENAI_ENABLED=true
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT_NAME=msgen4o
AZURE_OPENAI_MODEL_NAME=gpt-4o
AZURE_OPENAI_PRIORITY=1

# ===== OPENAI (FALLBACK) =====
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-your_openai_api_key
OPENAI_DEFAULT_MODEL=gpt-4o
OPENAI_PRIORITY=2

# ===== GOOGLE GEMINI (FALLBACK) =====
GOOGLE_ENABLED=true
GOOGLE_API_KEY=AIza_your_google_api_key
GOOGLE_DEFAULT_MODEL=gemini-1.5-pro
GOOGLE_PRIORITY=3

# ===== ANTHROPIC (FALLBACK) =====
ANTHROPIC_ENABLED=true
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_PRIORITY=4

# ===== COST OPTIMIZATION =====
LLM_DAILY_BUDGET_USD=50.00
LLM_MONTHLY_BUDGET_USD=1000.00
LLM_BUDGET_THRESHOLD_SWITCH=0.8
LLM_COST_ALERT_THRESHOLD=0.5
```

## 🎯 Quick Switch Commands

### Create Provider Switch Scripts

Create `scripts/switch-provider.sh`:

```bash
#!/bin/bash
# Quick provider switching script

case $1 in
  "azure")
    echo "🔄 Switching to Azure OpenAI..."
    export LLM_PRIMARY_PROVIDER=azure_openai
    ;;
  "openai")
    echo "🔄 Switching to OpenAI..."
    export LLM_PRIMARY_PROVIDER=openai
    ;;
  "claude")
    echo "🔄 Switching to Anthropic Claude..."
    export LLM_PRIMARY_PROVIDER=anthropic
    ;;
  "gemini")
    echo "🔄 Switching to Google Gemini..."
    export LLM_PRIMARY_PROVIDER=google
    ;;
  "grok")
    echo "🔄 Switching to xAI Grok..."
    export LLM_PRIMARY_PROVIDER=xai
    ;;
  "mistral")
    echo "🔄 Switching to Mistral..."
    export LLM_PRIMARY_PROVIDER=mistral
    ;;
  *)
    echo "Usage: ./switch-provider.sh [azure|openai|claude|gemini|grok|mistral]"
    exit 1
    ;;
esac

echo "✅ Primary provider switched to: $LLM_PRIMARY_PROVIDER"
```

Usage:
```bash
chmod +x scripts/switch-provider.sh
./scripts/switch-provider.sh azure    # Switch to Azure OpenAI
./scripts/switch-provider.sh claude   # Switch to Claude
```

## 🎯 Next Steps

Your provider configuration is now complete! In the next tutorial, we'll:

1. Implement the configured providers in your agent
2. Add provider monitoring and cost tracking
3. Set up automatic failover testing

Continue to [06-implementing-agent.md](./06-implementing-agent.md) →

## 📚 Reference

### Environment Variables Quick Reference

| Category | Variable | Description | Example |
|----------|----------|-------------|---------|
| **Global** | `LLM_PRIMARY_PROVIDER` | Primary provider | `azure_openai` |
| **Global** | `LLM_FALLBACK_PROVIDERS` | Fallback list | `openai,google` |
| **Azure** | `AZURE_OPENAI_ENDPOINT` | Azure endpoint | `https://....azure.com/` |
| **Azure** | `AZURE_OPENAI_API_KEY` | Azure API key | `your_key` |
| **OpenAI** | `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| **Anthropic** | `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-...` |
| **Google** | `GOOGLE_API_KEY` | Gemini API key | `AIza...` |
| **xAI** | `XAI_API_KEY` | Grok API key | `xai-...` |
| **Mistral** | `MISTRAL_API_KEY` | Mistral API key | `your_key` |

### Common Issues and Solutions

1. **Provider Not Found**: Check `*_ENABLED=true` is set
2. **Authentication Failed**: Verify API keys are correct
3. **Rate Limiting**: Configure appropriate `*_RPM` values
4. **High Costs**: Enable cost optimization settings
5. **Slow Responses**: Adjust timeout values

---

**Next:** [06-implementing-agent.md](./06-implementing-agent.md) - Building your agent with provider support →
# Building Autonomous Multi-Agent Systems with Sprint Lens

## 🎯 Objective

Learn to build sophisticated **autonomous multi-agent systems** that can work together to solve complex tasks. This guide covers Agent-to-Agent (A2A) communication, distributed coordination, and advanced observability patterns.

## 📋 Prerequisites

Before starting, ensure you have completed:
- ✅ [08-simple-agent-build.md](./08-simple-agent-build.md) - Simple agent implementation
- ✅ [03-basic-integration.md](./03-basic-integration.md) - Basic SDK integration
- ✅ [04-langgraph-basics.md](./04-langgraph-basics.md) - LangGraph fundamentals

## 🏗️ What We'll Build

A **Customer Support Autonomous System** featuring:
- **🎯 Coordinator Agent**: Routes requests and orchestrates workflow
- **🧠 Knowledge Agent**: Retrieves and processes information
- **💬 Response Agent**: Generates customer-facing responses
- **📊 Analytics Agent**: Monitors and evaluates performance
- **🔄 A2A Communication**: Seamless inter-agent messaging
- **📈 Distributed Tracing**: Complete system observability
- **🤖 Autonomous Operation**: Self-directed decision making

## 🔧 Step 1: Project Setup

### 1.1 Create Autonomous Agent Project

```bash
# Create project directory
mkdir autonomous-customer-support
cd autonomous-customer-support

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install sprintlens langchain langgraph openai aiohttp asyncio-tasks
```

### 1.2 Project Structure

Create the following directory structure:

```bash
# Create project structure
mkdir -p agents/{coordinator,knowledge,response,analytics}
mkdir -p shared/{models,communication,config}
mkdir -p tests
mkdir -p data

# Create main files
touch main.py
touch shared/__init__.py
touch shared/communication/__init__.py
touch shared/models/__init__.py
touch shared/config/__init__.py
```

### 1.3 Environment Configuration

Create `.env`:

```bash
cat > .env << EOF
# Sprint Lens Configuration
SPRINTLENS_URL=http://localhost:3000
SPRINTLENS_USERNAME=admin
SPRINTLENS_PASSWORD=MasterAdmin2024!
SPRINTLENS_PROJECT_NAME=autonomous-customer-support

# LLM Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Azure OpenAI (alternative)
AZURE_OPENAI_API_KEY=your-azure-api-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# System Configuration
SYSTEM_DEBUG=true
AGENT_TIMEOUT=30
MAX_CONCURRENT_REQUESTS=10
COMMUNICATION_PROTOCOL=async
EOF
```

## 🔧 Step 2: Shared Infrastructure

### 2.1 Communication Framework

Create `shared/communication/message_bus.py`:

```python
"""
Inter-Agent Communication Framework
Handles message passing, routing, and coordination between autonomous agents.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of messages that can be sent between agents."""
    REQUEST = "request"
    RESPONSE = "response"
    NOTIFICATION = "notification"
    COORDINATION = "coordination"
    ERROR = "error"
    HEARTBEAT = "heartbeat"

class AgentRole(Enum):
    """Roles that agents can play in the system."""
    COORDINATOR = "coordinator"
    KNOWLEDGE = "knowledge"
    RESPONSE = "response"
    ANALYTICS = "analytics"

@dataclass
class Message:
    """Standard message format for inter-agent communication."""
    
    id: str
    from_agent: str
    to_agent: str
    message_type: MessageType
    payload: Dict[str, Any]
    timestamp: str
    correlation_id: str
    reply_to: Optional[str] = None
    priority: int = 5  # 1=highest, 10=lowest
    expires_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary for serialization."""
        data = asdict(self)
        data['message_type'] = self.message_type.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        """Create message from dictionary."""
        data['message_type'] = MessageType(data['message_type'])
        return cls(**data)
    
    def is_expired(self) -> bool:
        """Check if message has expired."""
        if not self.expires_at:
            return False
        return datetime.now().isoformat() > self.expires_at

class MessageBus:
    """
    Central message bus for routing messages between autonomous agents.
    Provides reliable delivery, message queuing, and distributed tracing.
    """
    
    def __init__(self):
        self.agents: Dict[str, 'BaseAutonomousAgent'] = {}
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.message_handlers: Dict[str, List[Callable]] = {}
        self.running = False
        self.stats = {
            "messages_sent": 0,
            "messages_delivered": 0,
            "messages_failed": 0,
            "agents_connected": 0
        }
        
        logger.info("🚌 MessageBus initialized")
    
    @sprintlens.track(
        name="agent-registration",
        span_type="system",
        capture_input=True,
        capture_output=True,
        tags={"component": "message_bus"}
    )
    async def register_agent(self, agent: 'BaseAutonomousAgent') -> bool:
        """Register an agent with the message bus."""
        
        agent_id = agent.agent_id
        
        if agent_id in self.agents:
            logger.warning(f"⚠️ Agent {agent_id} is already registered")
            return False
        
        self.agents[agent_id] = agent
        self.message_handlers[agent_id] = []
        self.stats["agents_connected"] += 1
        
        logger.info(f"✅ Agent {agent_id} registered successfully")
        return True
    
    @sprintlens.track(
        name="agent-deregistration",
        span_type="system",
        capture_input=True,
        capture_output=True
    )
    async def deregister_agent(self, agent_id: str) -> bool:
        """Deregister an agent from the message bus."""
        
        if agent_id not in self.agents:
            logger.warning(f"⚠️ Agent {agent_id} is not registered")
            return False
        
        del self.agents[agent_id]
        del self.message_handlers[agent_id]
        self.stats["agents_connected"] -= 1
        
        logger.info(f"✅ Agent {agent_id} deregistered successfully")
        return True
    
    @sprintlens.track(
        name="message-sending",
        span_type="communication",
        capture_input=True,
        capture_output=True,
        tags={"component": "message_bus", "action": "send"}
    )
    async def send_message(self, message: Message) -> bool:
        """Send a message through the bus."""
        
        try:
            # Validate message
            if message.is_expired():
                logger.warning(f"⏰ Message {message.id} has expired")
                self.stats["messages_failed"] += 1
                return False
            
            if message.to_agent not in self.agents:
                logger.error(f"❌ Target agent {message.to_agent} not found")
                self.stats["messages_failed"] += 1
                return False
            
            # Add to queue
            await self.message_queue.put(message)
            self.stats["messages_sent"] += 1
            
            logger.info(f"📤 Message {message.id} queued: {message.from_agent} → {message.to_agent}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send message {message.id}: {e}")
            self.stats["messages_failed"] += 1
            return False
    
    @sprintlens.track(
        name="message-processing",
        span_type="communication",
        capture_input=True,
        capture_output=True,
        tags={"component": "message_bus", "action": "process"}
    )
    async def _process_message(self, message: Message) -> bool:
        """Process a single message."""
        
        try:
            target_agent = self.agents.get(message.to_agent)
            if not target_agent:
                logger.error(f"❌ Target agent {message.to_agent} not found for message {message.id}")
                return False
            
            # Deliver message to agent
            success = await target_agent.receive_message(message)
            
            if success:
                self.stats["messages_delivered"] += 1
                logger.info(f"✅ Message {message.id} delivered to {message.to_agent}")
            else:
                self.stats["messages_failed"] += 1
                logger.error(f"❌ Message {message.id} delivery failed to {message.to_agent}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error processing message {message.id}: {e}")
            self.stats["messages_failed"] += 1
            return False
    
    async def start(self):
        """Start the message bus processing loop."""
        
        self.running = True
        logger.info("🚌 MessageBus started")
        
        while self.running:
            try:
                # Get message from queue with timeout
                message = await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
                
                # Process message in background
                asyncio.create_task(self._process_message(message))
                
            except asyncio.TimeoutError:
                # No messages, continue
                continue
            except Exception as e:
                logger.error(f"❌ MessageBus error: {e}")
                await asyncio.sleep(1)
    
    async def stop(self):
        """Stop the message bus."""
        self.running = False
        logger.info("🛑 MessageBus stopped")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get message bus statistics."""
        return {
            **self.stats,
            "queue_size": self.message_queue.qsize(),
            "registered_agents": list(self.agents.keys()),
            "uptime": datetime.now().isoformat()
        }

# Global message bus instance
message_bus = MessageBus()
```

### 2.2 Base Autonomous Agent

Create `shared/models/base_agent.py`:

```python
"""
Base Autonomous Agent Framework
Provides foundational capabilities for autonomous agents including
communication, decision-making, and self-monitoring.
"""

import asyncio
import json
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
import logging

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Import communication framework
from shared.communication.message_bus import Message, MessageType, MessageBus, message_bus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentState(Enum):
    """Possible states for an autonomous agent."""
    INITIALIZING = "initializing"
    IDLE = "idle"
    WORKING = "working"
    COMMUNICATING = "communicating"
    ERROR = "error"
    SHUTTING_DOWN = "shutting_down"

class BaseAutonomousAgent(ABC):
    """
    Base class for all autonomous agents in the system.
    Provides communication, decision-making, and monitoring capabilities.
    """
    
    def __init__(self, agent_id: str, agent_role: str, config: Dict[str, Any] = None):
        """Initialize the autonomous agent."""
        
        self.agent_id = agent_id
        self.agent_role = agent_role
        self.config = config or {}
        self.state = AgentState.INITIALIZING
        
        # Communication
        self.message_bus = message_bus
        self.pending_requests: Dict[str, asyncio.Future] = {}
        
        # Monitoring
        self.start_time = datetime.now()
        self.request_count = 0
        self.error_count = 0
        self.last_activity = datetime.now()
        
        # Task management
        self.current_tasks: List[asyncio.Task] = []
        self.max_concurrent_tasks = config.get('max_concurrent_tasks', 5)
        
        logger.info(f"🤖 Agent {agent_id} ({agent_role}) initializing")
    
    async def initialize(self) -> bool:
        """Initialize the agent and register with message bus."""
        
        try:
            # Register with message bus
            success = await self.message_bus.register_agent(self)
            if not success:
                logger.error(f"❌ Failed to register agent {self.agent_id}")
                return False
            
            # Perform agent-specific initialization
            await self._initialize_agent()
            
            self.state = AgentState.IDLE
            logger.info(f"✅ Agent {self.agent_id} initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Agent {self.agent_id} initialization failed: {e}")
            self.state = AgentState.ERROR
            return False
    
    @abstractmethod
    async def _initialize_agent(self):
        """Agent-specific initialization logic."""
        pass
    
    @sprintlens.track(
        name="agent-message-handling",
        span_type="communication",
        capture_input=True,
        capture_output=True,
        tags={"component": "autonomous_agent"}
    )
    async def receive_message(self, message: Message) -> bool:
        """Receive and process a message from another agent."""
        
        try:
            self.last_activity = datetime.now()
            
            logger.info(f"📨 Agent {self.agent_id} received message {message.id} from {message.from_agent}")
            
            # Handle different message types
            if message.message_type == MessageType.REQUEST:
                return await self._handle_request(message)
            elif message.message_type == MessageType.RESPONSE:
                return await self._handle_response(message)
            elif message.message_type == MessageType.NOTIFICATION:
                return await self._handle_notification(message)
            elif message.message_type == MessageType.COORDINATION:
                return await self._handle_coordination(message)
            elif message.message_type == MessageType.ERROR:
                return await self._handle_error_message(message)
            elif message.message_type == MessageType.HEARTBEAT:
                return await self._handle_heartbeat(message)
            else:
                logger.warning(f"⚠️ Unknown message type: {message.message_type}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error handling message {message.id}: {e}")
            self.error_count += 1
            return False
    
    @sprintlens.track(
        name="agent-send-message",
        span_type="communication",
        capture_input=True,
        capture_output=True
    )
    async def send_message(self, to_agent: str, message_type: MessageType, 
                          payload: Dict[str, Any], correlation_id: str = None,
                          priority: int = 5, expires_in_seconds: int = 300) -> str:
        """Send a message to another agent."""
        
        message_id = str(uuid.uuid4())
        correlation_id = correlation_id or str(uuid.uuid4())
        
        expires_at = None
        if expires_in_seconds:
            expires_at = (datetime.now() + timedelta(seconds=expires_in_seconds)).isoformat()
        
        message = Message(
            id=message_id,
            from_agent=self.agent_id,
            to_agent=to_agent,
            message_type=message_type,
            payload=payload,
            timestamp=datetime.now().isoformat(),
            correlation_id=correlation_id,
            priority=priority,
            expires_at=expires_at
        )
        
        success = await self.message_bus.send_message(message)
        
        if success:
            logger.info(f"📤 Agent {self.agent_id} sent message {message_id} to {to_agent}")
        else:
            logger.error(f"❌ Agent {self.agent_id} failed to send message to {to_agent}")
        
        return message_id
    
    @sprintlens.track(
        name="agent-request-response",
        span_type="communication",
        capture_input=True,
        capture_output=True
    )
    async def send_request_and_wait(self, to_agent: str, payload: Dict[str, Any], 
                                   timeout: int = 30) -> Optional[Dict[str, Any]]:
        """Send a request and wait for response."""
        
        correlation_id = str(uuid.uuid4())
        
        # Create future for response
        future = asyncio.Future()
        self.pending_requests[correlation_id] = future
        
        try:
            # Send request
            message_id = await self.send_message(
                to_agent=to_agent,
                message_type=MessageType.REQUEST,
                payload=payload,
                correlation_id=correlation_id,
                expires_in_seconds=timeout
            )
            
            # Wait for response
            response = await asyncio.wait_for(future, timeout=timeout)
            logger.info(f"✅ Agent {self.agent_id} received response for request {message_id}")
            return response
            
        except asyncio.TimeoutError:
            logger.error(f"⏰ Request to {to_agent} timed out after {timeout}s")
            return None
        except Exception as e:
            logger.error(f"❌ Request to {to_agent} failed: {e}")
            return None
        finally:
            # Clean up
            if correlation_id in self.pending_requests:
                del self.pending_requests[correlation_id]
    
    # Message handlers (to be implemented by subclasses)
    
    async def _handle_request(self, message: Message) -> bool:
        """Handle incoming request message."""
        
        try:
            # Process request using agent-specific logic
            response_payload = await self._process_request(message.payload)
            
            # Send response back
            await self.send_message(
                to_agent=message.from_agent,
                message_type=MessageType.RESPONSE,
                payload=response_payload,
                correlation_id=message.correlation_id
            )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error processing request {message.id}: {e}")
            
            # Send error response
            await self.send_message(
                to_agent=message.from_agent,
                message_type=MessageType.ERROR,
                payload={"error": str(e), "request_id": message.id},
                correlation_id=message.correlation_id
            )
            
            return False
    
    async def _handle_response(self, message: Message) -> bool:
        """Handle incoming response message."""
        
        correlation_id = message.correlation_id
        
        if correlation_id in self.pending_requests:
            future = self.pending_requests[correlation_id]
            if not future.done():
                future.set_result(message.payload)
            return True
        else:
            logger.warning(f"⚠️ Received response for unknown request: {correlation_id}")
            return False
    
    async def _handle_notification(self, message: Message) -> bool:
        """Handle incoming notification message."""
        logger.info(f"📢 Agent {self.agent_id} received notification: {message.payload}")
        return True
    
    async def _handle_coordination(self, message: Message) -> bool:
        """Handle coordination message."""
        logger.info(f"🤝 Agent {self.agent_id} received coordination message: {message.payload}")
        return True
    
    async def _handle_error_message(self, message: Message) -> bool:
        """Handle error message."""
        logger.error(f"🚨 Agent {self.agent_id} received error: {message.payload}")
        return True
    
    async def _handle_heartbeat(self, message: Message) -> bool:
        """Handle heartbeat message."""
        logger.debug(f"💓 Agent {self.agent_id} received heartbeat from {message.from_agent}")
        return True
    
    # Abstract methods for agent-specific implementation
    
    @abstractmethod
    async def _process_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process a request and return response payload."""
        pass
    
    @abstractmethod
    async def start_autonomous_operation(self):
        """Start the agent's autonomous operation loop."""
        pass
    
    # Monitoring and lifecycle management
    
    @sprintlens.track(
        name="agent-health-check",
        span_type="monitoring",
        capture_output=True
    )
    def get_health_status(self) -> Dict[str, Any]:
        """Get agent health and performance statistics."""
        
        uptime = (datetime.now() - self.start_time).total_seconds()
        time_since_activity = (datetime.now() - self.last_activity).total_seconds()
        
        return {
            "agent_id": self.agent_id,
            "agent_role": self.agent_role,
            "state": self.state.value,
            "uptime_seconds": uptime,
            "time_since_last_activity_seconds": time_since_activity,
            "request_count": self.request_count,
            "error_count": self.error_count,
            "active_tasks": len(self.current_tasks),
            "pending_requests": len(self.pending_requests),
            "error_rate": self.error_count / max(self.request_count, 1),
            "is_healthy": self.state not in [AgentState.ERROR, AgentState.SHUTTING_DOWN],
            "timestamp": datetime.now().isoformat()
        }
    
    async def shutdown(self):
        """Gracefully shutdown the agent."""
        
        logger.info(f"🛑 Agent {self.agent_id} shutting down")
        self.state = AgentState.SHUTTING_DOWN
        
        # Cancel active tasks
        for task in self.current_tasks:
            if not task.done():
                task.cancel()
        
        # Wait for tasks to complete
        if self.current_tasks:
            await asyncio.gather(*self.current_tasks, return_exceptions=True)
        
        # Deregister from message bus
        await self.message_bus.deregister_agent(self.agent_id)
        
        logger.info(f"✅ Agent {self.agent_id} shutdown complete")
```

## 🔧 Step 3: Specialized Autonomous Agents

### 3.1 Coordinator Agent

Create `agents/coordinator/coordinator_agent.py`:

```python
"""
Coordinator Agent - Orchestrates the autonomous customer support system.
Responsible for routing requests, coordinating workflows, and monitoring system health.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Import base agent
from shared.models.base_agent import BaseAutonomousAgent, AgentState
from shared.communication.message_bus import MessageType

logger = logging.getLogger(__name__)

class WorkflowState(Enum):
    """States for customer support workflows."""
    RECEIVED = "received"
    ANALYZING = "analyzing"
    PROCESSING = "processing"
    GENERATING_RESPONSE = "generating_response"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class CustomerRequest:
    """Customer support request data structure."""
    request_id: str
    customer_id: str
    message: str
    priority: int
    category: Optional[str]
    timestamp: str
    workflow_state: WorkflowState
    assigned_agents: List[str]
    context: Dict[str, Any]

class CoordinatorAgent(BaseAutonomousAgent):
    """
    Autonomous coordinator that orchestrates customer support workflows.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(
            agent_id="coordinator-001",
            agent_role="coordinator",
            config=config
        )
        
        # Workflow management
        self.active_workflows: Dict[str, CustomerRequest] = {}
        self.workflow_templates: Dict[str, Dict[str, Any]] = {}
        self.agent_capabilities: Dict[str, List[str]] = {}
        
        # Performance tracking
        self.completed_workflows = 0
        self.failed_workflows = 0
        self.average_response_time = 0.0
        
    async def _initialize_agent(self):
        """Initialize coordinator-specific components."""
        
        # Define workflow templates
        self.workflow_templates = {
            "general_inquiry": {
                "steps": ["knowledge_lookup", "generate_response"],
                "agents": ["knowledge-001", "response-001"],
                "timeout": 60,
                "priority": 5
            },
            "technical_support": {
                "steps": ["technical_analysis", "knowledge_lookup", "generate_response"],
                "agents": ["knowledge-001", "response-001"],
                "timeout": 120,
                "priority": 3
            },
            "billing_inquiry": {
                "steps": ["account_lookup", "billing_analysis", "generate_response"],
                "agents": ["knowledge-001", "response-001"],
                "timeout": 90,
                "priority": 4
            }
        }
        
        # Define agent capabilities
        self.agent_capabilities = {
            "knowledge-001": ["knowledge_lookup", "technical_analysis", "account_lookup", "billing_analysis"],
            "response-001": ["generate_response", "format_response"],
            "analytics-001": ["performance_analysis", "quality_assessment"]
        }
        
        logger.info(f"📋 Coordinator initialized with {len(self.workflow_templates)} workflow templates")
    
    @sprintlens.track(
        name="coordinator-autonomous-operation",
        span_type="orchestration",
        capture_output=True,
        tags={"agent": "coordinator", "operation": "autonomous"}
    )
    async def start_autonomous_operation(self):
        """Start autonomous coordination loop."""
        
        logger.info("🚀 Coordinator autonomous operation started")
        
        while self.state != AgentState.SHUTTING_DOWN:
            try:
                # Monitor active workflows
                await self._monitor_workflows()
                
                # Perform health checks on other agents
                await self._perform_health_checks()
                
                # Optimize workflow allocation
                await self._optimize_workflows()
                
                # Update performance metrics
                await self._update_metrics()
                
                # Wait before next cycle
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"❌ Coordinator autonomous operation error: {e}")
                self.error_count += 1
                await asyncio.sleep(10)
    
    @sprintlens.track(
        name="customer-request-processing",
        span_type="orchestration",
        capture_input=True,
        capture_output=True,
        tags={"component": "coordinator"}
    )
    async def _process_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process incoming customer support request."""
        
        try:
            # Extract request details
            customer_message = payload.get('message', '')
            customer_id = payload.get('customer_id', 'anonymous')
            priority = payload.get('priority', 5)
            
            # Create customer request
            request_id = f"req_{int(datetime.now().timestamp())}_{customer_id}"
            
            customer_request = CustomerRequest(
                request_id=request_id,
                customer_id=customer_id,
                message=customer_message,
                priority=priority,
                category=None,
                timestamp=datetime.now().isoformat(),
                workflow_state=WorkflowState.RECEIVED,
                assigned_agents=[],
                context=payload.get('context', {})
            )
            
            # Analyze request and determine workflow
            workflow_type = await self._analyze_request_category(customer_message)
            customer_request.category = workflow_type
            
            # Store in active workflows
            self.active_workflows[request_id] = customer_request
            
            # Start workflow processing
            workflow_result = await self._execute_workflow(customer_request)
            
            return {
                "success": True,
                "request_id": request_id,
                "workflow_type": workflow_type,
                "result": workflow_result,
                "processing_time": (datetime.now() - datetime.fromisoformat(customer_request.timestamp)).total_seconds()
            }
            
        except Exception as e:
            logger.error(f"❌ Error processing customer request: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    @sprintlens.track(
        name="request-category-analysis",
        span_type="analysis",
        capture_input=True,
        capture_output=True
    )
    async def _analyze_request_category(self, message: str) -> str:
        """Analyze customer message to determine workflow category."""
        
        message_lower = message.lower()
        
        # Simple keyword-based categorization (in production, use ML/LLM)
        if any(word in message_lower for word in ['bill', 'payment', 'charge', 'invoice', 'refund']):
            return "billing_inquiry"
        elif any(word in message_lower for word in ['error', 'bug', 'not working', 'technical', 'crash']):
            return "technical_support"
        else:
            return "general_inquiry"
    
    @sprintlens.track(
        name="workflow-execution",
        span_type="orchestration",
        capture_input=True,
        capture_output=True
    )
    async def _execute_workflow(self, request: CustomerRequest) -> Dict[str, Any]:
        """Execute the appropriate workflow for the customer request."""
        
        workflow_template = self.workflow_templates.get(request.category, self.workflow_templates["general_inquiry"])
        
        logger.info(f"🔄 Executing {request.category} workflow for request {request.request_id}")
        
        try:
            request.workflow_state = WorkflowState.PROCESSING
            
            # Step 1: Knowledge lookup
            knowledge_result = await self._request_knowledge_lookup(request)
            
            if not knowledge_result or not knowledge_result.get('success'):
                raise Exception("Knowledge lookup failed")
            
            # Step 2: Generate response
            response_result = await self._request_response_generation(request, knowledge_result)
            
            if not response_result or not response_result.get('success'):
                raise Exception("Response generation failed")
            
            # Step 3: Quality assessment (optional)
            quality_result = await self._request_quality_assessment(request, response_result)
            
            request.workflow_state = WorkflowState.COMPLETED
            self.completed_workflows += 1
            
            # Clean up
            if request.request_id in self.active_workflows:
                del self.active_workflows[request.request_id]
            
            return {
                "success": True,
                "knowledge_result": knowledge_result,
                "response_result": response_result,
                "quality_result": quality_result,
                "workflow_completed": True
            }
            
        except Exception as e:
            logger.error(f"❌ Workflow execution failed for {request.request_id}: {e}")
            request.workflow_state = WorkflowState.FAILED
            self.failed_workflows += 1
            
            return {
                "success": False,
                "error": str(e),
                "workflow_failed": True
            }
    
    async def _request_knowledge_lookup(self, request: CustomerRequest) -> Optional[Dict[str, Any]]:
        """Request knowledge lookup from knowledge agent."""
        
        payload = {
            "request_id": request.request_id,
            "query": request.message,
            "category": request.category,
            "customer_context": request.context
        }
        
        return await self.send_request_and_wait(
            to_agent="knowledge-001",
            payload=payload,
            timeout=30
        )
    
    async def _request_response_generation(self, request: CustomerRequest, knowledge_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Request response generation from response agent."""
        
        payload = {
            "request_id": request.request_id,
            "customer_message": request.message,
            "knowledge_data": knowledge_result.get('knowledge_data', {}),
            "category": request.category,
            "customer_context": request.context
        }
        
        return await self.send_request_and_wait(
            to_agent="response-001",
            payload=payload,
            timeout=30
        )
    
    async def _request_quality_assessment(self, request: CustomerRequest, response_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Request quality assessment from analytics agent."""
        
        payload = {
            "request_id": request.request_id,
            "customer_message": request.message,
            "generated_response": response_result.get('response', ''),
            "category": request.category
        }
        
        return await self.send_request_and_wait(
            to_agent="analytics-001",
            payload=payload,
            timeout=15
        )
    
    async def _monitor_workflows(self):
        """Monitor active workflows for timeouts and issues."""
        
        current_time = datetime.now()
        expired_workflows = []
        
        for request_id, request in self.active_workflows.items():
            request_time = datetime.fromisoformat(request.timestamp)
            age = (current_time - request_time).total_seconds()
            
            # Check for timeout (5 minutes default)
            if age > 300:  # 5 minutes
                logger.warning(f"⏰ Workflow {request_id} has timed out")
                request.workflow_state = WorkflowState.FAILED
                expired_workflows.append(request_id)
        
        # Clean up expired workflows
        for request_id in expired_workflows:
            del self.active_workflows[request_id]
            self.failed_workflows += 1
    
    async def _perform_health_checks(self):
        """Perform health checks on other agents."""
        
        agents_to_check = ["knowledge-001", "response-001", "analytics-001"]
        
        for agent_id in agents_to_check:
            await self.send_message(
                to_agent=agent_id,
                message_type=MessageType.HEARTBEAT,
                payload={"timestamp": datetime.now().isoformat()},
                expires_in_seconds=30
            )
    
    async def _optimize_workflows(self):
        """Optimize workflow allocation and performance."""
        
        # Simple optimization: redistribute if too many workflows are active
        if len(self.active_workflows) > 10:
            logger.warning(f"⚠️ High workflow load: {len(self.active_workflows)} active workflows")
            
            # Could implement load balancing, agent scaling, etc.
            # For now, just log the situation
    
    async def _update_metrics(self):
        """Update performance metrics."""
        
        total_workflows = self.completed_workflows + self.failed_workflows
        
        if total_workflows > 0:
            success_rate = self.completed_workflows / total_workflows
            
            # Send metrics to analytics agent
            await self.send_message(
                to_agent="analytics-001",
                message_type=MessageType.NOTIFICATION,
                payload={
                    "metric_type": "coordinator_performance",
                    "active_workflows": len(self.active_workflows),
                    "completed_workflows": self.completed_workflows,
                    "failed_workflows": self.failed_workflows,
                    "success_rate": success_rate,
                    "timestamp": datetime.now().isoformat()
                }
            )
```

### 3.2 Knowledge Agent

Create `agents/knowledge/knowledge_agent.py`:

```python
"""
Knowledge Agent - Autonomous information retrieval and processing.
Handles knowledge lookup, context gathering, and information synthesis.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Import base agent
from shared.models.base_agent import BaseAutonomousAgent, AgentState
from shared.communication.message_bus import MessageType

logger = logging.getLogger(__name__)

class KnowledgeAgent(BaseAutonomousAgent):
    """
    Autonomous knowledge agent that retrieves and processes information.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(
            agent_id="knowledge-001",
            agent_role="knowledge",
            config=config
        )
        
        # Knowledge base simulation (in production, this would be a real DB/vector store)
        self.knowledge_base = {
            "billing": {
                "payment_methods": "We accept credit cards, bank transfers, and PayPal",
                "billing_cycle": "Billing occurs monthly on the anniversary of your signup date",
                "refund_policy": "Refunds are available within 30 days of purchase",
                "invoice_issues": "If you're having issues with your invoice, please contact our billing department"
            },
            "technical": {
                "login_issues": "If you can't log in, try resetting your password or clearing your browser cache",
                "performance": "For performance issues, check your internet connection and try refreshing the page",
                "features": "Our platform includes project management, team collaboration, and reporting tools",
                "api_access": "API access is available with our professional and enterprise plans"
            },
            "general": {
                "company_info": "We are a leading provider of AI-powered business solutions",
                "contact_info": "You can reach our support team 24/7 via chat, email, or phone",
                "business_hours": "Our support team is available Monday-Friday 9AM-6PM EST",
                "getting_started": "To get started, create an account and follow our quick setup guide"
            }
        }
        
        # Performance tracking
        self.lookup_count = 0
        self.cache_hits = 0
        self.knowledge_cache: Dict[str, Dict[str, Any]] = {}
    
    async def _initialize_agent(self):
        """Initialize knowledge agent components."""
        
        logger.info(f"📚 Knowledge agent initialized with {len(self.knowledge_base)} knowledge categories")
        
        # Initialize knowledge cache
        self.knowledge_cache = {}
        
        # In production, you would:
        # - Connect to vector databases (Pinecone, Weaviate, etc.)
        # - Initialize embedding models
        # - Set up knowledge retrieval pipelines
        # - Configure RAG (Retrieval-Augmented Generation) systems
    
    async def start_autonomous_operation(self):
        """Start autonomous knowledge management operations."""
        
        logger.info("📚 Knowledge agent autonomous operation started")
        
        while self.state != AgentState.SHUTTING_DOWN:
            try:
                # Perform knowledge base maintenance
                await self._maintain_knowledge_base()
                
                # Update knowledge cache
                await self._update_cache()
                
                # Analyze usage patterns
                await self._analyze_usage_patterns()
                
                # Wait before next cycle
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"❌ Knowledge agent autonomous operation error: {e}")
                await asyncio.sleep(30)
    
    @sprintlens.track(
        name="knowledge-request-processing",
        span_type="knowledge",
        capture_input=True,
        capture_output=True,
        tags={"agent": "knowledge"}
    )
    async def _process_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process knowledge lookup request."""
        
        try:
            request_id = payload.get('request_id', 'unknown')
            query = payload.get('query', '')
            category = payload.get('category', 'general')
            customer_context = payload.get('customer_context', {})
            
            logger.info(f"🔍 Processing knowledge request {request_id}: {query[:50]}...")
            
            self.lookup_count += 1
            
            # Perform knowledge lookup
            knowledge_data = await self._perform_knowledge_lookup(query, category, customer_context)
            
            return {
                "success": True,
                "request_id": request_id,
                "knowledge_data": knowledge_data,
                "query": query,
                "category": category,
                "confidence": knowledge_data.get('confidence', 0.8),
                "sources": knowledge_data.get('sources', []),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Knowledge lookup error: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    @sprintlens.track(
        name="knowledge-lookup",
        span_type="retrieval",
        capture_input=True,
        capture_output=True
    )
    async def _perform_knowledge_lookup(self, query: str, category: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Perform actual knowledge lookup and synthesis."""
        
        # Check cache first
        cache_key = f"{category}:{query[:50]}"
        if cache_key in self.knowledge_cache:
            self.cache_hits += 1
            logger.info(f"💾 Cache hit for query: {query[:30]}...")
            return self.knowledge_cache[cache_key]
        
        # Perform knowledge retrieval
        relevant_knowledge = await self._retrieve_relevant_knowledge(query, category)
        
        # Synthesize knowledge
        synthesized_knowledge = await self._synthesize_knowledge(query, relevant_knowledge, context)
        
        # Cache result
        self.knowledge_cache[cache_key] = synthesized_knowledge
        
        return synthesized_knowledge
    
    @sprintlens.track(
        name="knowledge-retrieval",
        span_type="retrieval",
        capture_input=True,
        capture_output=True
    )
    async def _retrieve_relevant_knowledge(self, query: str, category: str) -> List[Dict[str, Any]]:
        """Retrieve relevant knowledge from various sources."""
        
        query_lower = query.lower()
        relevant_items = []
        
        # Get category-specific knowledge
        category_mapping = {
            "billing_inquiry": "billing",
            "technical_support": "technical",
            "general_inquiry": "general"
        }
        
        kb_category = category_mapping.get(category, "general")
        knowledge_section = self.knowledge_base.get(kb_category, {})
        
        # Simple keyword matching (in production, use semantic search)
        for key, value in knowledge_section.items():
            if any(word in value.lower() for word in query_lower.split()):
                relevant_items.append({
                    "key": key,
                    "content": value,
                    "category": kb_category,
                    "relevance_score": 0.8  # Simplified scoring
                })
        
        # If no specific matches, include general information
        if not relevant_items and kb_category != "general":
            general_section = self.knowledge_base.get("general", {})
            for key, value in general_section.items():
                relevant_items.append({
                    "key": key,
                    "content": value,
                    "category": "general",
                    "relevance_score": 0.6
                })
        
        # Sort by relevance
        relevant_items.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return relevant_items[:3]  # Return top 3 most relevant
    
    @sprintlens.track(
        name="knowledge-synthesis",
        span_type="processing",
        capture_input=True,
        capture_output=True
    )
    async def _synthesize_knowledge(self, query: str, knowledge_items: List[Dict[str, Any]], 
                                   context: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize retrieved knowledge into structured response."""
        
        if not knowledge_items:
            return {
                "summary": "I don't have specific information about this topic. Please contact our support team for assistance.",
                "details": [],
                "confidence": 0.3,
                "sources": [],
                "recommendations": ["Contact support team", "Check our documentation"]
            }
        
        # Combine knowledge items
        summary_parts = []
        details = []
        sources = []
        
        for item in knowledge_items:
            summary_parts.append(item["content"])
            details.append({
                "topic": item["key"],
                "information": item["content"],
                "category": item["category"],
                "relevance": item["relevance_score"]
            })
            sources.append(f"Knowledge base - {item['category']}/{item['key']}")
        
        # Generate summary
        summary = ". ".join(summary_parts[:2])  # Combine top 2 items
        
        # Generate recommendations based on query type
        recommendations = self._generate_recommendations(query, knowledge_items)
        
        # Calculate confidence based on relevance scores
        avg_relevance = sum(item["relevance_score"] for item in knowledge_items) / len(knowledge_items)
        confidence = min(0.95, avg_relevance)
        
        return {
            "summary": summary,
            "details": details,
            "confidence": confidence,
            "sources": sources,
            "recommendations": recommendations,
            "knowledge_count": len(knowledge_items)
        }
    
    def _generate_recommendations(self, query: str, knowledge_items: List[Dict[str, Any]]) -> List[str]:
        """Generate actionable recommendations based on the query and knowledge."""
        
        query_lower = query.lower()
        recommendations = []
        
        # Query-specific recommendations
        if "billing" in query_lower or "payment" in query_lower:
            recommendations.extend([
                "Check your account billing section",
                "Review your payment method",
                "Contact billing support if needed"
            ])
        elif "login" in query_lower or "password" in query_lower:
            recommendations.extend([
                "Try resetting your password",
                "Clear your browser cache",
                "Check if your account is active"
            ])
        elif "technical" in query_lower or "error" in query_lower:
            recommendations.extend([
                "Check our troubleshooting guide",
                "Verify your internet connection",
                "Contact technical support"
            ])
        else:
            recommendations.extend([
                "Review our documentation",
                "Contact our support team",
                "Check our FAQ section"
            ])
        
        return recommendations[:3]  # Return top 3 recommendations
    
    async def _maintain_knowledge_base(self):
        """Perform autonomous knowledge base maintenance."""
        
        # In production, this would:
        # - Update embeddings
        # - Refresh external data sources
        # - Optimize search indices
        # - Clean up outdated information
        
        logger.debug("🔧 Performing knowledge base maintenance")
    
    async def _update_cache(self):
        """Update knowledge cache and remove expired entries."""
        
        # Simple cache cleanup (remove oldest entries if cache is too large)
        if len(self.knowledge_cache) > 100:
            # Remove oldest 20 entries
            items_to_remove = list(self.knowledge_cache.keys())[:20]
            for key in items_to_remove:
                del self.knowledge_cache[key]
            
            logger.info(f"🧹 Knowledge cache cleaned, removed {len(items_to_remove)} entries")
    
    async def _analyze_usage_patterns(self):
        """Analyze knowledge usage patterns for optimization."""
        
        if self.lookup_count > 0:
            cache_hit_rate = self.cache_hits / self.lookup_count
            
            logger.info(f"📊 Knowledge agent stats: {self.lookup_count} lookups, {cache_hit_rate:.2%} cache hit rate")
            
            # Send analytics to analytics agent
            await self.send_message(
                to_agent="analytics-001",
                message_type=MessageType.NOTIFICATION,
                payload={
                    "metric_type": "knowledge_performance",
                    "lookup_count": self.lookup_count,
                    "cache_hits": self.cache_hits,
                    "cache_hit_rate": cache_hit_rate,
                    "active_cache_entries": len(self.knowledge_cache),
                    "timestamp": datetime.now().isoformat()
                }
            )
```

### 3.3 Response Agent

Create `agents/response/response_agent.py`:

```python
"""
Response Agent - Autonomous response generation and formatting.
Generates customer-facing responses using knowledge data and context.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging
import random

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Import base agent
from shared.models.base_agent import BaseAutonomousAgent, AgentState
from shared.communication.message_bus import MessageType

logger = logging.getLogger(__name__)

class ResponseAgent(BaseAutonomousAgent):
    """
    Autonomous response agent that generates customer support responses.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(
            agent_id="response-001",
            agent_role="response",
            config=config
        )
        
        # Response templates and styles
        self.response_templates = {
            "greeting": [
                "Thank you for contacting us!",
                "Hello! I'm happy to help you with your question.",
                "Hi there! Let me assist you with that."
            ],
            "closing": [
                "Is there anything else I can help you with?",
                "Please don't hesitate to reach out if you have any other questions.",
                "I hope this information is helpful!"
            ],
            "escalation": [
                "For more detailed assistance, I'd recommend contacting our specialist team.",
                "This seems like it might need specialist attention. Let me connect you with the right team.",
                "I'll escalate this to our technical team for further assistance."
            ]
        }
        
        # Response quality tracking
        self.responses_generated = 0
        self.average_response_length = 0
        self.quality_scores = []
    
    async def _initialize_agent(self):
        """Initialize response agent components."""
        
        logger.info("💬 Response agent initialized")
        
        # In production, you would:
        # - Initialize LLM clients (OpenAI, Anthropic, etc.)
        # - Load response templates
        # - Set up response quality models
        # - Configure tone and style preferences
    
    async def start_autonomous_operation(self):
        """Start autonomous response optimization operations."""
        
        logger.info("💬 Response agent autonomous operation started")
        
        while self.state != AgentState.SHUTTING_DOWN:
            try:
                # Optimize response templates
                await self._optimize_templates()
                
                # Analyze response quality trends
                await self._analyze_quality_trends()
                
                # Update response strategies
                await self._update_strategies()
                
                # Wait before next cycle
                await asyncio.sleep(45)
                
            except Exception as e:
                logger.error(f"❌ Response agent autonomous operation error: {e}")
                await asyncio.sleep(30)
    
    @sprintlens.track(
        name="response-generation-request",
        span_type="generation",
        capture_input=True,
        capture_output=True,
        tags={"agent": "response"}
    )
    async def _process_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process response generation request."""
        
        try:
            request_id = payload.get('request_id', 'unknown')
            customer_message = payload.get('customer_message', '')
            knowledge_data = payload.get('knowledge_data', {})
            category = payload.get('category', 'general')
            customer_context = payload.get('customer_context', {})
            
            logger.info(f"💬 Generating response for request {request_id}")
            
            # Generate response
            response_data = await self._generate_response(
                customer_message, knowledge_data, category, customer_context
            )
            
            self.responses_generated += 1
            
            # Update average response length
            response_length = len(response_data.get('response', ''))
            self.average_response_length = (
                (self.average_response_length * (self.responses_generated - 1) + response_length) 
                / self.responses_generated
            )
            
            return {
                "success": True,
                "request_id": request_id,
                "response": response_data['response'],
                "formatted_response": response_data['formatted_response'],
                "response_metadata": response_data['metadata'],
                "confidence": response_data['confidence'],
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Response generation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    @sprintlens.track(
        name="response-generation",
        span_type="generation",
        capture_input=True,
        capture_output=True
    )
    async def _generate_response(self, customer_message: str, knowledge_data: Dict[str, Any],
                                category: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate customer support response."""
        
        # Extract knowledge summary and details
        knowledge_summary = knowledge_data.get('summary', '')
        knowledge_details = knowledge_data.get('details', [])
        recommendations = knowledge_data.get('recommendations', [])
        confidence = knowledge_data.get('confidence', 0.8)
        
        # Generate main response content
        main_response = await self._create_main_response(
            customer_message, knowledge_summary, knowledge_details, category
        )
        
        # Add recommendations if available
        if recommendations:
            recommendations_text = await self._format_recommendations(recommendations)
            main_response += f"\n\n{recommendations_text}"
        
        # Create formatted response with proper structure
        formatted_response = await self._format_response(
            main_response, category, confidence
        )
        
        # Generate metadata
        metadata = {
            "response_length": len(main_response),
            "knowledge_sources": len(knowledge_details),
            "recommendations_count": len(recommendations),
            "category": category,
            "generated_at": datetime.now().isoformat(),
            "confidence": confidence
        }
        
        return {
            "response": main_response,
            "formatted_response": formatted_response,
            "metadata": metadata,
            "confidence": confidence
        }
    
    @sprintlens.track(
        name="main-response-creation",
        span_type="processing",
        capture_input=True,
        capture_output=True
    )
    async def _create_main_response(self, customer_message: str, knowledge_summary: str,
                                   knowledge_details: List[Dict[str, Any]], category: str) -> str:
        """Create the main response content."""
        
        # Start with appropriate greeting
        greeting = random.choice(self.response_templates["greeting"])
        
        # Create main content based on available knowledge
        if knowledge_summary:
            # Use knowledge to provide specific information
            main_content = f"Based on your question, here's what I can help you with:\n\n{knowledge_summary}"
            
            # Add specific details if available
            if knowledge_details:
                high_relevance_details = [
                    detail for detail in knowledge_details 
                    if detail.get('relevance', 0) > 0.7
                ]
                
                if high_relevance_details:
                    main_content += "\n\nAdditional information:"
                    for detail in high_relevance_details[:2]:  # Top 2 details
                        main_content += f"\n• {detail['information']}"
        else:
            # Fallback response when no specific knowledge is available
            main_content = self._create_fallback_response(customer_message, category)
        
        # Combine greeting and main content
        response = f"{greeting}\n\n{main_content}"
        
        return response
    
    def _create_fallback_response(self, customer_message: str, category: str) -> str:
        """Create fallback response when specific knowledge isn't available."""
        
        fallback_responses = {
            "billing_inquiry": "I understand you have a billing-related question. While I don't have the specific details readily available, our billing support team will be able to provide you with detailed information about your account.",
            "technical_support": "I see you're experiencing a technical issue. Our technical support team has specialized tools and expertise to help diagnose and resolve technical problems.",
            "general_inquiry": "Thank you for your question. While I don't have the specific information you're looking for immediately available, I'll make sure you get connected with someone who can provide the detailed assistance you need."
        }
        
        return fallback_responses.get(category, fallback_responses["general_inquiry"])
    
    @sprintlens.track(
        name="recommendations-formatting",
        span_type="formatting",
        capture_input=True,
        capture_output=True
    )
    async def _format_recommendations(self, recommendations: List[str]) -> str:
        """Format recommendations in a user-friendly way."""
        
        if not recommendations:
            return ""
        
        if len(recommendations) == 1:
            return f"I recommend: {recommendations[0]}"
        
        formatted = "Here are some steps you can try:\n"
        for i, rec in enumerate(recommendations, 1):
            formatted += f"{i}. {rec}\n"
        
        return formatted.strip()
    
    @sprintlens.track(
        name="response-formatting",
        span_type="formatting",
        capture_input=True,
        capture_output=True
    )
    async def _format_response(self, main_response: str, category: str, confidence: float) -> Dict[str, Any]:
        """Format response with proper structure and metadata."""
        
        # Choose appropriate closing
        closing = random.choice(self.response_templates["closing"])
        
        # Add escalation if confidence is low
        if confidence < 0.6:
            escalation = random.choice(self.response_templates["escalation"])
            full_response = f"{main_response}\n\n{escalation}\n\n{closing}"
        else:
            full_response = f"{main_response}\n\n{closing}"
        
        # Create structured response
        formatted_response = {
            "text": full_response,
            "structure": {
                "greeting": True,
                "main_content": True,
                "recommendations": "recommendations" in main_response.lower(),
                "escalation": confidence < 0.6,
                "closing": True
            },
            "metadata": {
                "category": category,
                "confidence": confidence,
                "word_count": len(full_response.split()),
                "character_count": len(full_response),
                "tone": "professional",
                "includes_escalation": confidence < 0.6
            }
        }
        
        return formatted_response
    
    async def _optimize_templates(self):
        """Optimize response templates based on usage patterns."""
        
        # In production, this would:
        # - Analyze successful vs unsuccessful responses
        # - Update templates based on customer feedback
        # - A/B test different response styles
        # - Optimize for different customer segments
        
        logger.debug("🔧 Optimizing response templates")
    
    async def _analyze_quality_trends(self):
        """Analyze response quality trends."""
        
        if self.responses_generated > 0:
            logger.info(f"📊 Response agent stats: {self.responses_generated} responses generated, avg length: {self.average_response_length:.0f} chars")
            
            # Send analytics
            await self.send_message(
                to_agent="analytics-001",
                message_type=MessageType.NOTIFICATION,
                payload={
                    "metric_type": "response_performance",
                    "responses_generated": self.responses_generated,
                    "average_response_length": self.average_response_length,
                    "timestamp": datetime.now().isoformat()
                }
            )
    
    async def _update_strategies(self):
        """Update response generation strategies."""
        
        # In production, this would:
        # - Adjust response style based on success metrics
        # - Update knowledge integration strategies
        # - Optimize for customer satisfaction scores
        # - Implement new response patterns
        
        logger.debug("🎯 Updating response strategies")
```

### 3.4 Analytics Agent

Create `agents/analytics/analytics_agent.py`:

```python
"""
Analytics Agent - Autonomous system monitoring and performance analysis.
Monitors system health, performance metrics, and quality assessment.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict, deque
import logging

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Import base agent
from shared.models.base_agent import BaseAutonomousAgent, AgentState
from shared.communication.message_bus import MessageType

logger = logging.getLogger(__name__)

class AnalyticsAgent(BaseAutonomousAgent):
    """
    Autonomous analytics agent that monitors system performance and quality.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(
            agent_id="analytics-001",
            agent_role="analytics",
            config=config
        )
        
        # Metrics storage
        self.system_metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.quality_assessments: List[Dict[str, Any]] = []
        self.performance_trends: Dict[str, List[float]] = defaultdict(list)
        
        # Analysis results
        self.latest_analysis: Dict[str, Any] = {}
        self.alerts: List[Dict[str, Any]] = []
        
        # Configuration
        self.analysis_interval = 60  # seconds
        self.alert_thresholds = {
            "success_rate_min": 0.85,
            "response_time_max": 30.0,
            "error_rate_max": 0.15,
            "quality_score_min": 0.7
        }
    
    async def _initialize_agent(self):
        """Initialize analytics agent components."""
        
        logger.info("📊 Analytics agent initialized")
        
        # Initialize metric collectors
        self.system_metrics = defaultdict(lambda: deque(maxlen=1000))
    
    async def start_autonomous_operation(self):
        """Start autonomous analytics and monitoring operations."""
        
        logger.info("📊 Analytics agent autonomous operation started")
        
        while self.state != AgentState.SHUTTING_DOWN:
            try:
                # Collect system metrics
                await self._collect_system_metrics()
                
                # Analyze performance trends
                await self._analyze_performance_trends()
                
                # Generate quality insights
                await self._generate_quality_insights()
                
                # Check for alerts
                await self._check_alerts()
                
                # Generate reports
                await self._generate_reports()
                
                # Wait before next cycle
                await asyncio.sleep(self.analysis_interval)
                
            except Exception as e:
                logger.error(f"❌ Analytics agent autonomous operation error: {e}")
                await asyncio.sleep(30)
    
    @sprintlens.track(
        name="analytics-request-processing",
        span_type="analysis",
        capture_input=True,
        capture_output=True,
        tags={"agent": "analytics"}
    )
    async def _process_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process analytics and quality assessment requests."""
        
        try:
            request_id = payload.get('request_id', 'unknown')
            
            # Check request type
            if 'customer_message' in payload and 'generated_response' in payload:
                # Quality assessment request
                return await self._assess_response_quality(payload)
            else:
                # General analytics request
                return await self._provide_analytics_data(payload)
                
        except Exception as e:
            logger.error(f"❌ Analytics processing error: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    @sprintlens.track(
        name="response-quality-assessment",
        span_type="evaluation",
        capture_input=True,
        capture_output=True
    )
    async def _assess_response_quality(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Assess the quality of a generated response."""
        
        request_id = payload.get('request_id', 'unknown')
        customer_message = payload.get('customer_message', '')
        generated_response = payload.get('generated_response', '')
        category = payload.get('category', 'general')
        
        logger.info(f"📊 Assessing response quality for request {request_id}")
        
        # Perform quality assessment
        quality_score = await self._calculate_quality_score(
            customer_message, generated_response, category
        )
        
        # Store assessment
        assessment = {
            "request_id": request_id,
            "customer_message": customer_message,
            "generated_response": generated_response,
            "category": category,
            "quality_score": quality_score,
            "assessment_details": quality_score['details'],
            "timestamp": datetime.now().isoformat()
        }
        
        self.quality_assessments.append(assessment)
        
        # Keep only recent assessments
        if len(self.quality_assessments) > 1000:
            self.quality_assessments = self.quality_assessments[-1000:]
        
        return {
            "success": True,
            "request_id": request_id,
            "quality_score": quality_score['overall_score'],
            "quality_details": quality_score['details'],
            "recommendations": quality_score['recommendations'],
            "timestamp": datetime.now().isoformat()
        }
    
    @sprintlens.track(
        name="quality-score-calculation",
        span_type="evaluation",
        capture_input=True,
        capture_output=True
    )
    async def _calculate_quality_score(self, customer_message: str, response: str, category: str) -> Dict[str, Any]:
        """Calculate comprehensive quality score for a response."""
        
        scores = {}
        details = {}
        
        # 1. Response length appropriateness
        response_length = len(response)
        if 50 <= response_length <= 1000:
            scores['length'] = 1.0
            details['length'] = "Appropriate length"
        elif response_length < 50:
            scores['length'] = 0.6
            details['length'] = "Response too short"
        else:
            scores['length'] = 0.8
            details['length'] = "Response quite long"
        
        # 2. Relevance to customer message
        customer_words = set(customer_message.lower().split())
        response_words = set(response.lower().split())
        common_words = customer_words.intersection(response_words)
        
        relevance_score = min(1.0, len(common_words) / max(len(customer_words), 1) * 2)
        scores['relevance'] = relevance_score
        details['relevance'] = f"Found {len(common_words)} relevant keywords"
        
        # 3. Professional tone check
        professional_indicators = ['thank', 'please', 'help', 'assist', 'information', 'recommend']
        unprofessional_indicators = ['yeah', 'nope', 'dunno', 'whatever']
        
        professional_count = sum(1 for word in professional_indicators if word in response.lower())
        unprofessional_count = sum(1 for word in unprofessional_indicators if word in response.lower())
        
        tone_score = min(1.0, (professional_count * 0.2) - (unprofessional_count * 0.3) + 0.6)
        tone_score = max(0.0, tone_score)
        scores['tone'] = tone_score
        details['tone'] = f"Professional tone indicators: {professional_count}, unprofessional: {unprofessional_count}"
        
        # 4. Completeness check
        question_words = ['what', 'how', 'when', 'where', 'why', 'which', 'who']
        has_question = any(word in customer_message.lower() for word in question_words)
        
        if has_question:
            # Check if response attempts to answer
            answer_indicators = ['here', 'you can', 'try', 'steps', 'recommend', 'solution']
            has_answer_attempt = any(word in response.lower() for word in answer_indicators)
            scores['completeness'] = 1.0 if has_answer_attempt else 0.5
            details['completeness'] = "Attempts to answer question" if has_answer_attempt else "May not fully address question"
        else:
            scores['completeness'] = 0.8  # Not a direct question
            details['completeness'] = "No direct question to answer"
        
        # 5. Category-specific scoring
        category_bonus = 0.0
        if category == "billing_inquiry":
            if any(word in response.lower() for word in ['billing', 'payment', 'account', 'invoice']):
                category_bonus = 0.1
        elif category == "technical_support":
            if any(word in response.lower() for word in ['technical', 'support', 'troubleshoot', 'fix']):
                category_bonus = 0.1
        
        # Calculate overall score
        weights = {
            'length': 0.15,
            'relevance': 0.35,
            'tone': 0.25,
            'completeness': 0.25
        }
        
        overall_score = sum(scores[key] * weights[key] for key in scores)
        overall_score = min(1.0, overall_score + category_bonus)
        
        # Generate recommendations
        recommendations = []
        if scores['length'] < 0.8:
            if response_length < 50:
                recommendations.append("Consider providing more detailed information")
            else:
                recommendations.append("Consider making response more concise")
        
        if scores['relevance'] < 0.7:
            recommendations.append("Ensure response directly addresses customer's question")
        
        if scores['tone'] < 0.8:
            recommendations.append("Use more professional language and tone")
        
        if scores['completeness'] < 0.7:
            recommendations.append("Provide more complete answer to customer's question")
        
        return {
            "overall_score": round(overall_score, 3),
            "component_scores": scores,
            "details": details,
            "recommendations": recommendations,
            "category_bonus": category_bonus
        }
    
    async def _provide_analytics_data(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Provide analytics data based on request."""
        
        return {
            "success": True,
            "system_metrics": self._get_current_metrics(),
            "quality_summary": self._get_quality_summary(),
            "performance_trends": self._get_performance_trends(),
            "alerts": self.alerts,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _collect_system_metrics(self):
        """Collect metrics from message notifications."""
        
        # This method receives metrics via notifications from other agents
        # The actual collection happens in message handling
        pass
    
    async def _handle_notification(self, message) -> bool:
        """Handle metric notifications from other agents."""
        
        try:
            payload = message.payload
            metric_type = payload.get('metric_type')
            
            if metric_type == "coordinator_performance":
                self._store_coordinator_metrics(payload)
            elif metric_type == "knowledge_performance":
                self._store_knowledge_metrics(payload)
            elif metric_type == "response_performance":
                self._store_response_metrics(payload)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error handling metrics notification: {e}")
            return False
    
    def _store_coordinator_metrics(self, payload: Dict[str, Any]):
        """Store coordinator performance metrics."""
        
        timestamp = datetime.now()
        
        self.system_metrics['coordinator_active_workflows'].append((timestamp, payload.get('active_workflows', 0)))
        self.system_metrics['coordinator_success_rate'].append((timestamp, payload.get('success_rate', 0)))
        self.system_metrics['coordinator_completed'].append((timestamp, payload.get('completed_workflows', 0)))
        self.system_metrics['coordinator_failed'].append((timestamp, payload.get('failed_workflows', 0)))
    
    def _store_knowledge_metrics(self, payload: Dict[str, Any]):
        """Store knowledge agent performance metrics."""
        
        timestamp = datetime.now()
        
        self.system_metrics['knowledge_lookups'].append((timestamp, payload.get('lookup_count', 0)))
        self.system_metrics['knowledge_cache_hits'].append((timestamp, payload.get('cache_hits', 0)))
        self.system_metrics['knowledge_cache_rate'].append((timestamp, payload.get('cache_hit_rate', 0)))
    
    def _store_response_metrics(self, payload: Dict[str, Any]):
        """Store response agent performance metrics."""
        
        timestamp = datetime.now()
        
        self.system_metrics['response_count'].append((timestamp, payload.get('responses_generated', 0)))
        self.system_metrics['response_avg_length'].append((timestamp, payload.get('average_response_length', 0)))
    
    async def _analyze_performance_trends(self):
        """Analyze performance trends across the system."""
        
        # Calculate trends for key metrics
        trends = {}
        
        for metric_name, metric_data in self.system_metrics.items():
            if len(metric_data) >= 2:
                recent_values = [value for _, value in list(metric_data)[-10:]]  # Last 10 values
                if recent_values:
                    avg_value = sum(recent_values) / len(recent_values)
                    trends[metric_name] = {
                        "current_value": recent_values[-1],
                        "average_value": avg_value,
                        "trend": "increasing" if recent_values[-1] > avg_value else "decreasing"
                    }
        
        self.performance_trends = trends
    
    async def _generate_quality_insights(self):
        """Generate insights from quality assessments."""
        
        if not self.quality_assessments:
            return
        
        # Recent assessments (last hour)
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_assessments = [
            assessment for assessment in self.quality_assessments
            if datetime.fromisoformat(assessment['timestamp']) > one_hour_ago
        ]
        
        if recent_assessments:
            avg_quality = sum(assessment['quality_score']['overall_score'] for assessment in recent_assessments) / len(recent_assessments)
            
            # Update quality trends
            self.system_metrics['quality_score'].append((datetime.now(), avg_quality))
            
            logger.info(f"📊 Quality insights: {len(recent_assessments)} assessments, avg score: {avg_quality:.3f}")
    
    async def _check_alerts(self):
        """Check for system alerts based on thresholds."""
        
        current_alerts = []
        
        # Check success rate
        if 'coordinator_success_rate' in self.system_metrics:
            recent_success_rates = [value for _, value in list(self.system_metrics['coordinator_success_rate'])[-5:]]
            if recent_success_rates:
                avg_success_rate = sum(recent_success_rates) / len(recent_success_rates)
                if avg_success_rate < self.alert_thresholds['success_rate_min']:
                    current_alerts.append({
                        "type": "success_rate_low",
                        "message": f"Success rate ({avg_success_rate:.2%}) below threshold ({self.alert_thresholds['success_rate_min']:.2%})",
                        "severity": "high",
                        "timestamp": datetime.now().isoformat()
                    })
        
        # Check quality scores
        if 'quality_score' in self.system_metrics:
            recent_quality_scores = [value for _, value in list(self.system_metrics['quality_score'])[-5:]]
            if recent_quality_scores:
                avg_quality = sum(recent_quality_scores) / len(recent_quality_scores)
                if avg_quality < self.alert_thresholds['quality_score_min']:
                    current_alerts.append({
                        "type": "quality_score_low",
                        "message": f"Quality score ({avg_quality:.3f}) below threshold ({self.alert_thresholds['quality_score_min']:.3f})",
                        "severity": "medium",
                        "timestamp": datetime.now().isoformat()
                    })
        
        # Update alerts
        self.alerts = current_alerts
        
        # Log alerts
        for alert in current_alerts:
            logger.warning(f"🚨 Alert: {alert['message']}")
    
    async def _generate_reports(self):
        """Generate periodic system reports."""
        
        # Generate summary report
        report = {
            "system_health": "healthy" if not self.alerts else "issues_detected",
            "active_alerts": len(self.alerts),
            "metrics_collected": len(self.system_metrics),
            "quality_assessments": len(self.quality_assessments),
            "latest_trends": self.performance_trends,
            "timestamp": datetime.now().isoformat()
        }
        
        self.latest_analysis = report
        
        logger.info(f"📊 System report generated: {report['system_health']}, {report['active_alerts']} alerts")
    
    def _get_current_metrics(self) -> Dict[str, Any]:
        """Get current system metrics summary."""
        
        current_metrics = {}
        
        for metric_name, metric_data in self.system_metrics.items():
            if metric_data:
                latest_timestamp, latest_value = metric_data[-1]
                current_metrics[metric_name] = {
                    "value": latest_value,
                    "timestamp": latest_timestamp.isoformat(),
                    "data_points": len(metric_data)
                }
        
        return current_metrics
    
    def _get_quality_summary(self) -> Dict[str, Any]:
        """Get quality assessment summary."""
        
        if not self.quality_assessments:
            return {"message": "No quality assessments available"}
        
        recent_assessments = self.quality_assessments[-50:]  # Last 50 assessments
        
        scores = [assessment['quality_score']['overall_score'] for assessment in recent_assessments]
        
        return {
            "total_assessments": len(self.quality_assessments),
            "recent_assessments": len(recent_assessments),
            "average_score": sum(scores) / len(scores) if scores else 0,
            "highest_score": max(scores) if scores else 0,
            "lowest_score": min(scores) if scores else 0,
            "assessments_above_threshold": len([s for s in scores if s >= 0.7]),
            "quality_distribution": {
                "excellent": len([s for s in scores if s >= 0.9]),
                "good": len([s for s in scores if 0.7 <= s < 0.9]),
                "needs_improvement": len([s for s in scores if s < 0.7])
            }
        }
    
    def _get_performance_trends(self) -> Dict[str, Any]:
        """Get performance trends summary."""
        
        return self.performance_trends
```

## 🔧 Step 4: System Orchestration

### 4.1 Main System Controller

Create `main.py`:

```python
"""
Autonomous Customer Support System
Main orchestration script for running the multi-agent system.
"""

import asyncio
import signal
import sys
from datetime import datetime
from typing import Dict, Any
import logging
from dotenv import load_dotenv

# Sprint Lens imports
import sprintlens

# Import agents
from agents.coordinator.coordinator_agent import CoordinatorAgent
from agents.knowledge.knowledge_agent import KnowledgeAgent
from agents.response.response_agent import ResponseAgent
from agents.analytics.analytics_agent import AnalyticsAgent

# Import communication infrastructure
from shared.communication.message_bus import message_bus

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AutonomousCustomerSupportSystem:
    """
    Main system controller for the autonomous customer support system.
    """
    
    def __init__(self):
        self.agents = {}
        self.system_running = False
        self.startup_time = None
        
        # Configure Sprint Lens
        self._configure_sprintlens()
    
    def _configure_sprintlens(self):
        """Configure Sprint Lens for system-wide observability."""
        
        sprintlens.configure(
            url=os.getenv('SPRINTLENS_URL', 'http://localhost:3000'),
            username=os.getenv('SPRINTLENS_USERNAME', 'admin'),
            password=os.getenv('SPRINTLENS_PASSWORD', 'MasterAdmin2024!'),
            project_name=os.getenv('SPRINTLENS_PROJECT_NAME', 'autonomous-customer-support')
        )
        
        logger.info("✅ Sprint Lens configured for autonomous system")
    
    @sprintlens.track(
        name="system-initialization",
        span_type="system",
        capture_output=True,
        tags={"system": "autonomous_customer_support", "version": "1.0.0"}
    )
    async def initialize_system(self) -> bool:
        """Initialize all agents and system components."""
        
        logger.info("🚀 Initializing Autonomous Customer Support System")
        
        try:
            # Start message bus
            logger.info("🚌 Starting message bus...")
            asyncio.create_task(message_bus.start())
            await asyncio.sleep(1)  # Give message bus time to start
            
            # Initialize agents
            agent_configs = {
                "coordinator": {},
                "knowledge": {},
                "response": {},
                "analytics": {}
            }
            
            # Create and initialize agents
            self.agents['coordinator'] = CoordinatorAgent(agent_configs['coordinator'])
            self.agents['knowledge'] = KnowledgeAgent(agent_configs['knowledge'])
            self.agents['response'] = ResponseAgent(agent_configs['response'])
            self.agents['analytics'] = AnalyticsAgent(agent_configs['analytics'])
            
            # Initialize each agent
            for agent_name, agent in self.agents.items():
                logger.info(f"🤖 Initializing {agent_name} agent...")
                success = await agent.initialize()
                if not success:
                    logger.error(f"❌ Failed to initialize {agent_name} agent")
                    return False
                logger.info(f"✅ {agent_name} agent initialized successfully")
            
            self.startup_time = datetime.now()
            logger.info("🎉 System initialization completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ System initialization failed: {e}")
            return False
    
    @sprintlens.track(
        name="system-startup",
        span_type="system",
        capture_output=True,
        tags={"operation": "startup"}
    )
    async def start_system(self):
        """Start all agents and begin autonomous operation."""
        
        logger.info("🚀 Starting autonomous operation for all agents")
        
        try:
            # Start autonomous operation for each agent
            tasks = []
            
            for agent_name, agent in self.agents.items():
                logger.info(f"▶️ Starting autonomous operation for {agent_name}")
                task = asyncio.create_task(
                    agent.start_autonomous_operation(),
                    name=f"{agent_name}_autonomous_operation"
                )
                tasks.append(task)
            
            self.system_running = True
            logger.info("✅ All agents started successfully")
            
            # Wait for all agents to complete (or until shutdown)
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            logger.error(f"❌ Error during system operation: {e}")
        finally:
            self.system_running = False
    
    @sprintlens.track(
        name="customer-request-handling",
        span_type="request",
        capture_input=True,
        capture_output=True,
        tags={"system": "autonomous_customer_support"}
    )
    async def handle_customer_request(self, customer_message: str, 
                                     customer_id: str = "test-customer",
                                     priority: int = 5) -> Dict[str, Any]:
        """
        Handle a customer support request through the autonomous system.
        
        Args:
            customer_message (str): Customer's message/question
            customer_id (str): Customer identifier
            priority (int): Priority level (1=highest, 10=lowest)
            
        Returns:
            Dict[str, Any]: Complete response from the system
        """
        
        if not self.system_running:
            return {
                "success": False,
                "error": "System is not running",
                "timestamp": datetime.now().isoformat()
            }
        
        logger.info(f"📨 Handling customer request from {customer_id}: {customer_message[:100]}...")
        
        try:
            # Send request to coordinator
            coordinator = self.agents.get('coordinator')
            if not coordinator:
                raise Exception("Coordinator agent not available")
            
            # Prepare request payload
            request_payload = {
                "message": customer_message,
                "customer_id": customer_id,
                "priority": priority,
                "context": {
                    "timestamp": datetime.now().isoformat(),
                    "system_version": "1.0.0"
                }
            }
            
            # Send request and wait for response
            response = await coordinator.send_request_and_wait(
                to_agent="coordinator-001",  # Send to itself for processing
                payload=request_payload,
                timeout=120  # 2 minute timeout
            )
            
            if response:
                logger.info(f"✅ Customer request processed successfully for {customer_id}")
                return {
                    "success": True,
                    "customer_id": customer_id,
                    "response_data": response,
                    "processing_time": response.get('processing_time', 0),
                    "timestamp": datetime.now().isoformat()
                }
            else:
                logger.error(f"❌ No response received for customer {customer_id}")
                return {
                    "success": False,
                    "error": "No response from system",
                    "customer_id": customer_id,
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Error handling customer request: {e}")
            return {
                "success": False,
                "error": str(e),
                "customer_id": customer_id,
                "timestamp": datetime.now().isoformat()
            }
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status."""
        
        status = {
            "system_running": self.system_running,
            "startup_time": self.startup_time.isoformat() if self.startup_time else None,
            "uptime_seconds": (datetime.now() - self.startup_time).total_seconds() if self.startup_time else 0,
            "agents": {},
            "message_bus_stats": message_bus.get_stats(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Get status from each agent
        for agent_name, agent in self.agents.items():
            try:
                agent_status = agent.get_health_status()
                status["agents"][agent_name] = agent_status
            except Exception as e:
                status["agents"][agent_name] = {
                    "error": str(e),
                    "status": "unknown"
                }
        
        return status
    
    @sprintlens.track(
        name="system-shutdown",
        span_type="system",
        capture_output=True,
        tags={"operation": "shutdown"}
    )
    async def shutdown_system(self):
        """Gracefully shutdown the entire system."""
        
        logger.info("🛑 Shutting down Autonomous Customer Support System")
        
        try:
            # Shutdown all agents
            for agent_name, agent in self.agents.items():
                logger.info(f"🛑 Shutting down {agent_name} agent")
                await agent.shutdown()
            
            # Stop message bus
            logger.info("🛑 Stopping message bus")
            await message_bus.stop()
            
            self.system_running = False
            logger.info("✅ System shutdown completed")
            
        except Exception as e:
            logger.error(f"❌ Error during system shutdown: {e}")


# System instance
autonomous_system = AutonomousCustomerSupportSystem()

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals."""
    logger.info(f"📡 Received signal {signum}, initiating shutdown...")
    asyncio.create_task(autonomous_system.shutdown_system())
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

async def main():
    """Main function to run the autonomous system."""
    
    logger.info("🌟 Starting Autonomous Customer Support System")
    
    # Initialize system
    success = await autonomous_system.initialize_system()
    if not success:
        logger.error("❌ Failed to initialize system")
        return
    
    # Start system (this will run indefinitely)
    await autonomous_system.start_system()

# Demo function for testing
async def demo_system():
    """Demo function to test the autonomous system."""
    
    logger.info("🎭 Starting Autonomous System Demo")
    
    # Initialize and start system
    await autonomous_system.initialize_system()
    
    # Start system in background
    system_task = asyncio.create_task(autonomous_system.start_system())
    
    # Wait for system to be ready
    await asyncio.sleep(5)
    
    # Test customer requests
    test_requests = [
        ("I can't log into my account. Can you help?", "customer-001"),
        ("What are your payment options?", "customer-002"),
        ("I'm having technical issues with the app", "customer-003"),
        ("How do I get a refund?", "customer-004"),
        ("What features are included in the pro plan?", "customer-005")
    ]
    
    logger.info("🧪 Testing customer requests...")
    
    for i, (message, customer_id) in enumerate(test_requests, 1):
        logger.info(f"\n📋 Test {i}/{len(test_requests)}: {message}")
        
        try:
            result = await autonomous_system.handle_customer_request(message, customer_id)
            
            if result['success']:
                response_data = result['response_data']
                if response_data and response_data.get('result'):
                    response_text = response_data['result'].get('response_result', {}).get('response', 'No response generated')
                    logger.info(f"✅ Response: {response_text[:200]}...")
                    logger.info(f"⏱️ Processing time: {result.get('processing_time', 0):.2f}s")
                else:
                    logger.warning("⚠️ No response data available")
            else:
                logger.error(f"❌ Request failed: {result.get('error', 'Unknown error')}")
        
        except Exception as e:
            logger.error(f"💥 Test error: {e}")
        
        # Wait between requests
        await asyncio.sleep(2)
    
    # Get system status
    logger.info("\n📊 System Status:")
    status = await autonomous_system.get_system_status()
    logger.info(f"System Running: {status['system_running']}")
    logger.info(f"Uptime: {status['uptime_seconds']:.1f} seconds")
    logger.info(f"Active Agents: {len([name for name, agent in status['agents'].items() if agent.get('is_healthy', False)])}")
    
    # Shutdown system
    logger.info("\n🛑 Demo completed, shutting down system...")
    await autonomous_system.shutdown_system()
    
    # Cancel system task
    system_task.cancel()
    
    logger.info("🎉 Demo completed successfully!")

if __name__ == "__main__":
    import os
    
    # Check if running in demo mode
    if os.getenv('DEMO_MODE', 'false').lower() == 'true':
        asyncio.run(demo_system())
    else:
        asyncio.run(main())
```

## 🔧 Step 5: Testing the Autonomous System

### 5.1 Create Test Script

Create `test_autonomous_system.py`:

```python
"""
Test script for the Autonomous Customer Support System.
"""

import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv

# Import main system
from main import autonomous_system

# Load environment
load_dotenv()

async def test_system():
    """Test the autonomous customer support system."""
    
    print("🧪 Testing Autonomous Customer Support System")
    print("=" * 60)
    
    # Initialize system
    print("\n🚀 Initializing system...")
    success = await autonomous_system.initialize_system()
    
    if not success:
        print("❌ System initialization failed")
        return
    
    print("✅ System initialized successfully")
    
    # Start system
    print("\n▶️ Starting autonomous operation...")
    system_task = asyncio.create_task(autonomous_system.start_system())
    
    # Wait for system to be ready
    await asyncio.sleep(3)
    
    # Test requests
    test_cases = [
        {
            "message": "I forgot my password and can't log in",
            "customer_id": "test-001",
            "expected_category": "technical_support"
        },
        {
            "message": "Can you tell me about your billing options?",
            "customer_id": "test-002", 
            "expected_category": "billing_inquiry"
        },
        {
            "message": "How does your platform work?",
            "customer_id": "test-003",
            "expected_category": "general_inquiry"
        }
    ]
    
    print(f"\n🧪 Running {len(test_cases)} test cases...")
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test Case {i}: {test_case['message']}")
        print("-" * 50)
        
        start_time = datetime.now()
        
        result = await autonomous_system.handle_customer_request(
            customer_message=test_case['message'],
            customer_id=test_case['customer_id']
        )
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        if result['success']:
            print(f"✅ Request processed successfully")
            print(f"⏱️ Total processing time: {processing_time:.2f}s")
            
            # Extract response details
            response_data = result.get('response_data', {})
            if response_data:
                print(f"🎯 Category: {response_data.get('workflow_type', 'unknown')}")
                
                # Get final response if available
                result_data = response_data.get('result', {})
                if result_data and result_data.get('response_result'):
                    final_response = result_data['response_result'].get('response', 'No response')
                    print(f"💬 Response: {final_response[:150]}...")
                
        else:
            print(f"❌ Request failed: {result.get('error', 'Unknown error')}")
        
        # Brief pause between tests
        await asyncio.sleep(1)
    
    # Get system status
    print(f"\n📊 System Status Check...")
    status = await autonomous_system.get_system_status()
    
    print(f"System Running: {status['system_running']}")
    print(f"Uptime: {status['uptime_seconds']:.1f} seconds")
    
    healthy_agents = 0
    for agent_name, agent_status in status['agents'].items():
        is_healthy = agent_status.get('is_healthy', False)
        print(f"  {agent_name}: {'✅ Healthy' if is_healthy else '❌ Unhealthy'}")
        if is_healthy:
            healthy_agents += 1
    
    print(f"Healthy Agents: {healthy_agents}/{len(status['agents'])}")
    
    # Message bus stats
    bus_stats = status.get('message_bus_stats', {})
    print(f"Messages Sent: {bus_stats.get('messages_sent', 0)}")
    print(f"Messages Delivered: {bus_stats.get('messages_delivered', 0)}")
    print(f"Connected Agents: {bus_stats.get('agents_connected', 0)}")
    
    # Shutdown
    print(f"\n🛑 Shutting down system...")
    await autonomous_system.shutdown_system()
    system_task.cancel()
    
    print("🎉 Test completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_system())
```

### 5.2 Run the Tests

```bash
# Run the autonomous system test
python test_autonomous_system.py
```

### 5.3 Run Demo Mode

```bash
# Set demo mode and run
DEMO_MODE=true python main.py
```

You should see output like:

```
🌟 Starting Autonomous Customer Support System
🚀 Initializing Autonomous Customer Support System
🚌 Starting message bus...
🤖 Initializing coordinator agent...
📋 Coordinator initialized with 3 workflow templates
✅ coordinator agent initialized successfully
🤖 Initializing knowledge agent...
📚 Knowledge agent initialized with 3 knowledge categories
✅ knowledge agent initialized successfully
🤖 Initializing response agent...
💬 Response agent initialized
✅ response agent initialized successfully
🤖 Initializing analytics agent...
📊 Analytics agent initialized
✅ analytics agent initialized successfully
🎉 System initialization completed successfully

🧪 Testing customer requests...

📋 Test 1/5: I can't log into my account. Can you help?
🔍 Processing query #1: 'I can't log into my account. Can you help?' for user: customer-001
🔄 Executing technical_support workflow for request req_1759467234_customer-001
📨 Agent coordinator-001 received message from knowledge-001
✅ Response: Thank you for contacting us! Based on your question, here's what I can help you with: If you can't log in, try resetting your password or clearing your browser cache
⏱️ Processing time: 2.34s
```

## 🔧 Step 6: Verify Complete System Integration

### 6.1 Check Sprint Lens Dashboard

1. **Open Dashboard**: [http://localhost:3000](http://localhost:3000)

2. **Navigate to Project**: 
   - Go to **Projects** → **"autonomous-customer-support"**
   - Click on **"Traces"** tab

3. **Verify Distributed Tracing**:
   You should see complex trace hierarchies like:
   ```
   📊 customer-request-handling (main trace)
   ├── 🤖 coordinator-autonomous-operation
   │   ├── 🔄 workflow-execution
   │   │   ├── 🧠 knowledge-request
   │   │   ├── 💬 response-generation-request
   │   │   └── 📊 quality-assessment-request
   │   └── 📈 performance-monitoring
   ├── 🧠 knowledge-lookup
   │   ├── 🔍 knowledge-retrieval
   │   └── 🔄 knowledge-synthesis
   ├── 💬 response-generation
   │   ├── 📝 main-response-creation
   │   └── 🎨 response-formatting
   └── 📊 response-quality-assessment
       └── 🧮 quality-score-calculation
   ```

4. **Check A2A Communication**:
   - Look for spans tagged with "communication"
   - Verify message passing between agents
   - Check correlation IDs across agent boundaries

### 6.2 System Monitoring

Check that you can see:
- **Real-time agent health status**
- **Message bus statistics**
- **Quality assessment scores**
- **Performance metrics**
- **Error tracking and alerts**

## 🎉 Summary

You've successfully built a sophisticated **Autonomous Multi-Agent System** with:

### ✅ What You Accomplished

1. **✅ Multi-Agent Architecture**
   - Coordinator for orchestration
   - Knowledge agent for information retrieval
   - Response agent for customer communications
   - Analytics agent for monitoring and quality

2. **✅ Agent-to-Agent Communication**
   - Robust message bus with retry logic
   - Correlation tracking across agents
   - Distributed request-response patterns
   - Autonomous coordination protocols

3. **✅ Complete Observability**
   - Distributed tracing across all agents
   - Inter-agent communication tracking
   - Performance monitoring and analytics
   - Quality assessment and scoring

4. **✅ Autonomous Operation**
   - Self-directed agent behavior
   - Automatic workflow coordination
   - Health monitoring and alerting
   - Adaptive performance optimization

5. **✅ Production-Ready Features**
   - Graceful error handling and recovery
   - System health monitoring
   - Scalable message passing
   - Comprehensive logging and debugging

### 🎯 Next Steps

Now that you have autonomous agents working, you can:

1. **Create GenAI LLM Prompts** → [10-genai-llm-prompts.md](./10-genai-llm-prompts.md)
2. **Explore Advanced Features** → [11-advanced-features.md](./11-advanced-features.md)
3. **Build UI Applications** → [12-ui-application-build.md](./12-ui-application-build.md)

### 📊 Verify Your Implementation

**Sprint Lens Dashboard**: [http://localhost:3000](http://localhost:3000)
- 🔍 **Distributed Traces**: Complex multi-agent workflows
- 📊 **Analytics**: Agent performance and quality metrics  
- 🎯 **Project**: "autonomous-customer-support"
- 📈 **Real-time**: Live agent status and communication

---

**Congratulations!** 🎉 You've built a production-ready autonomous multi-agent system with complete observability, A2A communication, and distributed coordination using Sprint Lens SDK.
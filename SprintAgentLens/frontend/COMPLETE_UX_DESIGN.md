# AgentLens - Complete UX Design Specification

## Design Overview

AgentLens is an enterprise-grade AI observability platform designed with a **Sage Garden** aesthetic - professional yet approachable, combining muted greens and slate blues to create a calm, focused environment for technical users monitoring AI systems.

---

## Design System Foundation

### Color Palette
```css
/* Primary Colors - Professional Slate Blue */
Primary: #5C7285 (Headers, primary actions, key indicators)
Primary Light: #6B829A (Hover states)
Primary Dark: #4A5F73 (Active states)

/* Secondary Colors - Sage Green */
Secondary: #818C78 (Secondary actions, borders)
Secondary Light: #94A08F (Subtle backgrounds)
Secondary Dark: #6E7865 (Emphasized borders)

/* Accent Colors - Light Sage */
Accent: #A7B49E (Success states, highlights)
Accent Light: #B8C4B1 (Subtle highlights)
Accent Dark: #96A28B (Active success states)

/* Background Colors - Warm Cream */
Background: #E2E0C8 (Page background)
Card Background: #FFFFFF (Card/panel backgrounds)
Background Light: #EBEADB (Subtle variations)
```

### Typography
- **Font Family**: Inter (Google Fonts)
- **Heading Hierarchy**: Bold weights for h1-h3, medium for h4-h6
- **Body Text**: Regular weight, good line height for readability
- **Code/Data**: Monospace font for technical content

### Component Library
- **Buttons**: Rounded corners, clear hover/active states
- **Cards**: Clean white backgrounds with subtle shadows
- **Tables**: Zebra striping, sortable headers, responsive
- **Forms**: Clear labels, validation states, helper text
- **Navigation**: Icon + text, collapsible sidebar

---

## 1. Application Architecture & Navigation

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Top Header Bar                                              │
│ [Logo] [Project Selector] [User Menu] [Notifications]      │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│   Sidebar   │           Main Content Area                   │
│ Navigation  │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

### Sidebar Navigation Design
**Collapsed State (60px wide)**
```
┌─────┐
│ [≡] │ <- Menu toggle
├─────┤
│ [□] │ <- Dashboard icon
│ [📁] │ <- Projects icon  
│ [🤖] │ <- Agents icon
│ [🔗] │ <- Traces icon
│ [💬] │ <- Prompts icon
│ [⚗️] │ <- Experiments icon
│ [🗃️] │ <- Datasets icon
│ [⚙️] │ <- Settings icon
├─────┤
│ ADM │ <- Admin section
├─────┤
│ [👥] │ <- Users icon
│ [🏢] │ <- Departments icon
│ [⭐] │ <- Priorities icon
│ [👍] │ <- Feedback icon
│ [🖥️] │ <- Providers icon
│ [📊] │ <- Analytics icon
└─────┘
```

**Expanded State (240px wide)**
```
┌─────────────────────────┐
│ [≡] AgentLens          │ <- Logo + name
├─────────────────────────┤
│ [□] Dashboard           │
│ [📁] Projects           │
│ [🤖] Agents             │
│ [🔗] Distributed Traces │
│ [💬] Prompts            │
│ [⚗️] Experiments        │
│ [🗃️] Datasets           │
│ [⚙️] Settings           │
├─────────────────────────┤
│ Administration          │
├─────────────────────────┤
│ [👥] User Management    │
│ [🏢] Departments        │
│ [⭐] Business Priorities│
│ [👍] Feedback Definitions│
│ [🖥️] LLM Providers     │
│ [📊] Analytics          │
└─────────────────────────┘
```

### Top Header Bar
```
┌─────────────────────────────────────────────────────────────┐
│ [AgentLens Logo] [Project: Customer Support ▼] [🔔] [👤]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Dashboard Design

### Main Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Welcome back, Alex • Last login: 2 hours ago               │
├─────────────────────────────────────────────────────────────┤
│                    Quick Stats                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │  1,247  │ │   96%   │ │ 1.2s    │ │ $47.23  │           │
│ │ Active  │ │Success  │ │ Avg     │ │ Today   │           │
│ │Converse │ │  Rate   │ │Response │ │  Cost   │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                     Recent Projects                        │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Customer Support│ │   Content Gen   │ │  Data Analysis  │ │
│ │ ● Active        │ │ ● Active        │ │ ⚠ Warning       │ │
│ │ 847 convos      │ │ 234 convos      │ │ 45 convos       │ │
│ │ $23.45 today    │ │ $12.78 today    │ │ $8.90 today     │ │
│ │ [View Project] │ │ [View Project] │ │ [View Project] │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [+ Create New Project]  [Import Data]  [View All Projects] │
└─────────────────────────────────────────────────────────────┘
```

### Project Grid Cards
**Project Card Design**
```
┌─────────────────────────────────────────┐
│ [●] Customer Support                    │ <- Status indicator
│ ─────────────────────────────────────── │
│ Department: Customer Success            │
│ Priority: High ⭐⭐⭐                      │
│ Security: Enterprise 🔒                 │
│                                         │
│ 📊 847 conversations today             │
│ 🤖 3 active agents                     │
│ ⏱️ 1.2s avg response time              │
│ 💰 $23.45 cost today                   │
│                                         │
│ Last activity: 5 minutes ago           │
│ ─────────────────────────────────────── │
│ [View Details] [Manage] [Settings]     │
└─────────────────────────────────────────┘
```

---

## 3. Project Dashboard Design

### Project Overview Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Customer Support Project                                    │
│ ─────────────────────────────────────────────────────────── │
│ [Overview] [Agents] [Prompts] [Metrics] [Traces]          │
│ [Conversations] [Datasets] [Evaluations] [Experiments]     │
│ [Rules] [Settings]                                          │
├─────────────────────────────────────────────────────────────┤
│                    Performance Overview                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │  847    │ │  96.2%  │ │  1.2s   │ │  $47.23 │           │
│ │ Convos  │ │ Success │ │ Response│ │ Cost    │           │
│ │ Today   │ │ Rate    │ │ Time    │ │ Today   │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                      Activity Charts                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │    Conversations Over Time (24h)                       │ │
│ │ 100 ┌─────┐                                            │ │
│ │  80 │     │ ┌─────┐                                    │ │
│ │  60 │     │ │     │ ┌─────┐                            │ │
│ │  40 │     │ │     │ │     │ ┌─────┐                    │ │
│ │  20 │     │ │     │ │     │ │     │ ┌─────┐            │ │
│ │   0 └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │ │
│ │     00:00   06:00   12:00   18:00   24:00              │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Active Agents                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Agent Name        Status    Conversations  Response    │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Support Bot v2.1  ● Active        847      1.2s       │ │
│ │ Escalation Agent  ● Active         23      2.1s       │ │
│ │ FAQ Assistant     ● Active        156      0.8s       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Conversation Management Interface

### Conversation Table Design
```
┌─────────────────────────────────────────────────────────────┐
│ Conversations (847 total)                                   │
│ ─────────────────────────────────────────────────────────── │
│ [🔍] Search conversations...     [Filters ▼] [Export ▼]    │
├─────────────────────────────────────────────────────────────┤
│ ☐ Input/Output          Agent    Status  Time  Cost  Score │
│ ─────────────────────────────────────────────────────────── │
│ ☐ "How do I reset my..." Support  ● Success 1.2s $0.03 ⭐⭐⭐⭐ │
│   "To reset your pass..." Bot                               │
│ ─────────────────────────────────────────────────────────── │
│ ☐ "I can't access my..." Support  ● Success 2.1s $0.05 ⭐⭐⭐   │
│   "I can help you acc..." Bot                               │
│ ─────────────────────────────────────────────────────────── │
│ ☐ "What are your hour..." FAQ     ● Success 0.8s $0.02 ⭐⭐⭐⭐⭐ │
│   "Our customer servi..." Agent                             │
│ ─────────────────────────────────────────────────────────── │
│ ☐ "I need help with b..." Support  ⚠ Timeout 5.0s $0.08 ⭐⭐   │
│   "Let me connect you..." Bot                               │
├─────────────────────────────────────────────────────────────┤
│ ☐ Select All  [+ Add to Dataset] [🏷️ Tag] [📤 Export]      │
│ ← Previous   1 2 3 ... 34   Next →                         │
└─────────────────────────────────────────────────────────────┘
```

### Conversation Detail Modal
```
┌─────────────────────────────────────────────────────────────┐
│ ✕ Conversation Detail                            [Export ▼] │
├─────────────────────────────────────────────────────────────┤
│ Thread ID: conv_12345678 • Created: Oct 2, 2024 2:34 PM   │
│ Agent: Support Bot v2.1 • Model: gpt-4o-mini               │
├─────────────────────────────────────────────────────────────┤
│                    Message Thread                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👤 User (2:34 PM)                                      │ │
│ │ How do I reset my password? I forgot it and can't      │ │
│ │ log into my account.                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 Support Bot (2:34 PM) • 1.2s • $0.03               │ │
│ │ I can help you reset your password. Here are the       │ │
│ │ steps:                                                  │ │
│ │ 1. Go to the login page                                │ │
│ │ 2. Click "Forgot Password"                             │ │
│ │ 3. Enter your email address                            │ │
│ │ 4. Check your email for reset instructions             │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                       Metadata                             │
│ Token Usage: 45 input, 87 output (132 total)              │
│ Response Time: 1.2s • Cost: $0.032                        │
│ Model: gpt-4o-mini • Temperature: 0.7                      │
│ ─────────────────────────────────────────────────────────── │
│ Quality Score: ⭐⭐⭐⭐ (4.2/5) • User Feedback: 👍          │
│ Tags: password-reset, helpful, quick-response              │
├─────────────────────────────────────────────────────────────┤
│ [👍 Helpful] [👎 Not Helpful] [🏷️ Add Tags] [📊 Analyze]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Distributed Tracing Interface

### Trace Tree Visualization
```
┌─────────────────────────────────────────────────────────────┐
│ Distributed Trace: trace_abc123                            │
│ Duration: 3.4s • Spans: 12 • Services: 4                  │
├─────────────────────────────────────────────────────────────┤
│ Service Map View | Timeline View | [Tree View] | Table View │
├─────────────────────────────────────────────────────────────┤
│                    Trace Timeline                          │
│ 0s    0.5s   1.0s   1.5s   2.0s   2.5s   3.0s   3.5s     │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ │ │ <- Main request
│ │   ■■■■■■■■■■■■■■■■                               │ │ <- Auth service
│ │     ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■             │ │ <- Core agent
│ │       ■■■■■■■■■■■■■■■■■■                         │ │ <- LLM call
│ │         ■■■■■■■■■■                               │ │ <- Knowledge base
│ │           ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ │ │ <- Response gen
│ │             ■■■■■■■■■■■■                         │ │ <- Logging
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Span Hierarchy                          │
│ ▼ 🌐 http-request (3.4s) • user-service                   │
│   ▼ 🔐 authenticate (0.8s) • auth-service                 │
│     • validate-token (0.3s) • auth-service                │
│     • check-permissions (0.5s) • auth-service             │
│   ▼ 🤖 process-conversation (2.1s) • agent-service        │
│     ▼ 🧠 llm-call (1.2s) • llm-service                   │
│       • prompt-prep (0.1s) • agent-service                │
│       • openai-request (1.0s) • external                  │
│       • response-parse (0.1s) • agent-service             │
│     • knowledge-lookup (0.6s) • knowledge-service         │
│     • response-format (0.3s) • agent-service              │
│   • audit-log (0.5s) • logging-service                    │
└─────────────────────────────────────────────────────────────┘
```

### Service Dependency Graph
```
┌─────────────────────────────────────────────────────────────┐
│ Service Dependencies                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ┌─────────────┐                                         │
│     │ User Portal │ ──────┐                                 │
│     └─────────────┘       │                                 │
│                           │                                 │
│                           ▼                                 │
│                    ┌─────────────┐                          │
│                    │Auth Service │ ● 99.9% uptime          │
│                    └─────────────┘                          │
│                           │                                 │
│                           ▼                                 │
│     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│     │Agent Service│ │   Gateway   │ │Log Service  │         │
│     │● Healthy    │ │● Healthy    │ │● Healthy    │         │
│     └─────────────┘ └─────────────┘ └─────────────┘         │
│           │               │               │                 │
│           ▼               ▼               ▼                 │
│     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│     │LLM Service  │ │Knowledge DB │ │Analytics DB │         │
│     │⚠ Degraded  │ │● Healthy    │ │● Healthy    │         │
│     └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                             │
│ Legend: ● Healthy  ⚠ Degraded  ❌ Down                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Prompt Engineering Interface

### Prompt Editor Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Prompt: Customer Support v2.1                              │
│ [Template] [Variables] [Test] [Settings] [Versions]        │
├─────────────────────────────────────────────────────────────┤
│ Template Editor                          │ Variables Panel  │
│ ┌─────────────────────────────────────┐  │ ┌─────────────┐  │
│ │ You are a helpful customer support  │  │ │{{user_name}}│  │
│ │ agent for {{company_name}}.         │  │ │   String    │  │
│ │                                     │  │ │   Required  │  │
│ │ User: {{user_message}}              │  │ └─────────────┘  │
│ │                                     │  │                  │
│ │ Guidelines:                         │  │ ┌─────────────┐  │
│ │ - Be polite and professional       │  │ │{{company}}  │  │
│ │ - Provide clear instructions       │  │ │   String    │  │
│ │ - If unsure, escalate to human     │  │ │   Default:  │  │
│ │                                     │  │ │   "Acme"    │  │
│ │ Respond helpfully to address the   │  │ └─────────────┘  │
│ │ user's {{issue_type}} concern.     │  │                  │
│ └─────────────────────────────────────┘  │ [+ Add Variable] │
├─────────────────────────────────────────────────────────────┤
│ [💾 Save] [▶️ Test] [📊 Analytics] [📋 Copy] [📤 Export]  │
└─────────────────────────────────────────────────────────────┘
```

### Prompt Testing Interface (Playground)
```
┌─────────────────────────────────────────────────────────────┐
│ Test Prompt: Customer Support v2.1                         │
├─────────────────────────────────────────────────────────────┤
│ Configuration            │ Chat Interface                   │
│ ┌─────────────────────┐  │ ┌─────────────────────────────┐  │
│ │ Provider: OpenAI    │  │ │ 🤖 System                  │  │
│ │ Model: gpt-4o-mini  │  │ │ You are a helpful customer │  │
│ │ Temperature: 0.7    │  │ │ support agent for Acme...  │  │
│ │ Max Tokens: 500     │  │ └─────────────────────────────┘  │
│ │ ───────────────────  │  │                                 │
│ │ Variables:          │  │ ┌─────────────────────────────┐  │
│ │ user_name: John     │  │ │ 👤 User                    │  │
│ │ company: Acme Corp  │  │ │ I can't reset my password  │  │
│ │ issue_type: login   │  │ │ and need help urgently!    │  │
│ └─────────────────────┘  │ └─────────────────────────────┘  │
│                          │                                 │
│ [🔄 Reset] [💾 Save]    │ ┌─────────────────────────────┐  │
│                          │ │ 🤖 Assistant               │  │
│                          │ │ Hi John! I'd be happy to   │  │
│                          │ │ help you reset your        │  │
│                          │ │ password. Here's what...   │  │
│                          │ │ ─────────────────────────── │  │
│                          │ │ ⏱️ 1.2s • 💰 $0.032 • 📊 87 tokens │
│                          │ └─────────────────────────────┘  │
│                          │ [Type your message...]          │
├─────────────────────────────────────────────────────────────┤
│ [📊 View Analytics] [💾 Save Conversation] [🔄 New Test]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Rules & Automation Interface

### Rules Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ Evaluation Rules                                            │
│ [Overview] [Rules] [Executions] [Metrics]                  │
├─────────────────────────────────────────────────────────────┤
│                    Rules Overview                           │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │  3,970  │ │  96.8%  │ │ 1,287ms │ │ $12.90  │           │
│ │ Execut  │ │ Success │ │ Avg     │ │ Total   │           │
│ │ Today   │ │ Rate    │ │ Time    │ │ Cost    │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                     Active Rules                           │
│ Rule Name              Status   Executions  Success  Cost  │
│ ─────────────────────────────────────────────────────────── │
│ 🧠 Hallucination Detect ● Active   1,247      96%   $2.34  │
│ 🛡️ Content Moderation   ● Active   2,156      99%   $8.67  │
│ 📊 Answer Relevance     ⏸️ Paused    567      99%   $1.89  │
│ 🎯 User Frustration     ● Active     423      94%   $1.12  │
│ ─────────────────────────────────────────────────────────── │
│ [+ Create Rule] [📊 View Analytics] [⚙️ Settings]         │
└─────────────────────────────────────────────────────────────┘
```

### Rule Configuration Interface
```
┌─────────────────────────────────────────────────────────────┐
│ ✕ Create New Rule                                          │
├─────────────────────────────────────────────────────────────┤
│ Rule Templates                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🧠 Hallucination Detection                              │ │
│ │ Automatically detect when AI generates false or        │ │
│ │ unsupported information using LLM evaluation.          │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Type: LLM Judge • Variables: input, output, context    │ │
│ │                                   [Use Template] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🛡️ Content Moderation                                  │ │
│ │ Flag inappropriate, harmful, or unsafe content in      │ │
│ │ conversations using safety guidelines.                  │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Type: LLM Judge • Variables: input, output             │ │
│ │                                   [Use Template] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 Answer Relevance                                     │ │
│ │ Evaluate how well AI responses address user questions   │ │
│ │ on a scale of 1-5 for helpfulness.                     │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Type: LLM Judge • Variables: input, output             │ │
│ │                                   [Use Template] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Custom Rule] [Cancel]                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Analytics & Metrics Dashboard

### Analytics Overview
```
┌─────────────────────────────────────────────────────────────┐
│ Analytics Dashboard                           📅 Last 24h ▼ │
├─────────────────────────────────────────────────────────────┤
│                   Performance Metrics                      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │ 1,247   │ │  96.2%  │ │  1.3s   │ │ $47.23  │           │
│ │ Convos  │ │ Success │ │ Avg     │ │ Total   │           │
│ │ +12%↗   │ │ +2.1%↗  │ │ -0.2s↘  │ │ +8.7%↗  │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                    Conversation Trends                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Volume │ 150 ┌───┐                                     │ │
│ │        │ 100 │   │ ┌───┐                               │ │
│ │        │  50 │   │ │   │ ┌───┐ ┌───┐                   │ │
│ │        │   0 └───┘ └───┘ └───┘ └───┘                   │ │
│ │        │   00:00  06:00  12:00  18:00                  │ │
│ │ Success│ 100%                                           │ │
│ │ Rate   │  80% ████████████████████████████████████████ │ │
│ │        │  60%                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Cost Analysis          │ Top Performing Agents             │
│ ┌─────────────────────┐ │ ┌─────────────────────────────────┐ │
│ │ 🔵 GPT-4o      50% │ │ │ Support Bot v2.1    847 convos │ │
│ │ 🟢 GPT-4o-mini 50% │ │ │ FAQ Assistant       234 convos │ │
│ │ ─────────────────── │ │ │ Escalation Agent     45 convos │ │
│ │ Total: $47.23      │ │ │ Sentiment Analyzer   23 convos │ │
│ │ Projected: $1,417  │ │ └─────────────────────────────────┘ │
│ └─────────────────────┘ │                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Dataset Management Interface

### Dataset Browser
```
┌─────────────────────────────────────────────────────────────┐
│ Datasets                                                    │
│ ─────────────────────────────────────────────────────────── │
│ [🔍] Search datasets...           [+ Create] [📥 Import]   │
├─────────────────────────────────────────────────────────────┤
│ Dataset Name              Items   Created      Last Updated │
│ ─────────────────────────────────────────────────────────── │
│ 📂 Customer Support QA    1,247   Oct 1, 2024  2 hours ago │
│ 📂 Product Documentation   856    Sep 28, 2024 1 day ago   │
│ 📂 FAQ Responses          423    Sep 25, 2024 3 days ago   │
│ 📂 Training Conversations 2,134   Sep 20, 2024 1 week ago  │
│ 📂 Evaluation Set         156    Sep 15, 2024 2 weeks ago  │
├─────────────────────────────────────────────────────────────┤
│ [View All] [Shared Datasets] [Archived]                    │
└─────────────────────────────────────────────────────────────┘
```

### Dataset Detail View
```
┌─────────────────────────────────────────────────────────────┐
│ 📂 Customer Support QA Dataset                             │
│ ─────────────────────────────────────────────────────────── │
│ Items: 1,247 • Created: Oct 1, 2024 • Size: 45.3 MB      │
│ Description: Curated Q&A pairs for customer support        │
│ [📝 Edit] [📥 Add Items] [📤 Export] [🗑️ Delete]          │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Items] [Quality] [Usage] [Annotations]         │
├─────────────────────────────────────────────────────────────┤
│                      Quality Metrics                       │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │  98.4%  │ │  94.7%  │ │  1,247  │ │   156   │           │
│ │Complete │ │Consisten│ │ Total   │ │ Needs   │           │
│ │ness     │ │   cy    │ │ Items   │ │ Review  │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                      Sample Items                          │
│ ID     Input                     Output            Quality  │
│ ─────────────────────────────────────────────────────────── │
│ #1247  "How do I reset my..."    "To reset your..." ⭐⭐⭐⭐⭐ │
│ #1246  "What are your hours?"    "Our customer..."  ⭐⭐⭐⭐⭐ │
│ #1245  "I can't login to..."     "I can help you..." ⭐⭐⭐⭐ │
│ #1244  "Where is my order?"      "Let me check..."   ⚠️Review │
├─────────────────────────────────────────────────────────────┤
│ [View All Items] [Add Items] [Export Selected]             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Experiments Interface

### Experiment Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ Experiments                                                 │
│ ─────────────────────────────────────────────────────────── │
│ [+ Create Experiment] [📊 View Results] [⚙️ Settings]      │
├─────────────────────────────────────────────────────────────┤
│ Status    Experiment Name         Progress    Results       │
│ ─────────────────────────────────────────────────────────── │
│ ▶️ Running A/B Test: Response Tone   ████ 67%   Pending    │
│ ✅ Complete GPT-4 vs GPT-4o Eval     ████ 100%  View ▶     │
│ ⏸️ Paused  Prompt Engineering Test   ██░░ 45%   Partial    │
│ 🕐 Queued  Hallucination Detection   ░░░░ 0%    Waiting    │
├─────────────────────────────────────────────────────────────┤
│                    Recent Results                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ GPT-4 vs GPT-4o Evaluation (Completed)                 │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Winner: GPT-4o (95% confidence)                        │ │
│ │ Success Rate: 97.3% vs 94.1% (+3.2%)                  │ │
│ │ Response Time: 1.1s vs 1.8s (-38.9%)                  │ │
│ │ Cost per Request: $0.032 vs $0.089 (-64.0%)           │ │
│ │ [View Details] [Apply Changes] [Export Data]           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Administration Interface

### User Management
```
┌─────────────────────────────────────────────────────────────┐
│ User Management                                             │
│ ─────────────────────────────────────────────────────────── │
│ [+ Add User] [📥 Import] [⚙️ Settings] [👥 Groups]         │
├─────────────────────────────────────────────────────────────┤
│ [🔍] Search users...              [Filters ▼] [Export ▼]   │
├─────────────────────────────────────────────────────────────┤
│ User                    Role       Department     Last Login │
│ ─────────────────────────────────────────────────────────── │
│ 👤 Alex Chen           Admin      Engineering    2 hrs ago  │
│ 👤 Sarah Johnson       Analyst    Product        1 day ago  │
│ 👤 Mike Rodriguez      Viewer     Customer Svc   3 days ago │
│ 👤 Emma Thompson       Admin      Data Science   1 week ago │
├─────────────────────────────────────────────────────────────┤
│                    Department Overview                     │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Engineering     │ │ Product         │ │ Customer Service│ │
│ │ 12 users        │ │ 8 users         │ │ 15 users        │ │
│ │ 3 admins        │ │ 2 admins        │ │ 1 admin         │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### System Settings
```
┌─────────────────────────────────────────────────────────────┐
│ System Settings                                             │
├─────────────────────────────────────────────────────────────┤
│ [General] [Security] [Integrations] [Billing] [Compliance] │
├─────────────────────────────────────────────────────────────┤
│ LLM Provider Configuration                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Provider        Status      Models     Health           │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ 🟢 OpenAI       Active      3 models   ● Healthy       │ │
│ │ 🟢 Anthropic    Active      2 models   ● Healthy       │ │
│ │ 🟡 Azure OpenAI Degraded    4 models   ⚠ Slow         │ │
│ │ 🔴 Google       Inactive    0 models   ❌ Error        │ │
│ │ [+ Add Provider] [Test All] [Health Check]             │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Data Retention & Compliance                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Conversation Data:    [90 days ▼]                      │ │
│ │ Trace Data:          [30 days ▼]                      │ │
│ │ Analytics Data:      [1 year ▼]                       │ │
│ │ PII Handling:        [🛡️ Mask sensitive data]         │ │
│ │ GDPR Compliance:     [✅ Enabled]                      │ │
│ │ [Save Changes] [Test Compliance]                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Mobile & Responsive Design

### Mobile Navigation (Collapsed)
```
┌─────────────────────┐
│ [≡] AgentLens  [🔔] │ <- Top bar
├─────────────────────┤
│                     │
│    🏠 Dashboard     │
│    📊 Quick Stats   │
│    ┌─────┐ ┌─────┐  │
│    │1,247│ │ 96% │  │
│    │Talks│ │Rate │  │
│    └─────┘ └─────┘  │
│                     │
│    📱 Recent        │
│    ┌─────────────┐  │
│    │Customer Svc │  │
│    │● Active     │  │
│    │847 convos   │  │
│    └─────────────┘  │
│                     │
│    [+ New Project]  │
│    [View All]       │
│                     │
└─────────────────────┘
```

### Tablet Layout (768px+)
```
┌─────────────────────────────────────────────────────────┐
│ [≡] AgentLens              [Customer Support ▼] [🔔]   │
├─────────────────────────────────────────────────────────┤
│                Quick Stats                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │  1,247  │ │   96%   │ │  1.2s   │ │ $47.23  │         │
│ │ Convos  │ │ Success │ │Response │ │  Cost   │         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
├─────────────────────────────────────────────────────────┤
│                Recent Activity                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 "How do I reset..." → 🤖 "I can help you..."    │ │
│ │ ⭐⭐⭐⭐ • 1.2s • Support Bot • 5 min ago             │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 "What are your hours..." → 🤖 "Our customer..." │ │
│ │ ⭐⭐⭐⭐⭐ • 0.8s • FAQ Bot • 12 min ago                │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [View Conversations] [Analytics] [Settings]             │
└─────────────────────────────────────────────────────────┘
```

---

## 13. Interaction Patterns

### Loading States
```
┌─────────────────────────────────────────────────────────────┐
│ Loading Conversations...                                    │
│ ─────────────────────────────────────────────────────────── │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│ │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │ <- Skeleton loader
│ │ ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│ │ ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
└─────────────────────────────────────────────────────────────┘
```

### Error States
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Unable to Load Conversations                             │
│ ─────────────────────────────────────────────────────────── │
│ We encountered an error while loading your conversations.   │
│ Please check your connection and try again.                 │
│                                                             │
│ Error Code: CONV_LOAD_ERROR_500                            │
│ Timestamp: 2024-10-02 14:32:15 UTC                        │
│                                                             │
│ [🔄 Retry] [📞 Contact Support] [📋 Copy Error Details]    │
└─────────────────────────────────────────────────────────────┘
```

### Success Feedback
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Rule Created Successfully                                │
│ ─────────────────────────────────────────────────────────── │
│ "Hallucination Detection" rule has been created and is     │
│ now running on your conversations.                          │
│                                                             │
│ [View Rule] [Create Another] [Dismiss]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 14. Design System Documentation

### Button System
```
Primary Button:   [🚀 Primary Action]   <- #5C7285, white text
Secondary Button: [📋 Secondary]        <- #818C78, white text  
Outline Button:   [📤 Outline]          <- transparent, colored border
Ghost Button:     [⚙️ Settings]         <- transparent, no border
Danger Button:    [🗑️ Delete]           <- #C85450, white text
Success Button:   [✅ Save]             <- #A7B49E, white text
```

### Status Indicators
```
● Active/Healthy    (Green #A7B49E)
⚠ Warning/Degraded (Yellow #D4B06A)  
❌ Error/Failed     (Red #C85450)
⏸️ Paused/Inactive  (Gray #8B9AAA)
🕐 Pending/Waiting  (Blue #5C7285)
```

### Typography Scale
```
h1: 32px, Bold, #2C3E50
h2: 24px, Bold, #2C3E50  
h3: 20px, Bold, #2C3E50
h4: 18px, Medium, #2C3E50
h5: 16px, Medium, #2C3E50
Body: 14px, Regular, #2C3E50
Small: 12px, Regular, #5A6C7D
Caption: 11px, Regular, #8B9AAA
```

### Card Patterns
```
┌─────────────────────────────────────┐
│ Card Title                          │ <- h4 typography
│ ─────────────────────────────────── │ <- border separator
│ Content area with proper padding    │ <- 24px padding
│ and consistent spacing between      │
│ elements following 8px grid.        │
│                                     │
│ [Action Button] [Secondary Action]  │ <- buttons aligned
└─────────────────────────────────────┘ <- subtle shadow
```

---

## 15. Implementation Guidelines

### Development Phases

**Phase 1: Core Infrastructure (Weeks 1-4)**
- Sidebar navigation and layout
- Project dashboard and overview
- Basic conversation table
- User authentication and projects

**Phase 2: Monitoring Features (Weeks 5-8)**  
- Conversation detail views
- Basic analytics dashboard
- Search and filtering
- Data export functionality

**Phase 3: Advanced Features (Weeks 9-12)**
- Distributed tracing interface
- Prompt playground
- Rules and automation
- Advanced analytics

**Phase 4: Enterprise Features (Weeks 13-16)**
- Administration interfaces
- Advanced security features
- Compliance controls
- Mobile optimization

### Performance Considerations
- **Lazy Loading**: Load conversation data on demand
- **Virtualization**: Use virtual scrolling for large tables
- **Caching**: Cache frequently accessed data
- **Progressive Enhancement**: Core functionality works without JavaScript

### Accessibility Requirements
- **WCAG 2.1 AA Compliance**: Meet accessibility standards
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels
- **Color Contrast**: Ensure sufficient contrast ratios
- **Focus Management**: Clear focus indicators

---

This comprehensive UX design specification provides the complete blueprint for building the AgentLens platform. The design balances enterprise functionality with user-friendly interfaces, ensuring that technical teams can effectively monitor and optimize their AI systems while maintaining a professional and intuitive experience.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze existing AgentLens UI patterns and components", "status": "completed", "activeForm": "Analyzing existing AgentLens UI patterns and components"}, {"content": "Design main navigation and layout architecture", "status": "completed", "activeForm": "Designing main navigation and layout architecture"}, {"content": "Create project dashboard and overview designs", "status": "completed", "activeForm": "Creating project dashboard and overview designs"}, {"content": "Design conversation monitoring interfaces", "status": "completed", "activeForm": "Designing conversation monitoring interfaces"}, {"content": "Create distributed tracing visualization designs", "status": "completed", "activeForm": "Creating distributed tracing visualization designs"}, {"content": "Design prompt playground and testing interfaces", "status": "completed", "activeForm": "Designing prompt playground and testing interfaces"}, {"content": "Create rules and automation UI designs", "status": "completed", "activeForm": "Creating rules and automation UI designs"}, {"content": "Design analytics and metrics dashboards", "status": "completed", "activeForm": "Designing analytics and metrics dashboards"}, {"content": "Create administration and settings interfaces", "status": "completed", "activeForm": "Creating administration and settings interfaces"}, {"content": "Design responsive mobile and tablet layouts", "status": "completed", "activeForm": "Designing responsive mobile and tablet layouts"}, {"content": "Create design system documentation", "status": "completed", "activeForm": "Creating design system documentation"}]
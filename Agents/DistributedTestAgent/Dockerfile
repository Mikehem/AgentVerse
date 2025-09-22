FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY agent.py .
COPY run_collaborative_scenario.py .

# Create non-root user for security
RUN useradd -m -u 1000 agentuser && chown -R agentuser:agentuser /app
USER agentuser

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV AGENT_API_URL=http://agent-lens-frontend:3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f ${AGENT_API_URL}/api/health || exit 1

# Default command
CMD ["python", "agent.py", "--agent-id", "default-agent", "--agent-type", "worker", "--agent-name", "Default Agent", "--role", "Default role", "--capabilities", "basic"]
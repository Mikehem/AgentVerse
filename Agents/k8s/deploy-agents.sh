#!/bin/bash

# Deploy Agent Lens Distributed Tracing Agents to Kubernetes
# This script deploys the collaborative document processing scenario

set -e

echo "🚀 Deploying Agent Lens Distributed Tracing Agents"
echo "=================================================="

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot access Kubernetes cluster"
    exit 1
fi

echo "✅ Kubernetes cluster is accessible"

# Create namespaces
echo "📁 Creating namespaces..."
kubectl apply -f namespace.yaml

# Wait for namespaces to be created
echo "⏳ Waiting for namespaces to be ready..."
kubectl wait --for=condition=Active namespace/document-processing --timeout=60s
kubectl wait --for=condition=Active namespace/data-pipeline --timeout=60s
kubectl wait --for=condition=Active namespace/agent-lens --timeout=60s

# Deploy document processing agents
echo "🤖 Deploying document processing agents..."
kubectl apply -f document-processing-deployment.yaml

# Check deployment status
echo "📊 Checking deployment status..."
kubectl get deployments -n document-processing

echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/doc-coordinator -n document-processing
kubectl wait --for=condition=available --timeout=300s deployment/text-extractor -n document-processing
kubectl wait --for=condition=available --timeout=300s deployment/sentiment-analyzer -n document-processing
kubectl wait --for=condition=available --timeout=300s deployment/entity-extractor -n document-processing
kubectl wait --for=condition=available --timeout=300s deployment/quality-monitor -n document-processing

echo "✅ All deployments are ready!"

# Show pod status
echo "📱 Pod status:"
kubectl get pods -n document-processing -o wide

# Show services
echo "🌐 Services:"
kubectl get services -n document-processing

# Show logs from coordinator
echo "📜 Sample logs from coordinator:"
kubectl logs -n document-processing deployment/doc-coordinator --tail=10

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check pod logs: kubectl logs -n document-processing <pod-name>"
echo "2. Port forward to access agents: kubectl port-forward -n document-processing svc/doc-coordinator-service 8001:8001"
echo "3. View distributed traces in Agent Lens dashboard"
echo "4. Monitor A2A communications and trace correlations"
echo ""
echo "🧹 To clean up:"
echo "kubectl delete namespace document-processing"
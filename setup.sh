#!/bin/bash

# Agent Lens Solution - Quick Setup Script
# This script provides an alternative to using the Makefile for users who prefer bash scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}🚀 Agent Lens Solution Setup${NC}"
    echo "================================"
    echo ""
}

# Check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 not found. Please install $1."
        exit 1
    fi
}

# Main setup function
main() {
    print_header
    
    print_info "Checking system dependencies..."
    check_command node
    check_command npm
    check_command python3
    check_command docker
    check_command docker-compose
    print_status "All dependencies found"
    
    print_info "Running complete setup via Makefile..."
    make setup
    
    echo ""
    print_status "Setup completed successfully!"
    echo ""
    echo -e "${GREEN}🎉 Agent Lens is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start services: ${BLUE}make start${NC}"
    echo "  2. Check status: ${BLUE}make status${NC}"
    echo "  3. View dashboard: ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo "For help: ${BLUE}make help${NC}"
}

# Run main function
main "$@"
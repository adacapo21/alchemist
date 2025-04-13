#!/bin/bash
# start.sh - A helper script to run the Docker environment

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in the PATH"
    exit 1
fi

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "Error: Neither docker-compose nor docker compose is available"
    exit 1
fi

# Set default environment variables
export TEST_ENV=${TEST_ENV:-testdev1}
export BROWSER=${BROWSER:-chromium}
export HEADLESS=${HEADLESS:-true}
export TAGS=${TAGS:-"@registration"}

# Display current settings
echo "Starting test environment with:"
echo "  TEST_ENV = $TEST_ENV"
echo "  BROWSER = $BROWSER"
echo "  HEADLESS = $HEADLESS"
echo "  TAGS = $TAGS"

# Clean up any existing containers
echo "Cleaning up existing containers..."
$COMPOSE_CMD down

# Ensure directories exist with correct permissions
echo "Creating necessary directories..."
mkdir -p ../test-results/screenshots ../test-results/videos ../allure-results
chmod -R 777 ../test-results ../allure-results

# Build and start the containers
echo "Building and starting containers..."
$COMPOSE_CMD up -d --build

# Follow the logs
echo "Following logs (Ctrl+C to stop following, containers will continue running):"
$COMPOSE_CMD logs -f test-runner

echo "You can access the Allure reports at http://localhost:5050"
echo "To stop the containers, run: $COMPOSE_CMD down"
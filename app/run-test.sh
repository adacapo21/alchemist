#!/bin/bash

# Print each command for debugging
set -x

# Read the API key from the root .env file
if [ -f "../.env" ]; then
  export $(grep -v '^#' "../.env" | xargs)
  echo "Found .env file and loaded environment variables"
else
  echo "Error: .env file not found in the parent directory"
  exit 1
fi

# Check if the API key is available
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: OPENAI_API_KEY not found in .env file"
  exit 1
fi

# Make sure the necessary directories exist
mkdir -p features/ai-generated
mkdir -p src/step-definitions/ai-generated
mkdir -p allure-results
mkdir -p test-results/{screenshots,videos}

# Set up extra flags
EXTRA_FLAGS=""

# Check for verbose flag
if [[ "$*" == *"--verbose"* ]] || [[ "$*" == *"-v"* ]]; then
  EXTRA_FLAGS="--verbose"
else
  EXTRA_FLAGS="--verbose"  # Force verbose mode for debugging
fi

# Check if we should generate Allure reports
if [[ "$*" == *"--allure"* ]] || [[ "$*" == *"-a"* ]]; then
  EXTRA_FLAGS="$EXTRA_FLAGS --allure"
  echo "Allure reporting enabled"
fi

# Check if we should use visible browser
if [[ "$*" == *"--visible"* ]] || [[ "$*" == *"--show"* ]] || [[ "$*" == *"-s"* ]]; then
  EXTRA_FLAGS="$EXTRA_FLAGS --visible"
  echo "Visible browser mode enabled"
fi

# Check for browser selection
BROWSER_FLAG=""
for arg in "$@"; do
  if [[ "$arg" == "--browser" ]] || [[ "$arg" == "-b" ]]; then
    BROWSER_FLAG="found"
  elif [[ "$BROWSER_FLAG" == "found" ]]; then
    if [[ "$arg" == "chromium" ]] || [[ "$arg" == "firefox" ]] || [[ "$arg" == "webkit" ]]; then
      EXTRA_FLAGS="$EXTRA_FLAGS --browser $arg"
      echo "Using browser: $arg"
      BROWSER_FLAG="used"
    fi
  fi
done

# Run the test generator with the API key
echo "Running test with API key: ${OPENAI_API_KEY:0:10}..."
echo "Command: node src/ai/cli/generate-test.js $EXTRA_FLAGS $@"

# Just run the test directly - no background process or watchdog
node src/ai/cli/generate-test.js $EXTRA_FLAGS "$@"
TEST_EXIT_CODE=$?

echo "Test completed with exit code: $TEST_EXIT_CODE"

# If the test generation was successful and we used --allure flag but not --run
if [[ $TEST_EXIT_CODE -eq 0 ]] && [[ "$*" == *"--allure"* ]] && [[ "$*" != *"--run"* ]]; then
  echo "Generating Allure report for previously run tests..."
  npm run allure:generate
  npm run allure:open
fi

# Force kill any lingering processes
# This ensures clean exit even if some browser processes are still running
pkill -f chromium 2>/dev/null || true
pkill -f firefox 2>/dev/null || true
pkill -f webkit 2>/dev/null || true
pkill -f "node.*cucumber" 2>/dev/null || true

# Ensure we exit with the right code
echo "Exiting with code: $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE

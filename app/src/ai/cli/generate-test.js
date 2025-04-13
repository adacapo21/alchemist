#!/usr/bin/env node

/**
 * JavaScript implementation of the AI Test Generator CLI
 * This file allows running the test generator without requiring TypeScript compilation
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  console.error('Please set it in your .env file or environment variables');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
let description = '';
let runImmediately = false;
let verbose = false;
let generateAllureReport = false;
let visibleBrowser = false;
let browserType = 'chromium'; // Default browser

// Process command line flags
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--run' || args[i] === '-r') {
    runImmediately = true;
  } else if (args[i] === '--verbose' || args[i] === '-v') {
    verbose = true;
  } else if (args[i] === '--allure' || args[i] === '-a') {
    generateAllureReport = true;
  } else if (args[i] === '--visible' || args[i] === '--show' || args[i] === '-s') {
    visibleBrowser = true;
  } else if (args[i] === '--browser' || args[i] === '-b') {
    // Get the browser type from the next argument
    if (i + 1 < args.length) {
      const nextArg = args[i + 1].toLowerCase();
      if (['chromium', 'firefox', 'webkit'].includes(nextArg)) {
        browserType = nextArg;
        i++; // Skip the next argument since we've processed it
      } else {
        console.warn(`Warning: Invalid browser "${nextArg}". Using default browser "chromium".`);
      }
    } else {
      console.warn('Warning: --browser flag requires a browser type. Using default browser "chromium".');
    }
  } else {
    // Collect remaining arguments as the description
    description += ' ' + args[i];
  }
}

description = description.trim();

if (!description) {
  console.error('Error: Test description is required');
  console.error('Usage: node generate-test.js [--run] [--verbose] [--allure] [--visible] [--browser <chromium|firefox|webkit>] "Your test description here"');
  process.exit(1);
}

// Paths
const featuresDir = path.join(process.cwd(), 'features/ai-generated');
const stepsDir = path.join(process.cwd(), 'src/step-definitions/ai-generated');

// Ensure directories exist
fs.mkdirSync(featuresDir, { recursive: true });
fs.mkdirSync(stepsDir, { recursive: true });

// Function to generate a timestamped ID
function generateId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Determine the test type from the description
function getTestType(description) {
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('register')) return 'registration';
  if (lowerDesc.includes('login')) return 'login';
  if (lowerDesc.includes('search')) return 'search';
  return 'custom';
}

// Generate a file name based on the test type and timestamp
const testType = getTestType(description);
const timestamp = generateId();
const testId = `${testType}-${timestamp}`;
let featureFile = path.join(featuresDir, `${testId}.feature`);

console.log(`Generating test for: "${description}"`);

// Run the TypeScript CLI using ts-node
// This is a workaround to avoid compiling TypeScript
try {
  // First we need to create a temporary file with the description
  const tempFile = path.join(process.cwd(), 'temp-description.txt');
  fs.writeFileSync(tempFile, description);
  
  // Determine flags for the command
  let tsNodeCommand = 'npx ts-node';
  
  // On Windows, the command may need adjustment
  if (process.platform === 'win32') {
    tsNodeCommand = 'npx.cmd ts-node';
  }
  
  // Build the full command
  let command = `${tsNodeCommand} ${path.join(__dirname, 'generate-test.ts')} -f "${tempFile}" -o "${featuresDir}"`;
  
  if (verbose) {
    command += ' --verbose';
  }
  
  if (verbose) {
    console.log(`Executing: ${command}`);
  }
  
  // Execute the TypeScript CLI
  const result = execSync(command, { encoding: 'utf-8' });
  
  if (verbose) {
    console.log(result);
  }
  
  // Clean up the temporary file
  fs.unlinkSync(tempFile);
  
  // Check if the feature file was generated - use more robust method
  // Find any feature files created in the last minute
  const files = fs.readdirSync(featuresDir);
  const now = new Date();
  let matchingFile = null;
  
  // Get file stats to check creation time
  for (const file of files) {
    if (file.endsWith('.feature')) {
      const filePath = path.join(featuresDir, file);
      const stats = fs.statSync(filePath);
      const fileCreated = new Date(stats.birthtimeMs);
      
      // If file was created within the last minute
      if ((now.getTime() - fileCreated.getTime()) < 60000) {
        matchingFile = filePath;
        break;
      }
    }
  }
  
  if (matchingFile) {
    console.log(`✅ Feature file generated: ${matchingFile}`);
    featureFile = matchingFile;
  } else {
    console.error('❌ No feature file was generated in the last minute');
    process.exit(1);
  }
  
  // Run the test if requested
  if (runImmediately) {
    console.log('\nRunning the test...');
    
    // Create a Cucumber config file for running just this test
    const cucumberConfig = `
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'src/**/hooks.ts',
      'src/**/world.ts',
      'src/**/*.steps.ts'
    ],
    paths: ['${featureFile}'],
    format: [
      'progress-bar',
      '@cucumber/pretty-formatter',
      'allure-cucumberjs/reporter',
      'json:allure-results/ai-test-${timestamp}.json'
    ]
  },
  allure: {
    requireModule: ['ts-node/register'],
    require: [
      'src/**/hooks.ts',
      'src/**/world.ts',
      'src/**/*.steps.ts'
    ],
    paths: ['${featureFile}'],
    format: [
      'progress-bar',
      'allure-cucumberjs/reporter',
      'json:allure-results/ai-test-${timestamp}.json'
    ]
  }
};
    `;
    
    const configPath = path.join(process.cwd(), 'cucumber.ai-test.js');
    fs.writeFileSync(configPath, cucumberConfig);
    
    // Make sure allure-results directory exists
    const allureDir = path.join(process.cwd(), 'allure-results');
    fs.mkdirSync(allureDir, { recursive: true });
    
    // Run the test using Cucumber.js with allure profile if requested
    const profile = generateAllureReport ? ' --profile allure' : '';
    const headless = visibleBrowser ? 'false' : 'true';
    const command = `BROWSER=${browserType} HEADLESS=${headless} TEST_ENV=testdev1 RECORD_VIDEO=true AI_GENERATED_TEST=true npx cucumber-js --config cucumber.ai-test.js${profile}`;
    console.log(`Executing: ${command}`);
    
    // Execute the command in a child process to show real-time output
    const testProcess = spawn(command, { 
      shell: true, 
      stdio: 'inherit',
      detached: false
    });
    
    // Listen for signals to make sure we kill the child when the parent is killed
    process.on('SIGINT', () => {
      console.log('Received SIGINT, killing child process...');
      testProcess.kill('SIGINT');
      process.exit(1);
    });
    
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, killing child process...');
      testProcess.kill('SIGTERM');
      process.exit(1);
    });
    
    // Set a timeout to ensure we don't hang forever
    const maxTimeout = setTimeout(() => {
      console.log('Maximum execution time reached, forcing exit...');
      testProcess.kill('SIGKILL');
      process.exit(1);
    }, 180000); // 3 minutes
    
    // Wait for process to finish
    testProcess.on('exit', (code) => {
      // Clear the timeout as the process has exited
      clearTimeout(maxTimeout);
      
      console.log(`\nTest completed with exit code: ${code || 0}`);
      
      // Generate Allure report if requested
      if (generateAllureReport && code === 0) {
        try {
          console.log('\nGenerating Allure report...');
          execSync('npm run allure:generate', { stdio: 'inherit' });
          console.log('Opening Allure report...');
          execSync('npm run allure:open', { stdio: 'inherit' });
        } catch (error) {
          console.error('Error generating or opening Allure report:', error.message);
        }
      }
      
      // Clean up
      try {
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
          console.log('Temporary configuration file deleted');
        }
        
        console.log('Test execution and cleanup complete');
        
        // Just exit with the proper code - no need for extra process killing here
        process.exit(code || 0);
        
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
        process.exit(code || 1);
      }
    });
  }
  
} catch (error) {
  console.error('Error generating or running test:', error.message);
  
  // Ensure cleanup on error
  try {
    const tempFile = path.join(process.cwd(), 'temp-description.txt');
    const configPath = path.join(process.cwd(), 'cucumber.ai-test.js');
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log('Temporary description file deleted');
    }
    
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log('Temporary configuration file deleted');
    }
    
    console.log('Error cleanup complete');
  } catch (cleanupError) {
    // Ignore cleanup errors
    console.error('Error during cleanup:', cleanupError);
  }
  
  process.exit(1);
} 
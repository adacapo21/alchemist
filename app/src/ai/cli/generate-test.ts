#!/usr/bin/env ts-node

import * as path from 'path';
import * as fs from 'fs';
import { program } from 'commander';
import dotenv from 'dotenv';
import { LLMService } from '../services';
import { StepMapper, ActionMapper } from '../mappers';
import { FeatureGenerator } from '../generators';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });

// Default paths
const DEFAULT_STEP_DEFS_PATH = path.join(process.cwd(), 'src/step-definitions');
const DEFAULT_FEATURES_PATH = path.join(process.cwd(), 'features/ai-generated');

/**
 * Setup command line parser
 */
program
  .name('generate-test')
  .version('1.0.0')
  .description('Generate Cucumber feature files from natural language descriptions')
  .option('-d, --description <text>', 'Test description in natural language')
  .option('-f, --file <path>', 'Path to file containing test descriptions, one per line')
  .option('-o, --output <path>', 'Output directory for generated feature files', DEFAULT_FEATURES_PATH)
  .option('-s, --steps <path>', 'Path to step definitions directory', DEFAULT_STEP_DEFS_PATH)
  .option('-m, --model <name>', 'LLM model to use', 'gpt-4')
  .option('-r, --run', 'Run tests immediately after generation', false)
  .option('-v, --verbose', 'Enable verbose output', false)
  .parse(process.argv);

/**
 * Main function
 */
async function main() {
  const options = program.opts();
  const startTime = Date.now();
  
  try {
    // Create necessary directories
    fs.mkdirSync(options.output, { recursive: true });
    
    // Initialize services
    const llmService = new LLMService(options.model);
    const stepMapper = new StepMapper(options.steps);
    const actionMapper = new ActionMapper();
    const featureGenerator = new FeatureGenerator(
      llmService,
      stepMapper,
      actionMapper,
      options.output
    );
    
    // Load step definitions
    if (options.verbose) {
      console.log('Loading step definitions...');
    }
    await stepMapper.loadStepDefinitions();
    
    // Get test descriptions from either description option or file
    const descriptions: string[] = [];
    
    if (options.description) {
      descriptions.push(options.description);
    } else if (options.file) {
      const fileContent = fs.readFileSync(options.file, 'utf-8');
      descriptions.push(
        ...fileContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
      );
    } else {
      // No description provided, print help and exit
      program.help();
      return;
    }
    
    // Generate features for each description
    const generatedFiles: string[] = [];
    
    for (const description of descriptions) {
      if (options.verbose) {
        console.log(`\nGenerating test for: "${description}"`);
      } else {
        console.log(`Generating test: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`);
      }
      
      const feature = await featureGenerator.generateFeature(description);
      const filePath = await featureGenerator.saveFeature(feature);
      
      generatedFiles.push(filePath);
      console.log(`✅ Feature file generated: ${filePath}`);
    }
    
    // Run tests if requested
    if (options.run && generatedFiles.length > 0) {
      console.log('\nRunning generated tests...');
      
      // Execute Cucumber.js on the generated feature files
      const { exec } = require('child_process');
      const featureFiles = generatedFiles.join(' ');
      const command = `BROWSER=chromium HEADLESS=true TEST_ENV=testdev1 npx cucumber-js ${featureFiles}`;
      
      console.log(`Executing: ${command}\n`);
      
      const childProcess = exec(command);
      
      childProcess.stdout.on('data', (data: string) => {
        process.stdout.write(data);
      });
      
      childProcess.stderr.on('data', (data: string) => {
        process.stderr.write(data);
      });
      
      await new Promise<void>((resolve) => {
        childProcess.on('exit', (code: number) => {
          console.log(`\nTests completed with exit code: ${code}`);
          resolve();
        });
      });
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\nCompleted in ${duration.toFixed(2)} seconds`);
    
  } catch (error) {
    console.error('Error generating tests:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error); 
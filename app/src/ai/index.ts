/**
 * QA Alchemist AI Module
 * Provides AI-powered test generation capabilities
 */

// Export all components for direct usage
import { LLMService } from './services';
import { StepMapper, ActionMapper, ActionType, Action } from './mappers';
import { FeatureGenerator, ScenarioGenerator, Feature, Scenario, Step } from './generators';
import featureTemplate from './templates/feature-template';
import scenarioTemplate from './templates/scenario-template';

// Export everything
export {
  // Services
  LLMService,
  
  // Mappers
  StepMapper,
  ActionMapper,
  ActionType,
  Action,
  
  // Generators
  FeatureGenerator,
  ScenarioGenerator,
  Feature,
  Scenario,
  Step,
  
  // Templates
  featureTemplate,
  scenarioTemplate
};

/**
 * Factory function to create an AI test generator instance with all dependencies
 */
export function createAITestGenerator(
  apiKey: string,
  stepDefsPath: string,
  featuresPath: string,
  model: string = 'gpt-4'
): { featureGenerator: FeatureGenerator; llmService: LLMService } {
  // Initialize services
  const llmService = new LLMService(model);
  const stepMapper = new StepMapper(stepDefsPath);
  const actionMapper = new ActionMapper();
  const featureGenerator = new FeatureGenerator(
    llmService,
    stepMapper,
    actionMapper,
    featuresPath
  );
  
  // Return the initialized generator and services
  return {
    featureGenerator,
    llmService
  };
}

export default {
  createAITestGenerator
}; 
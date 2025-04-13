import * as fs from 'fs';
import * as path from 'path';
import { LLMService } from '../services';
import { StepMapper, ActionMapper } from '../mappers';
import featureTemplates from '../templates/feature-template';

/**
 * Structure of a Gherkin feature
 */
export interface Feature {
  title: string;
  description: string;
  tags: string[];
  scenarios: Scenario[];
}

/**
 * Structure of a Gherkin scenario
 */
export interface Scenario {
  title: string;
  tags: string[];
  steps: Step[];
}

/**
 * Structure of a Gherkin step
 */
export interface Step {
  type: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  data?: Record<string, any>;
}

/**
 * FeatureGenerator generates Gherkin feature files from natural language descriptions
 */
export class FeatureGenerator {
  private llmService: LLMService;
  private stepMapper: StepMapper;
  private actionMapper: ActionMapper;
  private featuresDir: string;
  
  constructor(
    llmService: LLMService,
    stepMapper: StepMapper,
    actionMapper: ActionMapper,
    featuresDir: string
  ) {
    this.llmService = llmService;
    this.stepMapper = stepMapper;
    this.actionMapper = actionMapper;
    this.featuresDir = featuresDir;
  }
  
  /**
   * Generate a feature file from a natural language description
   */
  async generateFeature(description: string): Promise<Feature> {
    // Check if it's a registration test
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('register') || lowerDesc.includes('sign up') || lowerDesc.includes('create account')) {
      // For registration tests, use the specialized template
      const gherkinContent = featureTemplates.populateRegistrationTemplate(description);
      return this.parseGherkinToFeature(gherkinContent, description);
    }
    
    // For other tests, use the regular process
    // First, try to extract actions from the description
    const actions = this.actionMapper.extractActions(description);
    
    // If we have actions, convert them to steps
    if (actions.length > 0) {
      const steps = this.actionMapper.actionsToSteps(actions);
      return this.createFeatureFromSteps(description, steps);
    }
    
    // If no actions extracted, use the LLM to generate a complete feature
    return this.generateFeatureWithLLM(description);
  }
  
  /**
   * Parse Gherkin text content to a Feature object
   */
  private parseGherkinToFeature(gherkinContent: string, description: string): Feature {
    const lines = gherkinContent.split('\n');
    let title = 'Registration';
    let featureDescription = '';
    const tags: string[] = ['@registration'];
    const scenarios: Scenario[] = [];
    let currentScenario: Scenario | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('@')) {
        if (!line.includes('@registration')) {
          tags.push(...line.split(' ').filter(t => t.startsWith('@')));
        }
      } else if (line.startsWith('Feature:')) {
        title = line.replace('Feature:', '').trim();
      } else if (line.startsWith('As a') || line.startsWith('I want') || line.startsWith('So that')) {
        featureDescription += line + '\n';
      } else if (line.startsWith('Scenario:')) {
        if (currentScenario) {
          scenarios.push(currentScenario);
        }
        currentScenario = {
          title: line.replace('Scenario:', '').trim(),
          tags: [],
          steps: []
        };
      } else if (currentScenario && (line.startsWith('Given') || line.startsWith('When') || line.startsWith('Then') || 
                                 line.startsWith('And') || line.startsWith('But'))) {
        const match = line.match(/^(Given|When|Then|And|But) (.+)$/);
        if (match) {
          currentScenario.steps.push({
            type: match[1] as 'Given' | 'When' | 'Then' | 'And' | 'But',
            text: match[2]
          });
        }
      }
    }
    
    if (currentScenario && currentScenario.steps.length > 0) {
      scenarios.push(currentScenario);
    }
    
    if (scenarios.length === 0) {
      // If no scenario was parsed, create a default one
      scenarios.push({
        title: 'Registration',
        tags: [],
        steps: [
          { type: 'Given', text: 'I am on page "/espace-client/visitor.php?action=register"' },
          { type: 'And', text: 'I set fullscreen' },
          { type: 'When', text: 'I register as new user with ":default"' },
          { type: 'Then', text: 'I should see "Un email de confirmation vient de vous être envoyé"' }
        ]
      });
    }
    
    return {
      title,
      description: featureDescription || `As a user\nI want to ${description.toLowerCase()}\nSo that I can complete my task`,
      tags,
      scenarios
    };
  }
  
  /**
   * Create a feature using extracted steps
   */
  private createFeatureFromSteps(description: string, stepTexts: string[]): Feature {
    // Create a feature title from the description
    const title = this.createFeatureTitle(description);
    
    // Determine appropriate tags
    const tags = this.determineFeatureTags(description);
    
    // Create scenario title from description
    const scenarioTitle = this.createScenarioTitle(description);
    
    // Convert step texts to step objects
    const steps: Step[] = [];
    stepTexts.forEach((text, index) => {
      const stepType = this.determineStepType(text, index, steps);
      steps.push({ type: stepType, text: text.replace(/^(Given|When|Then|And|But)\s+/i, '') });
    });
    
    // Create the feature object
    const feature: Feature = {
      title,
      description: `As a user\nI want to ${description.toLowerCase()}\nSo that I can complete my task`,
      tags,
      scenarios: [
        {
          title: scenarioTitle,
          tags: [],
          steps
        }
      ]
    };
    
    return feature;
  }
  
  /**
   * Generate a feature using the LLM
   */
  private async generateFeatureWithLLM(description: string): Promise<Feature> {
    // Get all available step patterns to provide context to the LLM
    const existingStepPatterns = [
      ...this.stepMapper.getStepPatterns('Given'),
      ...this.stepMapper.getStepPatterns('When'),
      ...this.stepMapper.getStepPatterns('Then')
    ];
    
    // Generate test steps using the LLM
    const llmResponse = await this.llmService.generateTestSteps(description, {
      existingSteps: existingStepPatterns
    });
    
    // Process the LLM response into a feature structure
    if (llmResponse.feature && llmResponse.scenario && llmResponse.steps) {
      const steps: Step[] = llmResponse.steps.map((step: any) => ({
        type: step.type as 'Given' | 'When' | 'Then' | 'And' | 'But',
        text: step.text,
        data: step.parameters
      }));
      
      return {
        title: llmResponse.feature,
        description: `As a user\nI want to ${description.toLowerCase()}\nSo that I can complete my task`,
        tags: llmResponse.tags || [],
        scenarios: [
          {
            title: llmResponse.scenario,
            tags: [],
            steps
          }
        ]
      };
    }
    
    // If LLM didn't return a structured response, create a default feature
    const title = this.createFeatureTitle(description);
    const tags = this.determineFeatureTags(description);
    const scenarioTitle = this.createScenarioTitle(description);
    
    // Create some basic default steps
    const steps: Step[] = [
      { type: 'Given', text: 'I am on the application homepage' },
      { type: 'When', text: 'I perform the required action' },
      { type: 'Then', text: 'I should see expected results' }
    ];
    
    return {
      title,
      description: `As a user\nI want to ${description.toLowerCase()}\nSo that I can complete my task`,
      tags,
      scenarios: [
        {
          title: scenarioTitle,
          tags: [],
          steps
        }
      ]
    };
  }
  
  /**
   * Create a feature title from a description
   */
  private createFeatureTitle(description: string): string {
    // Create title based on the first sentence or up to 50 characters
    const firstSentence = description.split(/[.!?]/)[0].trim();
    return firstSentence.length <= 50 
      ? firstSentence 
      : firstSentence.substring(0, 47) + '...';
  }
  
  /**
   * Create a scenario title from a description
   */
  private createScenarioTitle(description: string): string {
    // Use feature title by default, but could be customized
    return this.createFeatureTitle(description);
  }
  
  /**
   * Determine appropriate tags for a feature
   */
  private determineFeatureTags(description: string): string[] {
    const tags: string[] = ['@automated'];
    const lowerDesc = description.toLowerCase();
    
    // Add tags based on description content
    if (lowerDesc.includes('login') || lowerDesc.includes('sign in')) {
      tags.push('@login');
    }
    
    if (lowerDesc.includes('register') || lowerDesc.includes('sign up')) {
      tags.push('@registration');
    }
    
    if (lowerDesc.includes('search')) {
      tags.push('@search');
    }
    
    return tags;
  }
  
  /**
   * Determine the appropriate step type (Given/When/Then/And)
   */
  private determineStepType(
    text: string, 
    index: number, 
    previousSteps: Step[]
  ): 'Given' | 'When' | 'Then' | 'And' | 'But' {
    // If the step already has a type prefix, use that
    const typeMatch = text.match(/^(Given|When|Then|And|But)\s+/i);
    if (typeMatch) {
      return typeMatch[1] as 'Given' | 'When' | 'Then' | 'And' | 'But';
    }
    
    // Otherwise determine based on position and content
    if (index === 0) {
      return 'Given';
    }
    
    const lowerText = text.toLowerCase();
    const previousType = previousSteps[previousSteps.length - 1].type;
    
    // Verification steps should be Then
    if (
      lowerText.includes('see') || 
      lowerText.includes('verify') || 
      lowerText.includes('should') ||
      lowerText.includes('expect') ||
      lowerText.includes('assert') ||
      lowerText.includes('check')
    ) {
      return previousType === 'Then' ? 'And' : 'Then';
    }
    
    // Action steps should be When
    if (
      lowerText.includes('click') ||
      lowerText.includes('enter') ||
      lowerText.includes('type') ||
      lowerText.includes('select') ||
      lowerText.includes('choose') ||
      lowerText.includes('submit')
    ) {
      return previousType === 'When' ? 'And' : 'When';
    }
    
    // Setup steps should be Given
    if (
      lowerText.includes('navigate') ||
      lowerText.includes('open') ||
      lowerText.includes('go to') ||
      lowerText.includes('browser')
    ) {
      return previousType === 'Given' ? 'And' : 'Given';
    }
    
    // Default to continuing the previous step type
    return previousType === 'Then' ? 'And' : previousType;
  }
  
  /**
   * Convert a feature object to Gherkin syntax
   */
  featureToGherkin(feature: Feature): string {
    let gherkin = '';
    
    // Add tags
    if (feature.tags.length > 0) {
      gherkin += `${feature.tags.join(' ')}\n`;
    }
    
    // Add feature title and description
    gherkin += `Feature: ${feature.title}\n`;
    if (feature.description) {
      gherkin += `  ${feature.description.split('\n').join('\n  ')}\n`;
    }
    
    // Add scenarios
    feature.scenarios.forEach(scenario => {
      gherkin += '\n';
      
      // Add scenario tags
      if (scenario.tags.length > 0) {
        gherkin += `  ${scenario.tags.join(' ')}\n`;
      }
      
      // Add scenario title
      gherkin += `  Scenario: ${scenario.title}\n`;
      
      // Add steps
      scenario.steps.forEach(step => {
        gherkin += `    ${step.type} ${step.text}\n`;
      });
    });
    
    return gherkin;
  }
  
  /**
   * Save a feature to a file
   */
  async saveFeature(feature: Feature, filename?: string): Promise<string> {
    const gherkin = this.featureToGherkin(feature);
    
    // Create the features directory if it doesn't exist
    await fs.promises.mkdir(this.featuresDir, { recursive: true });
    
    // Generate a filename if not provided
    const finalFilename = filename || this.generateFilename(feature.title);
    const filePath = path.join(this.featuresDir, finalFilename);
    
    // Save to file
    await fs.promises.writeFile(filePath, gherkin, 'utf-8');
    
    return filePath;
  }
  
  /**
   * Generate a filename from a feature title
   */
  private generateFilename(title: string): string {
    // Remove special characters and replace spaces with underscores
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '_');
    
    // Add timestamp to ensure uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    return `${sanitized}_${timestamp}.feature`;
  }
}

export default FeatureGenerator; 
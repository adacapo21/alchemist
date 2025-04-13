import { Step, Scenario } from './feature-generator';
import { ActionMapper } from '../mappers';
import { LLMService } from '../services';

/**
 * ScenarioGenerator handles the generation of individual test scenarios
 */
export class ScenarioGenerator {
  private llmService: LLMService;
  private actionMapper: ActionMapper;
  
  constructor(llmService: LLMService, actionMapper: ActionMapper) {
    this.llmService = llmService;
    this.actionMapper = actionMapper;
  }
  
  /**
   * Generate a scenario from a natural language description
   */
  async generateScenario(description: string, context: any = {}): Promise<Scenario> {
    // Try to extract actions from the description first
    const actions = this.actionMapper.extractActions(description);
    
    // If we have actions, convert them to steps
    if (actions.length > 0) {
      const stepTexts = this.actionMapper.actionsToSteps(actions);
      return this.createScenarioFromSteps(description, stepTexts);
    }
    
    // If no actions extracted, use the LLM to generate a complete scenario
    return this.generateScenarioWithLLM(description, context);
  }
  
  /**
   * Create a scenario using extracted steps
   */
  private createScenarioFromSteps(description: string, stepTexts: string[]): Scenario {
    // Create a scenario title from the description
    const title = this.createScenarioTitle(description);
    
    // Convert step texts to step objects
    const steps: Step[] = [];
    stepTexts.forEach((text, index) => {
      const stepType = this.determineStepType(text, index, steps);
      steps.push({ type: stepType, text: text.replace(/^(Given|When|Then|And|But)\s+/i, '') });
    });
    
    return {
      title,
      tags: [],
      steps
    };
  }
  
  /**
   * Generate a scenario using the LLM
   */
  private async generateScenarioWithLLM(description: string, context: any): Promise<Scenario> {
    // Generate test steps using the LLM
    const llmResponse = await this.llmService.generateTestSteps(description, context);
    
    // Process the LLM response into a scenario structure
    if (llmResponse.scenario && llmResponse.steps) {
      const steps: Step[] = llmResponse.steps.map((step: any) => ({
        type: step.type as 'Given' | 'When' | 'Then' | 'And' | 'But',
        text: step.text,
        data: step.parameters
      }));
      
      return {
        title: llmResponse.scenario,
        tags: llmResponse.tags || [],
        steps
      };
    }
    
    // If LLM didn't return a structured response, create a default scenario
    return {
      title: this.createScenarioTitle(description),
      tags: [],
      steps: [
        { type: 'Given', text: 'I am on the application homepage' },
        { type: 'When', text: 'I perform the required action' },
        { type: 'Then', text: 'I should see expected results' }
      ]
    };
  }
  
  /**
   * Create a scenario title from a description
   */
  private createScenarioTitle(description: string): string {
    // Create title based on the first sentence or up to 50 characters
    const firstSentence = description.split(/[.!?]/)[0].trim();
    return firstSentence.length <= 50 
      ? firstSentence 
      : firstSentence.substring(0, 47) + '...';
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
   * Generate scenario outline examples
   */
  async generateExamples(scenario: Scenario, numExamples: number = 3): Promise<any[]> {
    // Extract parameters from scenario steps
    const paramNames = this.extractParametersFromSteps(scenario.steps);
    
    if (paramNames.length === 0) {
      return [];
    }
    
    // Use the LLM to generate example data
    const prompt = `
    Generate ${numExamples} examples for this test scenario:
    
    Scenario: ${scenario.title}
    ${scenario.steps.map(step => `${step.type} ${step.text}`).join('\n')}
    
    Parameters: ${paramNames.join(', ')}
    
    Return the examples as a JSON array of objects.
    `;
    
    try {
      const completion = await this.llmService.generateCompletion(prompt, { temperature: 0.7 });
      const jsonMatch = completion.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // If no JSON found but completion looks like JSON, try parsing directly
      if (completion.trim().startsWith('[') && completion.trim().endsWith(']')) {
        return JSON.parse(completion);
      }
      
      // Generate default examples if LLM fails
      return this.generateDefaultExamples(paramNames, numExamples);
    } catch (error) {
      console.error('Error generating examples:', error);
      return this.generateDefaultExamples(paramNames, numExamples);
    }
  }
  
  /**
   * Extract parameter names from steps
   */
  private extractParametersFromSteps(steps: Step[]): string[] {
    const paramNames = new Set<string>();
    
    steps.forEach(step => {
      // Extract parameters from step text (anything in quotes or angle brackets)
      const paramMatches = step.text.match(/"([^"]+)"|'([^']+)'|<([^>]+)>/g) || [];
      
      paramMatches.forEach(match => {
        // Clean up the parameter name
        const paramName = match
          .replace(/["'<>]/g, '')
          .toLowerCase()
          .replace(/\s+/g, '_');
        
        paramNames.add(paramName);
      });
    });
    
    return Array.from(paramNames);
  }
  
  /**
   * Generate default examples if LLM fails
   */
  private generateDefaultExamples(paramNames: string[], numExamples: number): any[] {
    const examples = [];
    
    for (let i = 0; i < numExamples; i++) {
      const example: Record<string, string> = {};
      
      paramNames.forEach(param => {
        if (param.includes('email')) {
          example[param] = `test${i + 1}@example.com`;
        } else if (param.includes('password')) {
          example[param] = `Password${i + 1}!`;
        } else if (param.includes('name')) {
          example[param] = `Test User ${i + 1}`;
        } else if (param.includes('phone')) {
          example[param] = `123-456-${7890 + i}`;
        } else {
          example[param] = `Test ${param} ${i + 1}`;
        }
      });
      
      examples.push(example);
    }
    
    return examples;
  }
}

export default ScenarioGenerator; 
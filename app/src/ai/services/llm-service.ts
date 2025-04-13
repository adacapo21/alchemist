import OpenAI from 'openai';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });

/**
 * LLMService handles communication with Language Model APIs (OpenAI, Anthropic, etc.)
 */
export class LLMService {
  private client: OpenAI;
  private model: string = 'gpt-4'; // Default model
  
  constructor(model?: string) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    if (model) {
      this.model = model;
    }
  }
  
  /**
   * Change the model used by the service
   */
  setModel(model: string): void {
    this.model = model;
  }
  
  /**
   * Generate a completion based on the provided prompt
   */
  async generateCompletion(prompt: string, options: any = {}): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a test automation expert specializing in Cucumber Gherkin syntax and BDD testing principles." },
          { role: "user", content: prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1500,
      });
      
      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating LLM completion:', error);
      throw error;
    }
  }
  
  /**
   * Generate structured test steps from a natural language description
   */
  async generateTestSteps(description: string, context: any = {}): Promise<any> {
    const prompt = this.buildStepGenerationPrompt(description, context);
    const completion = await this.generateCompletion(prompt, { temperature: 0.2 });
    
    try {
      const jsonMatch = completion.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      if (completion.trim().startsWith('{') && completion.trim().endsWith('}')) {
        return JSON.parse(completion);
      }
      
      // Otherwise return the raw text
      return { rawOutput: completion };
    } catch (error) {
      console.error('Error parsing LLM output:', error);
      return { error: 'Failed to parse structured data', rawOutput: completion };
    }
  }
  
  /**
   * Build a prompt for generating test steps
   */
  private buildStepGenerationPrompt(description: string, context: any): string {
    const { existingSteps = [], pageObjects = [] } = context;
    
    return `
    I need to generate Cucumber Gherkin test steps from this natural language description:
    "${description}"
    
    ${existingSteps.length > 0 ? `
    Here are the existing step definitions that should be reused if possible:
    ${existingSteps.join('\n')}
    ` : ''}
    
    ${pageObjects.length > 0 ? `
    Here are the available page objects and their methods:
    ${pageObjects.join('\n')}
    ` : ''}
    
    IMPORTANT: For any navigation steps like "I am on page", always use a valid URL path like "/espace-client/visitor.php?action=register" for registration pages.
    
    Examples of valid steps:
    - Given I am on page "/espace-client/visitor.php?action=register"
    - Given I am on page "/espace-client/login.php"
    - Given I am on page "/search"
    
    Please analyze the description and return a JSON structure with:
    1. A feature title
    2. A scenario title
    3. An array of Given, When, Then steps matching the description
    4. Any relevant tags
    
    Format your response as valid JSON like this:
    
    \`\`\`json
    {
      "feature": "Feature title",
      "tags": ["@tag1", "@tag2"],
      "scenario": "Scenario title",
      "steps": [
        { "type": "Given", "text": "step text", "parameters": {} },
        { "type": "When", "text": "step text", "parameters": {} },
        { "type": "Then", "text": "step text", "parameters": {} }
      ]
    }
    \`\`\`
    
    Ensure the steps use ONLY existing step patterns when available, and propose new ones if needed.
    `;
  }
}

export default LLMService; 
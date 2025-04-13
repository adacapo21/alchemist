import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

/**
 * Represents a Cucumber step definition in the codebase
 */
interface StepDefinition {
  type: 'Given' | 'When' | 'Then';
  pattern: string;
  file: string;
  line: number;
  regex: RegExp;
}

/**
 * StepMapper analyzes existing step definitions and maps natural language to compatible Gherkin steps
 */
export class StepMapper {
  private stepDefinitions: StepDefinition[] = [];
  private stepDefinitionsPath: string;
  
  constructor(stepDefinitionsPath: string) {
    this.stepDefinitionsPath = stepDefinitionsPath;
  }
  
  /**
   * Load all step definitions from the specified path
   */
  async loadStepDefinitions(): Promise<StepDefinition[]> {
    try {
      const stepFiles = glob.sync(path.join(this.stepDefinitionsPath, '**/*.steps.ts'));
      
      for (const file of stepFiles) {
        const content = await fs.promises.readFile(file, 'utf-8');
        this.parseStepDefinitions(content, file);
      }
      
      console.log(`Loaded ${this.stepDefinitions.length} step definitions from ${stepFiles.length} files`);
      return this.stepDefinitions;
    } catch (error) {
      console.error('Error loading step definitions:', error);
      throw error;
    }
  }
  
  /**
   * Parse step definitions from a TypeScript file
   */
  private parseStepDefinitions(content: string, file: string): void {
    // Match patterns like Given("pattern", function() {}) or When('pattern', async function() {})
    const stepRegex = /(Given|When|Then)\s*\(\s*['"](.*?)['"].*?\)/g;
    let match;
    
    while ((match = stepRegex.exec(content)) !== null) {
      const [_, type, pattern] = match;
      const line = content.substring(0, match.index).split('\n').length;
      
      // Convert Cucumber expression pattern to regex
      const regexPattern = this.cucumberPatternToRegex(pattern);
      
      this.stepDefinitions.push({
        type: type as 'Given' | 'When' | 'Then',
        pattern,
        file,
        line,
        regex: regexPattern
      });
    }
  }
  
  /**
   * Convert Cucumber expression pattern to a regex for matching
   * Handles {string}, {int}, {word}, etc.
   */
  private cucumberPatternToRegex(pattern: string): RegExp {
    // Replace Cucumber expressions with regex patterns
    const regexPattern = pattern
      .replace(/\{string\}/g, '(?:"([^"]*)"|\\"([^\\"]*)\\")')
      .replace(/\{int\}/g, '(\\d+)')
      .replace(/\{float\}/g, '(\\d+(?:\\.\\d+)?)')
      .replace(/\{word\}/g, '(\\w+)')
      // Escape special chars that shouldn't be treated as regex
      .replace(/([[\]().?*+^$])/g, '\\$1');
    
    return new RegExp(`^${regexPattern}$`, 'i');
  }
  
  /**
   * Find the most appropriate step definition for a given text
   */
  findMatchingStep(text: string, type?: 'Given' | 'When' | 'Then'): StepDefinition | null {
    // Filter by type if provided
    const candidateSteps = type 
      ? this.stepDefinitions.filter(step => step.type === type)
      : this.stepDefinitions;
    
    // First try to find an exact match
    for (const step of candidateSteps) {
      if (step.regex.test(text)) {
        return step;
      }
    }
    
    // If no exact match, return null for now
    // In a more advanced implementation, we could use fuzzy matching or ML techniques
    return null;
  }
  
  /**
   * Get all step patterns for a given type
   */
  getStepPatterns(type?: 'Given' | 'When' | 'Then'): string[] {
    if (type) {
      return this.stepDefinitions
        .filter(step => step.type === type)
        .map(step => step.pattern);
    }
    
    return this.stepDefinitions.map(step => step.pattern);
  }
  
  /**
   * Suggest most similar step definitions for a given text
   */
  suggestSteps(text: string, type?: 'Given' | 'When' | 'Then'): StepDefinition[] {
    const candidateSteps = type 
      ? this.stepDefinitions.filter(step => step.type === type)
      : this.stepDefinitions;
      
    // Here we would implement a more sophisticated matching algorithm
    // For now, let's just return steps that contain similar words
    
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    return candidateSteps
      .filter(step => {
        const stepWords = step.pattern.toLowerCase().split(/\s+/);
        return words.some(word => stepWords.some(stepWord => stepWord.includes(word)));
      })
      .slice(0, 5); // Limit to top 5 suggestions
  }
}

export default StepMapper; 
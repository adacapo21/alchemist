/**
 * Types of user actions that can be found in test descriptions
 */
export enum ActionType {
  NAVIGATION = 'navigation',
  CLICK = 'click',
  INPUT = 'input',
  VERIFICATION = 'verification',
  WAIT = 'wait',
  SCREENSHOT = 'screenshot',
  CUSTOM = 'custom'
}

/**
 * Maps a natural language action to a structured action object
 */
export interface Action {
  type: ActionType;
  description: string;
  target?: string;
  value?: string;
  priority: number;
}

/**
 * ActionMapper analyzes natural language descriptions and extracts action intents
 */
export class ActionMapper {
  /**
   * Keywords that indicate different types of actions
   */
  private actionKeywords = {
    [ActionType.NAVIGATION]: [
      'go to', 'navigate to', 'visit', 'open', 'browse to', 'load', 'access'
    ],
    [ActionType.CLICK]: [
      'click', 'press', 'select', 'choose', 'tap', 'check', 'uncheck', 'toggle'
    ],
    [ActionType.INPUT]: [
      'enter', 'type', 'fill', 'input', 'write', 'provide', 'supply', 'set'
    ],
    [ActionType.VERIFICATION]: [
      'see', 'verify', 'check', 'confirm', 'validate', 'ensure', 'expect', 'should'
    ],
    [ActionType.WAIT]: [
      'wait', 'pause', 'delay', 'sleep'
    ],
    [ActionType.SCREENSHOT]: [
      'screenshot', 'capture', 'take picture', 'save image'
    ]
  };
  
  /**
   * Analyze a description and extract actions
   */
  extractActions(description: string): Action[] {
    const actions: Action[] = [];
    const sentences = this.splitIntoSentences(description);
    
    sentences.forEach((sentence, index) => {
      const lowercaseSentence = sentence.toLowerCase();
      
      // Try to identify the action type based on keywords
      for (const [type, keywords] of Object.entries(this.actionKeywords)) {
        for (const keyword of keywords) {
          if (lowercaseSentence.includes(keyword)) {
            actions.push(this.createAction(type as ActionType, sentence, index));
            break;
          }
        }
      }
      
      // If no specific action type was identified, mark as custom
      if (!actions.some(a => a.description === sentence)) {
        actions.push(this.createAction(ActionType.CUSTOM, sentence, index));
      }
    });
    
    return actions;
  }
  
  /**
   * Split a description into sentences
   */
  private splitIntoSentences(description: string): string[] {
    return description
      .split(/[.!?]|\band\b|\bthen\b|\bafter\b|\bbefore\b|\bwhen\b|\bwhile\b/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  /**
   * Create an action object from a sentence
   */
  private createAction(type: ActionType, description: string, index: number): Action {
    const action: Action = {
      type,
      description,
      priority: index // Priority based on order in the description
    };
    
    // Extract target and value based on action type
    switch (type) {
      case ActionType.NAVIGATION:
        action.target = this.extractTarget(description, ['to', 'on']);
        break;
        
      case ActionType.CLICK:
        action.target = this.extractTarget(description, ['on', 'the', 'button', 'link']);
        break;
        
      case ActionType.INPUT:
        const inputDetails = this.extractInputDetails(description);
        action.target = inputDetails.target;
        action.value = inputDetails.value;
        break;
        
      case ActionType.VERIFICATION:
        action.value = this.extractExpectedValue(description);
        break;
    }
    
    return action;
  }
  
  /**
   * Extract a target from a description
   */
  private extractTarget(description: string, keywords: string[]): string | undefined {
    const lowerDesc = description.toLowerCase();
    
    // Look for quoted text first (most specific target)
    const quotedMatch = description.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      return quotedMatch[1];
    }
    
    // Look for text after keywords
    for (const keyword of keywords) {
      const keywordIndex = lowerDesc.indexOf(keyword);
      if (keywordIndex !== -1) {
        const afterKeyword = description.substring(keywordIndex + keyword.length).trim();
        // Take the next few words as the target
        return afterKeyword.split(/\s+/).slice(0, 3).join(' ');
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract input field and value
   */
  private extractInputDetails(description: string): { target?: string; value?: string } {
    const result: { target?: string; value?: string } = {};
    
    // Look for quoted text as the value
    const quotedMatch = description.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      result.value = quotedMatch[1];
    }
    
    // Look for field name
    const fieldKeywords = ['in', 'into', 'to', 'on', 'field', 'input', 'textbox'];
    for (const keyword of fieldKeywords) {
      const keywordIndex = description.toLowerCase().indexOf(keyword);
      if (keywordIndex !== -1) {
        const afterKeyword = description.substring(keywordIndex + keyword.length).trim();
        // If value was found in quotes, look for field after the value
        if (result.value && afterKeyword.includes(result.value)) {
          result.target = afterKeyword.split(result.value)[1].trim();
        } else {
          // Otherwise take the next few words as the target
          result.target = afterKeyword.split(/\s+/).slice(0, 3).join(' ');
        }
        break;
      }
    }
    
    return result;
  }
  
  /**
   * Extract expected value for verification steps
   */
  private extractExpectedValue(description: string): string | undefined {
    // Look for quoted text as the expected value
    const quotedMatch = description.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      return quotedMatch[1];
    }
    
    // Look for text after keywords like "see", "verify", etc.
    const verificationKeywords = ['see', 'verify', 'check', 'confirm', 'expect', 'should see'];
    for (const keyword of verificationKeywords) {
      const keywordIndex = description.toLowerCase().indexOf(keyword);
      if (keywordIndex !== -1) {
        const afterKeyword = description.substring(keywordIndex + keyword.length).trim();
        return afterKeyword;
      }
    }
    
    return undefined;
  }
  
  /**
   * Convert actions to Gherkin steps
   */
  actionsToSteps(actions: Action[]): string[] {
    const steps: string[] = [];
    
    // Group actions by type to organize into Given/When/Then
    const navigationActions = actions.filter(a => a.type === ActionType.NAVIGATION);
    const interactionActions = actions.filter(a => 
      [ActionType.CLICK, ActionType.INPUT, ActionType.WAIT].includes(a.type)
    );
    const verificationActions = actions.filter(a => a.type === ActionType.VERIFICATION);
    const otherActions = actions.filter(a => 
      ![ActionType.NAVIGATION, ActionType.CLICK, ActionType.INPUT, ActionType.WAIT, ActionType.VERIFICATION].includes(a.type)
    );
    
    // Add Given steps (setup/navigation)
    navigationActions.forEach(action => {
      if (action.target) {
        steps.push(`Given I am on page "${action.target}"`);
      } else {
        steps.push(`Given ${action.description}`);
      }
    });
    
    // Add When steps (interactions)
    interactionActions.forEach(action => {
      if (action.type === ActionType.CLICK && action.target) {
        steps.push(`When I click on "${action.target}"`);
      } else if (action.type === ActionType.INPUT && action.target && action.value) {
        steps.push(`When I enter "${action.value}" in the ${action.target} field`);
      } else if (action.type === ActionType.WAIT) {
        steps.push(`When I wait for the page to load`);
      } else {
        steps.push(`When ${action.description}`);
      }
    });
    
    // Add Then steps (verifications)
    verificationActions.forEach(action => {
      if (action.value) {
        steps.push(`Then I should see "${action.value}"`);
      } else {
        steps.push(`Then ${action.description}`);
      }
    });
    
    // Add any other actions as simple steps
    otherActions.forEach(action => {
      steps.push(`And ${action.description}`);
    });
    
    return steps;
  }
}

export default ActionMapper; 
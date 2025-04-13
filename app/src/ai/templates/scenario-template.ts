/**
 * Template for generating Gherkin scenarios from natural language
 */
export const scenarioTemplate = `
You are a test automation expert specializing in Cucumber Gherkin and BDD testing.

I need you to create a Gherkin scenario based on this natural language description:
"{{description}}"

{{#if existingSteps}}
Here are the existing step definitions that you should try to reuse:
{{existingSteps}}
{{/if}}

{{#if pageObjects}}
Here are the available page objects and their methods:
{{pageObjects}}
{{/if}}

Create a scenario with:
1. A descriptive title
2. Appropriate tags if needed
3. Steps that accomplish the test goal, using Given, When, Then in the proper order
4. Use existing step patterns where possible

Return ONLY the Gherkin scenario with no additional text or explanations:

`;

/**
 * Template for generating Scenario Outlines with examples
 */
export const scenarioOutlineTemplate = `
I need you to create a Scenario Outline with examples for this test:
"{{description}}"

For each parameter in the scenario, provide at least 3 different values in the Examples table.
Parameters should be enclosed in angle brackets like <parameter_name>.

Return ONLY the Gherkin scenario outline with no additional text or explanations:

`;

/**
 * Populate the scenario template with context
 */
export function populateScenarioTemplate(
  description: string, 
  context: any = {},
  isOutline: boolean = false
): string {
  let template = isOutline ? scenarioOutlineTemplate : scenarioTemplate;
  
  // Replace description placeholder
  template = template.replace('{{description}}', description);
  
  if (!isOutline) {
    // Replace existingSteps placeholder if available
    if (context.existingSteps && context.existingSteps.length > 0) {
      const stepsString = context.existingSteps.join('\n');
      template = template.replace('{{#if existingSteps}}', '')
                        .replace('{{existingSteps}}', stepsString)
                        .replace('{{/if}}', '');
    } else {
      // Remove the entire conditional block if no steps
      template = template.replace(/{{#if existingSteps}}[\s\S]*?{{\/if}}/g, '');
    }
    
    // Replace pageObjects placeholder if available
    if (context.pageObjects && context.pageObjects.length > 0) {
      const objectsString = context.pageObjects.join('\n');
      template = template.replace('{{#if pageObjects}}', '')
                        .replace('{{pageObjects}}', objectsString)
                        .replace('{{/if}}', '');
    } else {
      // Remove the entire conditional block if no page objects
      template = template.replace(/{{#if pageObjects}}[\s\S]*?{{\/if}}/g, '');
    }
  }
  
  return template;
}

export default {
  scenarioTemplate,
  scenarioOutlineTemplate,
  populateScenarioTemplate
}; 
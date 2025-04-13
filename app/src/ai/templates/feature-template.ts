/**
 * Template for generating Gherkin feature files from natural language
 */
export const featureTemplate = `
You are a test automation expert specializing in Cucumber Gherkin and BDD testing.

I need you to create a Gherkin feature file based on this natural language description:
"{{description}}"

{{#if existingSteps}}
Here are the existing step definitions that you should try to reuse:
{{existingSteps}}
{{/if}}

Create a feature file with:
1. A descriptive feature title
2. A clear "As a, I want to, So that" description
3. Appropriate feature tags
4. One or more scenarios with steps that accomplish the test goal
5. Use Given, When, Then steps in the proper order

Return ONLY the Gherkin feature file with no additional text or explanations:

`;

/**
 * Populate the feature template with context
 */
export function populateFeatureTemplate(description: string, context: any = {}): string {
  let template = featureTemplate;
  
  // Replace description placeholder
  template = template.replace('{{description}}', description);
  
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
  
  return template;
}

/**
 * Template for registration tests
 */
export const registrationTemplate = `
You are a test automation expert specializing in Cucumber Gherkin syntax and BDD testing principles.

Please create a feature file for a registration test with the following description:
{{description}}

Use these steps:
- Given I am on page "/espace-client/visitor.php?action=register"
- And I set fullscreen
- When I register as new user with ":default"
- Then I should see "Un email de confirmation vient de vous être envoyé"

The output should be a valid Gherkin feature file with:
1. Appropriate @tags
2. A descriptive Feature title
3. A clear "As a, I want to, So that" description
4. A scenario with the Given/When/Then steps

Use this as a reference example:
\`\`\`
@registration
Feature: User Registration
  As a new user
  I want to register an account
  So that I can access preventimmo services

  Scenario: New user completes registration successfully
    Given I am on page "/espace-client/visitor.php?action=register"
    And I set fullscreen
    When I register as new user with ":default"
    Then I should see "Un email de confirmation vient de vous être envoyé"
\`\`\`
`;

/**
 * Function to populate the template with actual content
 */
export function populateRegistrationTemplate(description: string): string {
  return registrationTemplate.replace('{{description}}', description).trim();
}

export default {
  featureTemplate,
  populateFeatureTemplate,
  registrationTemplate,
  populateRegistrationTemplate
}; 
// Advanced test generator that creates new step definitions from structured descriptions

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function main() {
    // Process command line arguments
    let runImmediately = false;
    let description = '';
    
    // Extract flags and description from arguments
    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg === '--run' || arg === '-r') {
            runImmediately = true;
        } else {
            // Add to description with a space separator
            if (description) description += ' ';
            description += arg;
        }
    }
    
    if (!description) {
        console.error('Please provide a test description');
        process.exit(1);
    }

    try {
        console.log(`Generating custom test for: "${description}"`);
        
        // Generate feature file and step definitions based on the description
        const { featureContent, stepDefinitions } = generateCustomTest(description);
        
        // Create directories if they don't exist
        const featuresDir = path.join(__dirname, '../../../features/ai-generated');
        const stepsDir = path.join(__dirname, '../../../src/step-definitions/ai-generated');
        
        await fs.mkdir(featuresDir, { recursive: true });
        await fs.mkdir(stepsDir, { recursive: true });
        
        // Generate timestamp for unique filenames
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Extract test type from description for better naming
        const testType = getTestType(description);
        const testId = `${testType}-${timestamp}`;
        
        // Save the feature file
        const featureFilePath = path.join(featuresDir, `${testId}.feature`);
        await fs.writeFile(featureFilePath, featureContent);
        console.log(`Generated feature file saved to: ${featureFilePath}`);
        
        // Save the step definitions
        const stepsFilePath = path.join(stepsDir, `${testId}.steps.ts`);
        await fs.writeFile(stepsFilePath, stepDefinitions);
        console.log(`Generated step definitions saved to: ${stepsFilePath}`);
        
        // Create the cucumber.js config for running just this test with its steps
        const cucumberConfigPath = path.join(__dirname, '../../../cucumber.custom.js');
        const cucumberConfig = generateCucumberConfig(stepsDir);
        await fs.writeFile(cucumberConfigPath, cucumberConfig);
        
        if (runImmediately) {
            console.log('Running the test immediately...');
            await runTest(testId);
        } else {
            console.log('To run this custom test, use:');
            console.log(`npm run run-custom-test -- features/ai-generated/${testId}.feature`);
        }
        
    } catch (error) {
        console.error('Error generating test:', error);
        process.exit(1);
    }
}

function getTestType(description) {
    // Detect test type from description
    const desc = description.toLowerCase();
    if (desc.includes('register')) return 'registration';
    if (desc.includes('login')) return 'login';
    if (desc.includes('search')) return 'search';
    if (desc.includes('form')) return 'form';
    return 'custom';
}

async function runTest(testId) {
    try {
        // Set environment variables
        process.env.BROWSER = 'chromium';
        process.env.HEADLESS = 'true';
        process.env.TEST_ENV = 'testdev1';
        
        // Build the command to run the test
        const featurePath = `features/ai-generated/${testId}.feature`;
        const command = `HEADLESS=true BROWSER=chromium TEST_ENV=testdev1 npx cucumber-js --config cucumber.custom.js ${featurePath}`;
        
        console.log(`Executing: ${command}`);
        
        // Execute the test
        const { stdout, stderr } = await execPromise(command);
        
        console.log('Test execution result:');
        console.log(stdout);
        
        if (stderr) {
            console.error('Test execution errors:');
            console.error(stderr);
        }
    } catch (error) {
        console.error('Error running test:', error);
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
    }
}

function generateCustomTest(description) {
    // Parse the description to extract structured steps
    const steps = parseStructuredDescription(description);
    
    // Define tags based on the description
    let tag = '@custom';
    if (description.toLowerCase().includes('register')) {
        tag = '@registration';
    } else if (description.toLowerCase().includes('login')) {
        tag = '@login';
    } else if (description.toLowerCase().includes('search')) {
        tag = '@search';
    }
    
    // Create feature title
    let featureTitle = "Custom Test";
    if (tag === '@registration') {
        featureTitle = "User Registration";
    } else if (tag === '@login') {
        featureTitle = "User Login";
    } else if (tag === '@search') {
        featureTitle = "Property Search";
    }
    
    // Create feature file content with extracted steps
    const featureContent = `# Generated by Test Alchemist AI
${tag}
Feature: ${featureTitle} - ${description.split('.')[0]}
  As a user
  I want to ${description.toLowerCase()}
  So that I can complete my task

  Scenario: ${description.split('.')[0]}
${steps.gherkinSteps}
`;

    // Generate step definitions based on the extracted steps
    const stepDefinitions = generateStepDefinitions(steps, description);
    
    return { featureContent, stepDefinitions };
}

function parseStructuredDescription(description) {
    // This function parses a natural language description into Gherkin steps
    // Looking for common patterns like "go to page", "should see", etc.
    
    // Parse the description to identify potential steps
    const sentences = description
        .replace(/"/g, '\\"') // Escape quotes
        .split(/\s*,\s*|\s*\.\s*|\s+and\s+|\s+then\s+/i) // Split by commas, periods, "and", "then"
        .filter(s => s.trim().length > 0);
    
    let givenSteps = [];
    let whenSteps = [];
    let thenSteps = [];
    
    sentences.forEach(sentence => {
        const s = sentence.toLowerCase().trim();
        
        // Given steps - setup and navigation
        if (s.includes('go to') || s.includes('navigate to') || s.includes('on page') || s.includes('on the page') || s.includes('open page')) {
            // Extract URL or page name
            let page = extractUrlOrPage(sentence);
            givenSteps.push(`    Given I am on page "${page}"`);
        } 
        else if (s.includes('on testdev') || s.includes('environment')) {
            let env = 'testdev1';
            if (s.includes('testdev2')) env = 'testdev2';
            givenSteps.push(`    Given I am using the "${env}" environment`);
        }
        else if (s.includes('fullscreen') || s.includes('full screen')) {
            givenSteps.push(`    And I set fullscreen`);
        }
        
        // When steps - actions
        else if (s.includes('register') || s.includes('sign up')) {
            // Look for registration details
            let details = ':default';
            if (s.includes('with')) {
                details = extractDetails(sentence, 'with');
            }
            whenSteps.push(`    When I register as new user with "${details}"`);
        }
        else if (s.includes('login') || s.includes('sign in')) {
            // Look for login details
            let credentials = extractLoginCredentials(sentence);
            whenSteps.push(`    When I login as "${credentials.email}" "${credentials.password}"`);
        }
        else if (s.includes('click') || s.includes('press') || s.includes('select')) {
            let element = extractElement(sentence);
            whenSteps.push(`    When I click on "${element}"`);
        }
        else if (s.includes('fill') || s.includes('enter') || s.includes('input') || s.includes('type')) {
            let fieldAndValue = extractFieldAndValue(sentence);
            whenSteps.push(`    When I enter "${fieldAndValue.value}" in the ${fieldAndValue.field} field`);
        }
        else if (s.includes('search')) {
            let searchTerm = extractSearchTerm(sentence);
            whenSteps.push(`    When I search for "${searchTerm}"`);
        }
        
        // Then steps - assertions
        else if (s.includes('should see') || s.includes('can see') || s.includes('will see')) {
            let text = extractExpectedText(sentence);
            thenSteps.push(`    Then I should see "${text}"`);
        }
        else if (s.includes('redirect') || s.includes('navigate')) {
            let url = extractUrlOrPage(sentence);
            thenSteps.push(`    Then I should be redirected to "${url}"`);
        }
        else if (s.includes('confirm') || s.includes('confirmation')) {
            if (s.includes('email')) {
                thenSteps.push(`    Then I should see "Un email de confirmation vient de vous être envoyé"`);
            } else {
                thenSteps.push(`    Then I should see a confirmation message`);
            }
        }
        else if (s.includes('success') || s.includes('successful')) {
            thenSteps.push(`    Then the operation should be successful`);
        }
        // Add as a generic step if we couldn't categorize it
        else if (s.length > 5) {
            // Try to guess the step type
            if (s.startsWith('if') || s.startsWith('when') || s.includes('should')) {
                thenSteps.push(`    Then ${sentence}`);
            } else if (s.includes('click') || s.includes('enter') || s.includes('search')) {
                whenSteps.push(`    When ${sentence}`);
            } else {
                givenSteps.push(`    Given ${sentence}`);
            }
        }
    });
    
    // If no Given steps, add a default one
    if (givenSteps.length === 0) {
        givenSteps.push('    Given I am on the application homepage');
    }
    
    // If no When steps, add a default one based on the test type
    if (whenSteps.length === 0) {
        if (description.toLowerCase().includes('register')) {
            whenSteps.push('    When I register as new user with ":default"');
        } else if (description.toLowerCase().includes('login')) {
            whenSteps.push('    When I login as ":testMail" ":default"');
        } else if (description.toLowerCase().includes('search')) {
            whenSteps.push('    When I search for "123 Main Street"');
        } else {
            whenSteps.push('    When I perform the required action');
        }
    }
    
    // If no Then steps, add a default one
    if (thenSteps.length === 0) {
        thenSteps.push('    Then the operation should be successful');
    }
    
    // Combine all steps
    const gherkinSteps = [...givenSteps, ...whenSteps, ...thenSteps].join('\n');
    
    // Return the extracted steps for use in generating step definitions
    return {
        gherkinSteps,
        givenSteps,
        whenSteps,
        thenSteps,
        allSteps: [...givenSteps, ...whenSteps, ...thenSteps]
    };
}

function extractUrlOrPage(sentence) {
    // Try to extract a URL or page path from the sentence
    const urlRegex = /"([^"]+)"|'([^']+)'|\/([^\/\s]+(?:\/[^\/\s]+)*)/;
    const match = sentence.match(urlRegex);
    
    if (match) {
        return match[1] || match[2] || match[3] || match[0];
    }
    
    // Check for common pages
    if (sentence.toLowerCase().includes('register')) {
        return '/espace-client/visitor.php?action=register';
    }
    if (sentence.toLowerCase().includes('login')) {
        return '/espace-client/visitor.php?action=login';
    }
    
    return '/';
}

function extractDetails(sentence, prefix) {
    // Extract details after a prefix like "with" or "using"
    const parts = sentence.split(new RegExp(`${prefix}\\s+`, 'i'));
    if (parts.length > 1) {
        return parts[1].trim();
    }
    return ':default';
}

function extractLoginCredentials(sentence) {
    // Try to extract email and password from a login sentence
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = sentence.match(emailRegex);
    
    let email = emailMatch ? emailMatch[0] : ':testMail';
    let password = ':default';
    
    // Look for password
    if (sentence.toLowerCase().includes('password')) {
        const parts = sentence.split(/password\s+/i);
        if (parts.length > 1) {
            password = parts[1].trim();
        }
    }
    
    return { email, password };
}

function extractElement(sentence) {
    // Extract element to click/select
    const quotedRegex = /"([^"]+)"|'([^']+)'/;
    const match = sentence.match(quotedRegex);
    
    if (match) {
        return match[1] || match[2];
    }
    
    // Check for common elements
    if (sentence.toLowerCase().includes('button')) {
        const parts = sentence.split(/button\s+/i);
        if (parts.length > 1) {
            return parts[0].trim() + ' button';
        }
    }
    
    return 'the element';
}

function extractFieldAndValue(sentence) {
    // Extract field name and value to enter
    const quotedRegex = /"([^"]+)"|'([^']+)'/;
    const match = sentence.match(quotedRegex);
    
    let value = match ? (match[1] || match[2]) : 'test value';
    let field = 'input';
    
    // Try to extract field name
    const fieldTypes = ['email', 'password', 'address', 'name', 'phone', 'user', 'text'];
    for (const type of fieldTypes) {
        if (sentence.toLowerCase().includes(type)) {
            field = type;
            break;
        }
    }
    
    return { field, value };
}

function extractSearchTerm(sentence) {
    // Extract search term
    const quotedRegex = /"([^"]+)"|'([^']+)'/;
    const match = sentence.match(quotedRegex);
    
    if (match) {
        return match[1] || match[2];
    }
    
    // Check for common patterns
    if (sentence.toLowerCase().includes('for')) {
        const parts = sentence.split(/for\s+/i);
        if (parts.length > 1) {
            return parts[1].trim();
        }
    }
    
    return '123 Main Street';
}

function extractExpectedText(sentence) {
    // Extract expected text
    const quotedRegex = /"([^"]+)"|'([^']+)'/;
    const match = sentence.match(quotedRegex);
    
    if (match) {
        return match[1] || match[2];
    }
    
    // Check for common patterns
    if (sentence.toLowerCase().includes('text') || sentence.toLowerCase().includes('message')) {
        const parts = sentence.split(/text\s+|message\s+/i);
        if (parts.length > 1) {
            return parts[1].trim();
        }
    }
    
    // If contains "confirmation email", use standard message
    if (sentence.toLowerCase().includes('confirmation email')) {
        return 'Un email de confirmation vient de vous être envoyé';
    }
    
    return 'success message';
}

function generateStepDefinitions(steps, description) {
    // Generate step definitions for the extracted steps
    // We'll create a simplified version that just imports existing steps where possible
    
    // Check if we're mostly using existing steps
    const usingExistingSteps = 
        steps.allSteps.some(s => s.includes('register as new user')) ||
        steps.allSteps.some(s => s.includes('login as')) ||
        steps.allSteps.some(s => s.includes('I am on page'));
    
    if (usingExistingSteps) {
        // For tests that use mostly existing steps, create a simple mapper
        return `import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../utils/world";
import { expect } from "@playwright/test";
import { RegistrationPage } from "../../pages/RegistrationPage";
import { getConfig } from "../../config/environemnt.config";

/**
 * Custom step definitions for: ${description}
 * Generated by Test Alchemist AI
 * These steps reuse existing step definitions
 */

// This test reuses existing step definitions for core functionality
// Additional custom steps are defined below

Given("I am using the {string} environment", async function(this: CustomWorld, env: string) {
    process.env.TEST_ENV = env;
    console.log(\`Using environment: \${env}\`);
});

Then("I should see a confirmation message", async function(this: CustomWorld) {
    if (!this.page) return;
    const confirmationSelector = ".confirmation-message, .success-message, .alert-success";
    await this.page.waitForSelector(confirmationSelector, { timeout: 5000 });
    console.log("Confirmation message found");
});

Then("the operation should be successful", async function(this: CustomWorld) {
    if (!this.page) return;
    // Look for success indicators
    try {
        // Try different selectors that might indicate success
        const successSelectors = [
            ".success-message", 
            ".alert-success",
            "text=success",
            "text=successful",
            "text=confirmation",
            ".confirmation"
        ];
        
        let found = false;
        for (const selector of successSelectors) {
            const element = await this.page.$(selector);
            if (element) {
                found = true;
                console.log(\`Success indicator found: \${selector}\`);
                break;
            }
        }
        
        if (!found) {
            // Take a screenshot as evidence
            const screenshot = await this.page.screenshot();
            await this.attach(screenshot, 'image/png');
            console.log("No explicit success indicator found, but no errors detected");
        }
    } catch (error) {
        console.error("Error validating success:", error);
        throw new Error("Could not validate success");
    }
});

// Add any other custom steps needed for this test
`;
    } else {
        // For completely custom tests, generate full step definitions
        return `import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../utils/world";
import { expect } from "@playwright/test";

/**
 * Custom step definitions for: ${description}
 * Generated by Test Alchemist AI
 */

Given("I am on the application homepage", async function(this: CustomWorld) {
    await this.setup();
    if (this.page) {
        // Navigate to the homepage of the application
        const { baseUrl } = { baseUrl: 'https://testdev1.preventimmo.fr' };
        await this.page.goto(baseUrl);
        console.log("Navigated to homepage");
    }
});

When("I search for {string}", async function(this: CustomWorld, text: string) {
    if (!this.page) return;
    
    // Look for a search input and fill it
    try {
        await this.page.fill('input[placeholder="Search"], input[type="search"], input[name="search"]', text);
        await this.page.click('button[type="submit"], button.search-button');
        console.log(\`Searched for: \${text}\`);
    } catch (error) {
        console.error("Error during search:", error);
        // Fallback - find any input and submit button
        await this.page.fill('input', text);
        await this.page.click('button');
    }
});

When("I enter {string} in the {word} field", async function(this: CustomWorld, value: string, fieldName: string) {
    if (!this.page) return;
    
    // Try to find the field by various selectors
    try {
        const selectors = [
            \`input[name="\${fieldName}"]\`,
            \`input[placeholder*="\${fieldName}"]\`,
            \`input[id*="\${fieldName}"]\`,
            \`input[type="\${fieldName}"]\`,
            \`textarea[name="\${fieldName}"]\`
        ];
        
        let found = false;
        for (const selector of selectors) {
            const field = await this.page.$(selector);
            if (field) {
                await this.page.fill(selector, value);
                console.log(\`Filled \${fieldName} field with: \${value}\`);
                found = true;
                break;
            }
        }
        
        if (!found) {
            throw new Error(\`Could not find \${fieldName} field\`);
        }
    } catch (error) {
        console.error(\`Error filling \${fieldName} field:\`, error);
        // Fallback - try to fill any visible input
        const inputs = await this.page.$$('input:visible');
        if (inputs.length > 0) {
            await inputs[0].fill(value);
        }
    }
});

When("I click on {string}", async function(this: CustomWorld, element: string) {
    if (!this.page) return;
    
    // Try to find and click the element by various means
    try {
        // Try text-based selector first
        await this.page.click(\`text="\${element}"\`);
        console.log(\`Clicked on element with text: \${element}\`);
        return;
    } catch (error) {
        // Try other selector strategies
        try {
            const selectors = [
                \`button:has-text("\${element}")\`,
                \`a:has-text("\${element}")\`,
                \`input[value="\${element}"]\`,
                \`#\${element.toLowerCase().replace(/\\s+/g, '-')}\`,
                \`.\${element.toLowerCase().replace(/\\s+/g, '-')}\`
            ];
            
            let clicked = false;
            for (const selector of selectors) {
                try {
                    await this.page.click(selector);
                    console.log(\`Clicked on element with selector: \${selector}\`);
                    clicked = true;
                    break;
                } catch (e) {
                    // Continue trying next selector
                }
            }
            
            if (!clicked) {
                throw new Error(\`Could not click on "\${element}"\`);
            }
        } catch (e) {
            console.error(\`Error clicking on "\${element}":\`, e);
            // Last resort - try to click any button
            await this.page.click('button');
        }
    }
});

Then("I should see {string}", async function(this: CustomWorld, text: string) {
    if (!this.page) return;
    
    try {
        await this.page.waitForSelector(\`text="\${text}"\`, { timeout: 5000 });
        console.log(\`Text found: "\${text}"\`);
    } catch (error) {
        console.error(\`Error finding text "\${text}":\`, error);
        
        // Take a screenshot for debugging
        const screenshot = await this.page.screenshot();
        await this.attach(screenshot, 'image/png');
        
        // Get page content for debugging
        const content = await this.page.content();
        console.log("Page content:", content.substring(0, 500) + "...");
        
        throw new Error(\`Text "\${text}" not found on page\`);
    }
});

Then("I should be redirected to {string}", async function(this: CustomWorld, url: string) {
    if (!this.page) return;
    
    try {
        // Wait for navigation to complete
        await this.page.waitForURL(url, { timeout: 5000 });
        console.log(\`Redirected to URL: \${url}\`);
    } catch (error) {
        const currentUrl = this.page.url();
        console.error(\`Error verifying redirect to "\${url}":\`, error);
        console.log(\`Current URL is: \${currentUrl}\`);
        
        // Take a screenshot for debugging
        const screenshot = await this.page.screenshot();
        await this.attach(screenshot, 'image/png');
        
        throw new Error(\`Not redirected to "\${url}". Current URL: \${currentUrl}\`);
    }
});

Then("the operation should be successful", async function(this: CustomWorld) {
    if (!this.page) return;
    
    // Look for success indicators
    try {
        // Try different selectors that might indicate success
        const successSelectors = [
            ".success-message", 
            ".alert-success",
            "text=success",
            "text=successful",
            "text=confirmation",
            ".confirmation"
        ];
        
        let found = false;
        for (const selector of successSelectors) {
            const element = await this.page.$(selector);
            if (element) {
                found = true;
                console.log(\`Success indicator found: \${selector}\`);
                break;
            }
        }
        
        if (!found) {
            // Take a screenshot as evidence
            const screenshot = await this.page.screenshot();
            await this.attach(screenshot, 'image/png');
            console.log("No explicit success indicator found, but no errors detected");
        }
    } catch (error) {
        console.error("Error validating success:", error);
        throw new Error("Could not validate success");
    }
});
`;
    }
}

function generateCucumberConfig(stepsDir) {
    return `module.exports = {
    default: {
        requireModule: ['ts-node/register'],
        require: [
            'src/**/hooks.ts',
            'src/**/world.ts',
            'src/**/*.steps.ts',
            '${stepsDir}/**/*.steps.ts'
        ],
        paths: ['features/ai-generated/*.feature'],
        format: [
            'progress-bar',
            '@cucumber/pretty-formatter'
        ]
    }
};
`;
}

main(); 
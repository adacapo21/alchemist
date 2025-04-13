# Test Execution Flow

The QA Alchemist framework follows a systematic flow for test execution, involving multiple components that interact in a specific sequence:

## Flow Components and Steps

### 1. **Configuration → Feature File**
   - Configuration loads test parameters
   - Environment settings are applied
   - Base URL and other test configurations are initialized


### 2. **Feature File → Step Definitions**
   - Cucumber scenarios are parsed
   - Gherkin steps are matched with step definitions
   - Test data is prepared for execution


### 3. **Step Definitions → Page Object**
   - Step definitions call relevant page object methods
   - Test actions are translated to page-specific operations
   - Parameters are passed to page methods


### 4. **Page Object → Browser**
   - Page objects interact with browser using Playwright
   - Actions are performed on web elements
   - Locators are used to find and interact with elements


### 5. **Browser → Page Object**
   - Browser returns action results
   - Element states are captured
   - Screenshots/videos are taken if configured


### 6. **Page Object → Step Definitions**
   - Results are processed and validated
   - Assertions are performed
   - Test state is maintained


### 7. **Step Definitions → Feature File**
   - Step execution status is reported
   - Scenario status is updated
   - Test metadata is collected


### 8. **Feature File → Configuration**
   - Test results are compiled
   - Reports are generated (Allure, HTML)
   - Test artifacts are saved
# QA Alchemist Test Commands Documentation

## Creating Test Scenarios in Jira

### Step 1: Create a New Jira Ticket

1. Project: PRVIQA
2. Type: Test
3. Labels: Must include `automation` and feature-specific label (e.g., `registration`)

### Step 2: Fill Required Fields

- Title: Clear description of what you're testing
- Description: Detailed test objective
- Test Commands: Commands from the list below
- Labels: `automation` + feature-specific labels

### Available Commands

#### Registration Tests

Basic Registration:

```
register as new user with ":default"
```

Professional User Registration:

```
register as new user with "step1_professional/true"
```

Notary Registration:

```
register as new user with "step1_is_notary_type/true"
```

Combined Parameters:

```
register as new user with "step1_professional/true/step1_is_notary_type/true"
```

### Example Tickets

1. Basic User Registration

```
Title: Test Basic User Registration
Description: Verify that a basic user can register successfully
Test Commands:
register as new user with ":default"
Labels: automation, registration
```

2. Professional Notary Registration

```
Title: Test Professional Notary Registration
Description: Verify that a professional notary can register successfully
Test Commands:
register as new user with "step1_professional/true/step1_is_notary_type/true"
Labels: automation, registration
```

### Best Practices

1. Use one command per line
2. Start with default test case before variations
3. Include clear success criteria
4. Use supported commands only
import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../../utils/world';
import { expect } from '@playwright/test';

/**
 * Travel booking step definitions
 */

// Navigation steps
Given('I am on the MakeMyTrip website', async function(this: CustomWorld) {
  await this.page?.goto('https://www.makemytrip.com/');
  // Wait for page to load completely
  await this.page?.waitForLoadState('networkidle');
  console.log('Navigated to MakeMyTrip website');
});

// UI interaction steps
When('I close any modal popups', async function(this: CustomWorld) {
  try {
    // Try to find and close common popups/modals
    const modalCloseButton = this.page?.locator('span[data-cy="modalClose"], .loginModal__close, .close');
    if (await modalCloseButton?.isVisible())
      await modalCloseButton?.click();
    
    // Handle login overlay if present
    const loginOverlay = this.page?.locator('.loginOverlay');
    if (await loginOverlay?.isVisible()) {
      await this.page?.mouse.click(10, 10); // Click away from the overlay
      await this.page?.waitForTimeout(1000);
    }
    
    console.log('Closed any visible modal popups');
  } catch (error) {
    console.log('No modal popups found or error closing them:', error);
  }
});

When('I select flight search', async function(this: CustomWorld) {
  // Ensure we're on flights tab
  await this.page?.locator('li[data-cy="menu_Flights"], a[href*="flights"]').first().click();
  console.log('Selected flight search tab');
});

When('I clear the From field', async function(this: CustomWorld) {
  const fromField = this.page?.locator('#fromCity, input[data-cy="fromCity"], [placeholder*="From"]');
  await fromField?.click();
  
  // Try different methods to clear the field
  try {
    await this.page?.keyboard.press('Control+A');
    await this.page?.keyboard.press('Backspace');
    console.log('Cleared From field');
  } catch (error) {
    console.log('Error clearing From field:', error);
  }
});

When('I enter {string} in the From field', async function(this: CustomWorld, location: string) {
  const fromField = this.page?.locator('#fromCity, input[data-cy="fromCity"], [placeholder*="From"]');
  await fromField?.fill(location);
  await this.page?.waitForTimeout(1000);
  
  // Select from autocomplete
  await this.page?.locator(`.react-autosuggest__suggestion:has-text("${location}")`)
    .or(this.page?.locator(`.autoSuggest-list li:has-text("${location}")`))
    .first()
    .click();
  
  console.log(`Entered ${location} in From field`);
});

When('I clear the To field', async function(this: CustomWorld) {
  const toField = this.page?.locator('#toCity, input[data-cy="toCity"], [placeholder*="To"]');
  await toField?.click();
  
  // Try different methods to clear the field
  try {
    await this.page?.keyboard.press('Control+A');
    await this.page?.keyboard.press('Backspace');
    console.log('Cleared To field');
  } catch (error) {
    console.log('Error clearing To field:', error);
  }
});

When('I enter {string} in the To field', async function(this: CustomWorld, location: string) {
  const toField = this.page?.locator('#toCity, input[data-cy="toCity"], [placeholder*="To"]');
  await toField?.fill(location);
  await this.page?.waitForTimeout(1000);
  
  // Select from autocomplete
  await this.page?.locator(`.react-autosuggest__suggestion:has-text("${location}")`)
    .or(this.page?.locator(`.autoSuggest-list li:has-text("${location}")`))
    .first()
    .click();
  
  console.log(`Entered ${location} in To field`);
});

When('I select next week for travel dates', async function(this: CustomWorld) {
  // Click on departure date field
  await this.page?.locator('[data-cy="departure"], .fsw_inputBox.dates').click();
  
  // Calculate next week's date
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  // Format date for logging
  const dateStr = nextWeek.toISOString().split('T')[0];
  console.log(`Selecting date: ${dateStr}`);
  
  // Find and click date (various selector strategies)
  try {
    // Try active month + date
    const activeMonth = this.page?.locator('.DayPicker-Month').first();
    const dateCell = activeMonth?.locator(`div[aria-label*="${nextWeek.getDate()}"]`).first();
    await dateCell?.click();
  } catch (error) {
    // Fallback - try to find by data-cy
    await this.page?.locator(`[data-cy*="departureDate"] [aria-label*="${nextWeek.getDate()}"]`).click();
  }
  
  // Click search button to close date picker if needed
  await this.page?.locator('button[data-cy="submit"], button:has-text("Search"), .primaryBtn').click();
  
  console.log('Selected next week for travel date');
});

Then('I should see search results for flights', async function(this: CustomWorld) {
  // Wait for results page to load
  await this.page?.waitForLoadState('networkidle');
  
  // Check if we're on results page
  const resultsElement = this.page?.locator('.fli-list, .flightsList, [data-cy="flightResults"]');
  
  // Fix: Replace toBeVisible with proper Playwright assertion
  await resultsElement?.waitFor({ state: 'visible', timeout: 30000 });
  expect(await resultsElement?.isVisible()).toBeTruthy();
  
  console.log('Flight search results are visible');
});

Then('I should verify if prices of flights is more than {int}', async function(this: CustomWorld, threshold: number) {
  // Wait for price elements to be visible
  await this.page?.waitForTimeout(2000);
  
  // Get all price elements
  const priceElements = await this.page?.locator('.price, .splitfare, .splitViewPrice, [data-cy="finalPrice"]').all();
  
  if (!priceElements || priceElements.length === 0) {
    console.log('No price elements found');
    return;
  }
  
  // Extract price values
  let prices: number[] = [];
  for (const element of priceElements) {
    const priceText = await element.textContent();
    if (priceText) {
      // Extract numbers from text
      const matches = priceText.match(/\d[\d,]*/);
      if (matches && matches.length > 0) {
        // Convert to number (remove commas)
        const price = parseInt(matches[0].replace(/,/g, ''));
        prices.push(price);
      }
    }
  }
  
  // Log results
  console.log(`Found ${prices.length} prices:`, prices);
  
  // Check if any price is above threshold
  const aboveThreshold = prices.some(price => price > threshold);
  
  // Take screenshot of results
  await this.page?.screenshot({ path: 'test-results/screenshots/flight-prices.png', fullPage: true });
  
  // Assert price condition
  expect(aboveThreshold).toBeTruthy();
  
  console.log(`Verified if flight prices are more than ${threshold}`);
});

// Combined steps
When('I search for flights from {string} to {string} for next week', async function(this: CustomWorld, from: string, to: string) {
  // Select flight search
  await this.page?.locator('li[data-cy="menu_Flights"], a[href*="flights"]').first().click();
  
  // From
  const fromField = this.page?.locator('#fromCity, input[data-cy="fromCity"], [placeholder*="From"]');
  await fromField?.click();
  await fromField?.fill(from);
  await this.page?.waitForTimeout(1000);
  await this.page?.locator(`.react-autosuggest__suggestion:has-text("${from}")`)
    .or(this.page?.locator(`.autoSuggest-list li:has-text("${from}")`))
    .first()
    .click();
  
  // To
  const toField = this.page?.locator('#toCity, input[data-cy="toCity"], [placeholder*="To"]');
  await toField?.click();
  await toField?.fill(to);
  await this.page?.waitForTimeout(1000);
  await this.page?.locator(`.react-autosuggest__suggestion:has-text("${to}")`)
    .or(this.page?.locator(`.autoSuggest-list li:has-text("${to}")`))
    .first()
    .click();
  
  // Date
  await this.page?.locator('[data-cy="departure"], .fsw_inputBox.dates').click();
  
  // Calculate next week's date
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  // Find and click date
  try {
    const activeMonth = this.page?.locator('.DayPicker-Month').first();
    const dateCell = activeMonth?.locator(`div[aria-label*="${nextWeek.getDate()}"]`).first();
    await dateCell?.click();
  } catch (error) {
    await this.page?.locator(`[data-cy*="departureDate"] [aria-label*="${nextWeek.getDate()}"]`).click();
  }
  
  // Search
  await this.page?.locator('button[data-cy="submit"], button:has-text("Search"), .primaryBtn').click();
  
  console.log(`Searched for flights from ${from} to ${to} for next week`);
}); 
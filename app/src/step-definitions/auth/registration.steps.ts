import {Given, Then, When} from "@cucumber/cucumber";
import {CustomWorld} from "../../utils/world";
import {expect} from "@playwright/test";
import {RegistrationPage} from "../../pages/RegistrationPage";
import {getConfig} from "../../config/environemnt.config";

/**
 * English step definitions
 * **/
Given(
  "I am on page {string}",
  async function (this: CustomWorld, pagePath: string) {
    const { baseUrl } = getConfig(); // Retrieve the base URL for the environment
    const fullUrl = `${baseUrl}${pagePath}`; // Combine base URL with relative path
    console.log(`Navigating to: ${fullUrl}`); // Debugging log to confirm the URL

    await this.setup();
    if (this.page) {
      this.registrationPage = new RegistrationPage(this.page);
      await this.page.goto(fullUrl);
    }
  },
);

Given("I set fullscreen", async function (this: CustomWorld) {
  await this.page?.setViewportSize({ width: 1920, height: 1080 });
});

When(
  "I register as new user with {string}",
  { timeout: 60000 },
  async function (this: CustomWorld, valuesString: string) {
    if (!this.registrationPage || !this.page) return;
    await this.registrationPage.registerNewUser(valuesString);
  },
);

Then(
  "I should be redirected to {string}",
  async function (this: CustomWorld, url: string) {
    if (!this.page) return;
    const regex = new RegExp(url.replace("/", "\\/") + "$");
    await expect(this.page).toHaveURL(regex);
  },
);

Then(
  "I login as {string} {string}",
  async function (this: CustomWorld, login: string, password: string) {
    if (!this.page || !this.registrationPage) return;

    if (login === ":testMail") {
      login = this.registrationPage.getTestMail() || "";
    }
    if (password === ":default") {
      password = "123456789#Aa";
    }

    await this.page.fill('[name="login"]', login);
    await this.page.fill('[name="password"]', password);
    await this.page.click("#visitor_connection_button");
  },
);

Then("I can read {string}", async function (this: CustomWorld, text: string) {
  if (!this.page) return;
  const locator = this.page.locator(`text=${text}`);
  await expect(locator).toBeVisible();
});

Then("I should see {string}", async function (this: CustomWorld, text: string) {
  if (!this.page) return;

  // Final assertion if retries fail
  console.log(`Final check for text "${text}"...`);
  const locator = this.page.locator(`text=${text}`);
  await expect(locator).toBeVisible({ timeout: 10000 });
  console.log(`Text "${text}" found successfully.`);
});

/**
 * French step definitions
 * **/

Given(
    "que je suis sur la page {string}",
    async function (this: CustomWorld, pagePath: string) {
        const {baseUrl} = getConfig();
        const fullUrl = `${baseUrl}${pagePath}`;
        console.log(`Navigation vers : ${fullUrl}`);
        await this.setup();
        if (this.page) {
            this.registrationPage = new RegistrationPage(this.page);
            await this.page.goto(fullUrl);
        }
    },
);

Given("que je mets en plein écran", async function (this: CustomWorld) {
    await this.page?.setViewportSize({width: 1920, height: 1080});
});

When(
    "je m'inscris en tant que nouvel utilisateur avec {string}",
    {timeout: 60000},
    async function (this: CustomWorld, valuesString: string) {
        if (!this.registrationPage || !this.page) return;
        await this.registrationPage.registerNewUser(valuesString);
    },
);

Then(
    "je devrais être redirigé vers {string}",
    async function (this: CustomWorld, url: string) {
        if (!this.page) return;
        const regex = new RegExp(url.replace("/", "\\/") + "$");
        await expect(this.page).toHaveURL(regex);
    },
);

Then(
    "je me connecte en tant que {string} {string}",
    async function (this: CustomWorld, login: string, password: string) {
        if (!this.page || !this.registrationPage) return;

        if (login === ":testMail") {
            login = this.registrationPage.getTestMail() || "";
        }
        if (password === ":default") {
            password = "123456789#Aa";
        }

        await this.page.fill('[name="login"]', login);
        await this.page.fill('[name="password"]', password);
        await this.page.click("#visitor_connection_button");
    },
);

Then("je peux lire {string}", async function (this: CustomWorld, text: string) {
    if (!this.page) return;
    const locator = this.page.locator(`text=${text}`);
    await expect(locator).toBeVisible();
});

Then(
    "je devrais voir {string}",
    async function (this: CustomWorld, text: string) {
    if (!this.page) return;

    console.log(`Vérification finale pour le texte "${text}"...`);
    const locator = this.page.locator(`text=${text}`);
        await expect(locator).toBeVisible({timeout: 10000});
    console.log(`Texte "${text}" trouvé avec succès.`);
    },
);

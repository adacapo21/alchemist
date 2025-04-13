import {Page} from "@playwright/test";
import {BasePage} from "./BasePage";

interface Step1Data {
  step1_mail: string;
  step1_mail_confirm: string;
  step1_mdp: string;
  step1_mdp_confirm: string;
  step1_is_notary_type: boolean;
  step1_professional: boolean;
}

interface Step2Data {
  step2_genre: string;
  step2_nom: string;
  step2_prenom: string;
  step2_adresse: string;
  step2_complement?: string;
  step2_commune_id: string;
  step2_ville: string;
  step2_societe: string;
  step2_telephone: string;
  step2_code_promo: string;
}

export class RegistrationPage extends BasePage {
  private testMail: string | null = null;
  readonly DEFAULT_PASSWORD = "123456789#Aa";
  readonly DEFAULT_TIMEOUT = 30000;
  constructor(page: Page) {
    super(page);
  }

  async acceptCookies(): Promise<void> {
    try {
      // Wait for cookie popup and click accept
      const acceptButton = this.page.locator("#didomi-notice-agree-button");
      await acceptButton.waitFor({state: "visible", timeout: 5000});
      await acceptButton.click();

      // Wait for popup to disappear
      await this.page
          .waitForSelector(".didomi-popup-open", {state: "hidden"})
          .catch(() => console.log("Cookie popup already closed"));

      console.log("Cookies accepted successfully");
    } catch (error) {
      console.warn("Cookie acceptance popup not found or already accepted");
    }
  }

  async submitStep1(data: Step1Data): Promise<void> {
    await this.acceptCookies();
    await this.page.waitForSelector('[name="step1_mail"]', {
      state: "visible",
    });
    await this.page.fill('[name="step1_mail"]', data.step1_mail);

    await this.page.waitForSelector('[name="step1_mail_confirm"]');
    await this.page.fill(
      '[name="step1_mail_confirm"]',
      data.step1_mail_confirm,
    );

    await this.page.fill('[name="step1_mdp"]', data.step1_mdp);
    await this.page.fill('[name="step1_mdp_confirm"]', data.step1_mdp_confirm);

    // Fixed: Use proper type for check options
    if (data.step1_is_notary_type) {
      await this.page.setChecked('[name="step1_is_notary_type"]', true);
    }

    if (data.step1_professional) {
      await this.page.setChecked('[name="step1_professional"]', true);
    }

    const submitButtonSelector = "input#step1_goto_next";

    // Wait for the button and ensure it is visible and enabled
    await this.page.waitForSelector(submitButtonSelector, {
      state: "visible",
    });
    await this.page.click(submitButtonSelector);

    console.log("Step 1 form submitted successfully.");
  }

  async submitStep2(data: Step2Data): Promise<void> {
    await this.page.selectOption('[name="step2_genre"]', data.step2_genre);
    await this.page.fill('[name="step2_nom"]', data.step2_nom);
    await this.page.fill('[name="step2_prenom"]', data.step2_prenom);
    await this.page.fill('[name="step2_raison_sociale"]', data.step2_societe); // Updated selector
    await this.page.fill('[name="step2_adresse"]', data.step2_adresse);

    if (data.step2_complement) {
      await this.page.fill('[name="step2_complement"]', data.step2_complement);
    }

    await this.page.evaluate((value) => {
      const input = document.querySelector(
        '[name="step2_commune_id"]',
      ) as HTMLInputElement;
      if (input) input.value = value;
    }, data.step2_commune_id);

    await this.page.fill('[name="step2_ville"]', data.step2_ville);
    await this.page.fill(
      '[name="step2_telephone"]',
      `06${data.step2_telephone}`,
    );

    await this.page.click("input#step2_goto_next");
  }

  async submitStep3(): Promise<void> {
    const infoPreventimmoSelector = "input#step3_info_preventimmo";
    const infoPartenaireSelector = "input#step3_info_partenaire";
    const createAccountButton = "input#step3_goto_next";
    const confirmationSelector = "h2";

    try {
      console.log("Starting Step 3...");

      console.log("Checking 'Ne souhaite pas recevoir info' checkbox...");
      await this.page.waitForSelector(infoPreventimmoSelector, {
        timeout: 15000,
      });
      await this.page.check(infoPreventimmoSelector);

      console.log("Checking 'Recevoir info partenaires' checkbox...");
      await this.page.waitForSelector(infoPartenaireSelector, {
        timeout: 15000,
      });
      await this.page.check(infoPartenaireSelector);

      console.log("Clicking 'Créer le compte' button...");
      await this.page.waitForSelector(createAccountButton, { timeout: 15000 });
      await this.page.click(createAccountButton);

      // Ensure the page finishes loading
      console.log("Waiting for the page to fully load...");
      await this.page.waitForLoadState("networkidle", { timeout: 20000 });

      console.log("Waiting for confirmation message...");
      const confirmationText =
        "Un email de confirmation vient de vous être envoyé";

      // Wait explicitly for the confirmation message
      await this.page.waitForSelector("h2", { timeout: 15000 });
      const pageText = await this.page.textContent("body");
      if (pageText?.includes(confirmationText)) {
        console.log("Confirmation message detected successfully.");
      } else {
        throw new Error("Confirmation message not found.");
      }

      // Take a screenshot for validation
      await this.page.screenshot({
        path: "test-results/screenshots/step3_confirmation.png",
        fullPage: true,
      });
      console.log("Screenshot captured successfully.");
    } catch (error) {
      console.error("Error during Step 3 submission:", error);
      throw error;
    }
  }

  async confirmEmail(): Promise<void> {
    console.log("Confirming email step: Verifying confirmation page...");

    const currentUrl = this.page.url();

    if (currentUrl.includes("etape=4")) {
      console.log("Confirmation page URL is correct: ", currentUrl);
    } else {
      console.warn("Unexpected URL:", currentUrl);
    }

    // Confirm that the expected confirmation message is visible
    const confirmationSelector = "h2";
    await this.page.waitForSelector(confirmationSelector, { timeout: 5000 });

    const confirmationText = await this.page.textContent(confirmationSelector);
    if (
      confirmationText?.includes(
        "Un email de confirmation vient de vous être envoyé",
      )
    ) {
      console.log("Email confirmation page detected successfully.");
    } else {
      console.warn(
        "Email confirmation message not found on the current page. Check the backend flow.",
      );
    }
  }

  async registerNewUser(valuesString: string): Promise<void> {
    // Generate test email if not exists
    this.testMail = `test${Date.now()}@preventimmo.test`;

    // Step 1 - Basic information
    const step1Data: Step1Data = {
      step1_mail: this.testMail,
      step1_mail_confirm: this.testMail,
      step1_mdp: this.DEFAULT_PASSWORD,
      step1_mdp_confirm: this.DEFAULT_PASSWORD,
      step1_is_notary_type: false,
      step1_professional: false,
    };

    // Step 2 - Personal information
    const step2Data: Step2Data = {
      step2_genre: "1",
      step2_nom: "test",
      step2_prenom: "Playwright",
      step2_adresse: "test",
      step2_complement: "",
      step2_commune_id: "1966",
      step2_ville: "06400+Cannes",
      step2_code_promo: "TEST",
      step2_societe: "TestSociete" + Math.floor(Math.random() * 1000), // Random Société name
      step2_telephone: "612345678",
    };

    // If custom values are provided, parse and override defaults
    if (valuesString !== ":default") {
      const pairs = valuesString.split("/");
      for (let i = 0; i < pairs.length - 1; i += 2) {
        const key = pairs[i];
        const value = pairs[i + 1];

        if (key.startsWith("step1_")) {
          (step1Data as any)[key] = value;
        } else if (key.startsWith("step2_")) {
          (step2Data as any)[key] = value;
        }
      }
    }

    // Execute registration steps
    console.log("Submitting Step 1...");
    await this.submitStep1(step1Data);
    console.log("Step 1 submitted successfully.");

    console.log("Submitting Step 2...");
    await this.submitStep2(step2Data);
    console.log("Step 2 submitted successfully.");

    console.log("Submitting Step 3...");
    await this.submitStep3();

    console.log("Confirming email...");
    await this.confirmEmail();
  }

  getTestMail(): string | null {
    return this.testMail;
  }
}

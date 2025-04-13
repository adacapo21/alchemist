import {IWorldOptions, setWorldConstructor, World} from "@cucumber/cucumber";
import {Browser, BrowserContext, chromium, firefox, Page, webkit,} from "@playwright/test";
import {RegistrationPage} from "../pages/RegistrationPage";
import {AllureRuntime, AllureTest} from "allure-js-commons";
import * as fs from "node:fs";
import path from "path";

let allureTest: AllureTest;
const allureResultsDir = process.env.ALLURE_RESULTS_DIR || path.resolve("allure-results");
const testResultsDir = process.env.TEST_RESULTS_DIR || path.resolve("test-results");

// ✅ Ensure directories exist before tests start
if (!fs.existsSync(allureResultsDir)) {
    fs.mkdirSync(allureResultsDir, {recursive: true});
}

if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, {recursive: true});
}

console.log(`✅ Test results directory: ${testResultsDir}`);
console.log(`✅ Allure results directory: ${allureResultsDir}`);
const allureRuntime = new AllureRuntime({
  resultsDir: allureResultsDir,
});

export class CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  registrationPage?: RegistrationPage;
  testName?: string;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async setup() {
    console.log(`✅ Launching browser with HEADLESS=${process.env.HEADLESS}`);
    const browserType = process.env.BROWSER || "chromium";

    // ✅ Define browser-specific options
    let browserOptions: any = {headless: process.env.HEADLESS !== "false"};
    const env = process.env.TEST_ENV || "testdev1";
    if (browserType === "chromium") {
      browserOptions.args = ["--no-sandbox", "--disable-setuid-sandbox"];
    } else if (browserType === "firefox") {
      browserOptions.firefoxUserPrefs = {
        "media.navigator.streams.fake": true,
        "media.navigator.permission.disabled": true,
      };
    } else if (browserType === "webkit") {
      // Webkit does not support `--no-sandbox`, so no args are needed.
      browserOptions.webkit = {
        deviceScaleFactor: 1,
      };
    }

    switch (browserType) {
      case "firefox":
        this.browser = await firefox.launch(browserOptions);
        break;
      case "webkit":
        this.browser = await webkit.launch(browserOptions);
        break;
      default:
        this.browser = await chromium.launch(browserOptions);
    }

    const videosDir = path.join(testResultsDir, "videos");
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, {recursive: true});
    }


    // ✅ Enable video recording conditionally
    const shouldRecordVideo = process.env.RECORD_VIDEO === "true";
    this.context = await this.browser.newContext({
      recordVideo: shouldRecordVideo
          ? {dir: videosDir, size: {width: 1280, height: 720}}
        : undefined,
    });

    this.page = await this.context.newPage();

    // Explicit wait for page events
    this.page.on("load", () => console.log("Page loaded successfully."));
    console.log("Page and context setup complete.");
  }

  async teardown(isFailed: boolean) {
    const video = this.page?.video();
    let videoPath: string | undefined;

    try {
      // Ensure page load state is complete before closing
      await this.page?.waitForLoadState("networkidle");

      // Retrieve video path
      videoPath = await video?.path();

      await this.page?.close();
      await this.context?.close();
      await this.browser?.close();

      if (videoPath) {
        console.log(`Video file saved at: ${videoPath}`);

        if (isFailed) {
          console.log("Attaching video for failed test...");
          try {
            const videoBuffer = await fs.promises.readFile(videoPath);
            const videoAttachmentPath = allureRuntime.writeAttachment(
              videoBuffer,
              {
                contentType: "video/webm",
                fileExtension: "webm",
              },
            );
            console.log(
              `Video attached successfully to Allure: ${videoAttachmentPath}`,
            );
          } catch (videoError: any) {
            console.warn(`Error attaching video: ${videoError.message}`);
          }
        } else {
          // Check if the file exists before attempting to delete
          try {
            await fs.promises.access(videoPath);
            console.log("Deleting video for passed test...");
            await fs.promises.unlink(videoPath)
              .then(() => console.log(`Video file ${videoPath} deleted successfully`))
              .catch(err => console.warn(`Error deleting video file: ${err.message}`));
          } catch (fileError) {
            console.warn(
              `Video already deleted or does not exist: ${videoPath}`,
            );
          }
        }
      }
    } catch (error) {
      console.error("Error handling video file during teardown:", error);
    } finally {
      // Always proceed with cleanup
      console.log("Teardown complete");
    }
  }

  async forceCleanup() {
    console.log("Force cleaning up browser and context...");
    if (this.page) {
      await this.page
          .close()
          .catch((e) => console.error("Error closing page:", e));
    }
    if (this.context) {
      await this.context
          .close()
          .catch((e) => console.error("Error closing context:", e));
    }
    if (this.browser) {
      await this.browser
          .close()
          .catch((e) => console.error("Error closing browser:", e));
    }
  }
}

setWorldConstructor(CustomWorld);

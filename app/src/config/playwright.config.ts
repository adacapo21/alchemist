import {PlaywrightTestConfig} from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 30000,
  reporter: [
    ["dot"],
    [
      "allure-playwright",
      {
        detail: true,
        outputFolder: "test-results/allure",
        suiteTitle: false,
      },
    ],
    ["html", { outputFolder: "test-results/html-report" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "Firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "Safari",
      use: {
        browserName: "webkit",
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
};

export default config;

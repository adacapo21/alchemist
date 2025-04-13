// src/config/browser-config.ts
export const browserOptions = {
  chromium: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    ignoreHTTPSErrors: true,
  },
  firefox: {
    firefoxUserPrefs: {
      "media.navigator.streams.fake": true,
      "media.navigator.permission.disabled": true,
    },
  },
  webkit: {
    webkit: {
      // Safari-specific options
      deviceScaleFactor: 1,
    },
  },
};

export const contextOptions = {
  viewport: { width: 1920, height: 1080 },
  permissions: ["geolocation"],
  recordVideo: {
    dir: "test-results/videos",
    size: { width: 1280, height: 720 },
  },
  ignoreHTTPSErrors: true,
};

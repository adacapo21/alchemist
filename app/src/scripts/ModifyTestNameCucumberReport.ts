import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const allureResultsPath = "allure-results";

const args = process.argv.slice(2); // Get all command-line arguments
const browserArg = args.find((arg) => arg.startsWith("--browser=")); // Find browser argument

// Extract browser value from argument
let browser = browserArg
    ? browserArg.split("=")[1]
    : process.env.BROWSER || "chromium";

// Ensure browser is always a string and valid
if (!browser || browser.trim().length === 0) {
  console.warn("⚠️ BROWSER is not set, defaulting to 'chromium'");
  browser = "chromium";
}

const formattedBrowser = browser.charAt(0).toUpperCase() + browser.slice(1);
console.log(`✅ Using browser for name modification: ${formattedBrowser}`);

const detectBrowser = (reportData: any) => {
  const browserLabels = reportData.labels?.find(
      (label: any) => label.name === "browser",
  );
  return browserLabels
      ? browserLabels.value
      : process.env.BROWSER || "chromium";
};
fs.readdir(allureResultsPath, (err, files) => {
  if (err) {
    console.error("❌ Error reading allure-results directory:", err);
    return;
  }

  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const filePath = path.join(allureResultsPath, file);

      fs.readFile(filePath, "utf8", (readErr, data) => {
        if (readErr) {
          console.error(`❌ Error reading ${file}:`, readErr);
          return;
        }

        try {
          let report = JSON.parse(data);
          // Detect browser from report if available
          const browserFromReport = detectBrowser(report);
          console.log(`📌 Detected Browser for ${file}: ${browserFromReport}`);

          if (report.name && report.fullName) {
            const env = process.env.TEST_ENV || "testdev1";
            const envAlias = env === "testdev1" ? "td1" : "td2";
            console.log(`Using browser: ${formattedBrowser}`);

            // Update test name
            report.name = `${report.name.split(" (")[0]} (${browserFromReport}-${envAlias})`;
            report.fullName = `${report.fullName.split(" (")[0]} (${browserFromReport}-${envAlias})`;

            fs.writeFile(
                filePath,
                JSON.stringify(report, null, 2),
                "utf8",
                (writeErr) => {
                  if (writeErr) {
                    console.error(`❌ Error writing modified ${file}:`, writeErr);
                  } else {
                    console.log(`✅ Modified test name in: ${file}`);
                  }
                },
            );
          }
        } catch (parseErr) {
          console.error(`❌ Error parsing ${file}:`, parseErr);
        }
      });
    }
  });
});

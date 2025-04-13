const reporter = require('cucumber-html-reporter');

const options = {
  theme: 'bootstrap',
  jsonFile: 'test-results/json/cucumber-report.json',
  output: 'test-results/html/cucumber-report.html',
  reportSuiteAsScenarios: true,
  launchReport: true,
};

reporter.generate(options);
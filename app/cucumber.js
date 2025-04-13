module.exports = {
    default: {
        requireModule: ['ts-node/register'],
        require: [
            'src/**/hooks.ts',
            'src/**/world.ts',
            'src/**/*.steps.ts'
        ],
        paths: ['src/**/*.feature'],
        format: [
            'progress-bar',
            '@cucumber/pretty-formatter'
        ]
    },
    allure: {
        requireModule: ['ts-node/register'],
        require: [
            'src/**/hooks.ts',
            'src/**/world.ts',
            'src/**/*.steps.ts'
        ],
        paths: ['src/**/*.feature'],
        format: [
            'progress-bar',
            "allure-cucumberjs/reporter",
            'json:allure-results/cucumber-report.json'
        ],
        tags: process.env.TAGS || '@registration'
    },
    html: {
        requireModule: ['ts-node/register'],
        require: [
            'src/**/hooks.ts',
            'src/**/world.ts',
            'src/**/*.steps.ts'
        ],
        paths: ['src/**/*.feature'],
        format: [
            'html:test-results/html/cucumber-report.html'
        ]
    }
};
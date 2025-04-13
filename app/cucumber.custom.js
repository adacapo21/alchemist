module.exports = {
    default: {
        requireModule: ['ts-node/register'],
        require: [
            'src/**/hooks.ts',
            'src/**/world.ts',
            'src/**/*.steps.ts',
            '/Users/angelos/Desktop/septeo/test-alchemist/app/src/step-definitions/ai-generated/**/*.steps.ts'
        ],
        paths: ['features/ai-generated/*.feature'],
        format: [
            'progress-bar',
            '@cucumber/pretty-formatter',
            'allure-cucumberjs/reporter',
            'json:allure-results/ai-tests-report.json'
        ]
    },
    allure: {
        requireModule: ['ts-node/register'],
        require: [
            'src/**/hooks.ts',
            'src/**/world.ts',
            'src/**/*.steps.ts',
            '/Users/angelos/Desktop/septeo/test-alchemist/app/src/step-definitions/ai-generated/**/*.steps.ts'
        ],
        paths: ['features/ai-generated/*.feature'],
        format: [
            'progress-bar',
            'allure-cucumberjs/reporter',
            'json:allure-results/ai-tests-report.json'
        ]
    }
};

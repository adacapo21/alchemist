pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Clean Workspace') {
            steps {
                deleteDir()
            }
        }

        stage('Configure and Run Tests') {
            steps {
                script {
                    def rawOutput = sh(script: "git ls-remote --heads git@bitbucket.org:kinaxia/qa-alchemist.git", returnStdout: true).trim()
                    def branches = rawOutput.split("\n").collect { it.split()[1].replace('refs/heads/', '') }

                    if (branches.isEmpty()) {
                        error("❌ No branches found in the repository!")
                    }

                    def userInput = input(
                        id: 'userInput',
                        message: 'Select test configuration',
                        parameters: [
                            choice(name: 'branch', choices: branches, description: 'Select a branch'),
                            choice(name: 'environment', choices: ['testdev1', 'testdev2', 'preprod'], description: 'Select a test environment'),
                            choice(name: 'browser', choices: ['chromium', 'firefox', 'webkit'], description: 'Select a browser'),
                            booleanParam(name: 'headless', defaultValue: true, description: 'Run tests in headless mode')
                        ]
                    )

                    echo "✅ Raw User Input: ${userInput}"

                    // Extract variables from input
                    def selectedBranch = userInput.branch
                    def selectedEnv = userInput.environment
                    def selectedBrowser = userInput.browser
                    def headlessMode = userInput.headless.toString().toLowerCase()

                    echo """
                    ✅ Selected Configuration:
                    - Branch: ${selectedBranch}
                    - Environment: ${selectedEnv}
                    - Browser: ${selectedBrowser}
                    - Headless Mode: ${headlessMode}
                    """

                    // Checkout the selected branch
                    echo "Checking out branch: ${selectedBranch}"
                    git(
                        url: 'git@bitbucket.org:kinaxia/qa-alchemist.git',
                        branch: selectedBranch
                    )

                    // Install dependencies
                    sh 'npm ci'
                    sh 'npx playwright install --with-deps chromium firefox webkit'

                    // Run tests
                    echo """
                    ✅ Running tests with:
                    - Environment: ${selectedEnv}
                    - Browser: ${selectedBrowser}
                    - Headless Mode: ${headlessMode}
                    """

                    def testCommand = "TEST_ENV=${selectedEnv} BROWSER=${selectedBrowser} HEADLESS=${headlessMode} npm run test:registration:${selectedBrowser}"
                    echo "Executing: ${testCommand}"
                    def exitCode = sh(script: testCommand, returnStatus: true)

                    if (exitCode != 0) {
                        error("❌ Tests failed on ${selectedBrowser} in ${selectedEnv} environment")
                    }

                    // Generate reports
                    sh 'npm run allure:generate'

                    // Publish Allure reports
                    allure([
                        results: [[path: 'allure-results']]
                    ])
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'test-results/**', fingerprint: true
        }
        failure {
            echo "❌ Tests failed. Check logs."
        }
        success {
            echo "✅ Tests completed successfully"
        }
    }
}
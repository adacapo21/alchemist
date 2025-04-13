# Use Playwright official image
FROM mcr.microsoft.com/playwright:v1.50.1-noble

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY ../app /app/

# Debug to verify files are copied
RUN echo "Contents of /app after copy:" && \
    ls -la /app && \
    echo "Looking for package.json:" && \
    find /app -name "package.json" 2>/dev/null

# Install dependencies
RUN if [ -f "/app/package.json" ]; then \
        cd /app && \
        npm ci && \
        npm install -g allure-commandline; \
    else \
        echo "ERROR: package.json not found!"; \
        exit 1; \
    fi

# Install Playwright dependencies
RUN npx playwright install --with-deps chromium firefox webkit

# Install Java (Required for Allure)
RUN apt-get update && apt-get install -y openjdk-11-jre && \
    apt-get clean
RUN echo "export JAVA_TOOL_OPTIONS='-Xmx512m -Xms256m -Xss1280k'" >> /etc/profile

# Updated Webkit dependencies for Ubuntu Noble
RUN apt-get update && apt-get install -y \
    libwoff1 libopus0 libwebp7 libwebpdemux2 libenchant-2-2 \
    libgudev-1.0-0 libsecret-1-0 libhyphen0 libgdk-pixbuf-2.0-0 \
    libegl1 libegl-mesa0 libevent-2.1-7 libnotify4 \
    libxshmfence1 libxrandr2 libxcb-shm0 libwayland-egl1 \
    libwayland-client0 libwayland-server0

# Set JAVA_HOME environment variable
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Install Allure CLI
RUN curl -o allure-2.27.0.tgz -Ls "https://github.com/allure-framework/allure2/releases/download/2.27.0/allure-2.27.0.tgz" && \
    tar -zxvf allure-2.27.0.tgz && \
    rm -f allure-2.27.0.tgz && \
    rm -rf /opt/allure 2>/dev/null || true && \
    mkdir -p /opt && \
    mv allure-2.27.0 /opt/allure && \
    rm -f /usr/bin/allure 2>/dev/null || true && \
    ln -s /opt/allure/bin/allure /usr/bin/allure

# Create directories for test results
RUN mkdir -p /app/allure-results /app/test-results/screenshots /app/test-results/videos && \
    chmod -R 777 /app/allure-results /app/test-results

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=test
# Set Allure result path explicitly
ENV ALLURE_RESULTS_PATH=/app/allure-results

# Default command to run tests
CMD ["tail", "-f", "/dev/null"]
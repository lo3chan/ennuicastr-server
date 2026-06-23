const { expect } = require("chai");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("entrypoint.sh Nginx Configuration Tests", function () {
    let tempDir;
    let nginxConfigPath;

    before(function () {
        // Create a temporary directory structure for testing
        tempDir = fs.mkdtempSync(path.join("/tmp", "entrypoint-test-"));
        nginxConfigPath = path.join(tempDir, "default");

        // Copy entrypoint.sh and modify it slightly to just output the Nginx config
        // instead of actually running servers or setting ownership.
        const entrypointContent = fs.readFileSync(path.join(__dirname, "../entrypoint.sh"), "utf8");

        // We want to extract the part that generates the nginx config.
        const nginxConfigGeneration = entrypointContent.match(/cat > \/etc\/nginx\/sites-available\/default << NGINX_EOF\n([\s\S]*?)NGINX_EOF/)[1];

        // Write a test script that generates the config locally
        const testScript = `
cat > ${nginxConfigPath} << NGINX_EOF
${nginxConfigGeneration}
NGINX_EOF
        `;

        const scriptPath = path.join(tempDir, "generate-nginx.sh");
        fs.writeFileSync(scriptPath, testScript);
        fs.chmodSync(scriptPath, 0o755);

        // Run the script to generate the config
        execSync(scriptPath);
    });

    after(function () {
        // Cleanup
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("should fallback to /index.jss for root requests", function () {
        const configContent = fs.readFileSync(nginxConfigPath, "utf8");

        // Check for the specific location block
        const locationBlockMatch = configContent.match(/location \/ \{[^}]+\}/g);
        expect(locationBlockMatch).to.not.be.null;

        // At least one location / block should have the fallback
        const hasFallback = locationBlockMatch.some(block => block.includes("try_files $uri $uri/ /index.jss;"));
        expect(hasFallback).to.be.true;
    });

    it("should fallback to =404 for /r/ requests", function () {
        const configContent = fs.readFileSync(nginxConfigPath, "utf8");

        // Extract the location /r/ block
        const rLocationStart = configContent.indexOf("location /r/ {");
        expect(rLocationStart).to.not.equal(-1);

        // Just check if it contains the 404 fallback before the next top-level location
        const partialConfig = configContent.substring(rLocationStart);
        expect(partialConfig).to.include("try_files $uri $uri/ =404;");
    });

    it("should configure client_max_body_size to 1024M", function () {
        const configContent = fs.readFileSync(nginxConfigPath, "utf8");
        expect(configContent).to.include("client_max_body_size 1024M;");
    });

    it("should set correct Cross-Origin headers", function () {
        const configContent = fs.readFileSync(nginxConfigPath, "utf8");
        expect(configContent).to.include("add_header 'Cross-Origin-Opener-Policy' 'same-origin';");
        expect(configContent).to.include("add_header 'Cross-Origin-Embedder-Policy' 'require-corp';");
    });

    it("should configure SCRIPT_FILENAME with fastcgi", function () {
        const configContent = fs.readFileSync(nginxConfigPath, "utf8");
        expect(configContent).to.include("fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;");
    });
});

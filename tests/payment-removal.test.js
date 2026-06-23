const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

describe("Payment Removal Verification", function () {
    const rootDir = path.join(__dirname, "..");

    it("should not contain subscription or credit scripts", function() {
        const deletedPaths = [
            "web/panel/subscription",
            "web/panel/credits",
            "web/panel/gateway",
            "web/panel/login/paypal",
            "subscription/create-stripe.js",
            "subscription/create-paypal.js",
            "payment.js",
            "credits.js",
            "web/panel/credits.jss"
        ];

        for (const p of deletedPaths) {
            expect(fs.existsSync(path.join(rootDir, p))).to.be.false;
        }
    });

    it("should not contain 'purchased' or 'cost' references in rec.js", function() {
        const recPath = path.join(rootDir, "rec.js");
        if (fs.existsSync(recPath)) {
            const content = fs.readFileSync(recPath, "utf8");
            expect(content).to.not.include("purchased");
            expect(content).to.not.include("cost");
        }
    });

    it("should not contain 'cost' references in server/ennuicastr.ts", function() {
        const serverPath = path.join(rootDir, "server", "ennuicastr.ts");
        if (fs.existsSync(serverPath)) {
            const content = fs.readFileSync(serverPath, "utf8");
            expect(content).to.not.include("cost");
            expect(content).to.not.include("purchased");
        }
    });

    it("should not contain checkout references in the database schema", function() {
        const schemaPath = path.join(rootDir, "db", "ennuicastr.schema");
        if (fs.existsSync(schemaPath)) {
            const content = fs.readFileSync(schemaPath, "utf8");
            expect(content).to.not.include("stripe_checkouts");
            expect(content).to.not.include("preferred_payment_gateways");
            expect(content).to.not.include("credits");
        }
    });
});

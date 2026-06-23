const { expect } = require("chai");
const proxyquire = require("proxyquire");

describe("config.js Module Tests", function () {
    let originalEnv;

    beforeEach(function () {
        originalEnv = process.env.HOME;
    });

    afterEach(function () {
        process.env.HOME = originalEnv;
    });

    it("should replace ~ with process.env.HOME in configuration paths", function () {
        process.env.HOME = "/mock/home/dir";

        const mockConfigJson = {
            repo: "~/repo",
            db: "~/db",
            rec: "~/rec",
            sounds: "~/sounds",
            cert: "~/cert",
            clientRepo: "~/clientRepo",
            otherValue: "untouched"
        };

        const configModule = proxyquire("../config.js", {
            "./config.json": mockConfigJson
        });

        expect(configModule.repo).to.equal("/mock/home/dir/repo");
        expect(configModule.db).to.equal("/mock/home/dir/db");
        expect(configModule.rec).to.equal("/mock/home/dir/rec");
        expect(configModule.sounds).to.equal("/mock/home/dir/sounds");
        expect(configModule.cert).to.equal("/mock/home/dir/cert");
        expect(configModule.clientRepo).to.equal("/mock/home/dir/clientRepo");
        expect(configModule.otherValue).to.equal("untouched");
    });
});

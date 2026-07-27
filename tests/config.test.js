const { expect } = require("chai");
const proxyquire = require("proxyquire");
const sinon = require("sinon");
const fs = require("fs");

describe("Config Tests", () => {
    it("should load and proxy config", () => {
        const configMock = { db: "~/test", site: "https://test.com/" };

        const fsMock = {
            statSync: sinon.stub().returns({ mtimeMs: 100 }),
            readFileSync: sinon.stub().returns(JSON.stringify(configMock))
        };

        process.env.HOME = "/home/user";

        const config = proxyquire("../config.js", {
            "fs": fsMock
        });

        expect(config.site).to.equal("https://test.com/");
        expect(config.db).to.equal("/home/user/test");

        // Test modifying doesn't work (proxy set is blocked)
        config.site = "https://hacked.com/";
        expect(config.site).to.equal("https://test.com/");
    });
});

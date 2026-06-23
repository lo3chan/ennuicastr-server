const { expect } = require("chai");
const proxyquire = require("proxyquire");
const sinon = require("sinon");

describe("username.js Module Tests", function () {
    let usernameModule;
    let dbStub;

    beforeEach(function () {
        dbStub = {
            db: {
                getP: sinon.stub()
            }
        };

        usernameModule = proxyquire("../username.js", {
            "./db.js": { ...dbStub, '@noCallThru': true }
        });
    });

    describe("validate(uname)", function () {
        it("should allow valid usernames", function () {
            expect(usernameModule.validate("JohnDoe_123")).to.equal("JohnDoe_123");
            expect(usernameModule.validate("test-user")).to.equal("test-user");
        });

        it("should replace invalid characters with underscores", function () {
            // Newlines and control characters are disallowed
            expect(usernameModule.validate("hello\nworld")).to.equal("hello_world");

            // Testing weird emojis or unicode might vary based on \p{} unicode properties
            // We just test basic replacements.
        });

        it("should return '_' if username trims to empty", function () {
            expect(usernameModule.validate("   ")).to.equal("_");
            expect(usernameModule.validate("")).to.equal("_");
        });
    });

    describe("getUsername(uid)", function () {
        it("should fetch from database if not cached", async function () {
            dbStub.db.getP.resolves({ username: "db_user" });

            const result = await usernameModule.getUsername("uid123");
            expect(result).to.equal("db_user");
            expect(dbStub.db.getP.calledOnce).to.be.true;
            expect(dbStub.db.getP.firstCall.args[0]).to.include("SELECT * FROM usernames WHERE uid=@UID;");
            expect(dbStub.db.getP.firstCall.args[1]).to.deep.equal({ "@UID": "uid123" });
        });

        it("should return empty string if user not found in database", async function () {
            dbStub.db.getP.resolves(undefined);

            const result = await usernameModule.getUsername("uid_unknown");
            expect(result).to.equal("");
        });

        it("should return cached username on subsequent calls", async function () {
            dbStub.db.getP.resolves({ username: "cached_user" });

            const result1 = await usernameModule.getUsername("uid_cache");
            const result2 = await usernameModule.getUsername("uid_cache");

            expect(result1).to.equal("cached_user");
            expect(result2).to.equal("cached_user");
            expect(dbStub.db.getP.calledOnce).to.be.true; // Should only hit DB once
        });
    });

    describe("getDisplay(uid)", function () {
        it("should combine username and short uid", async function () {
            dbStub.db.getP.resolves({ username: "testuser" });
            const result = await usernameModule.getDisplay("longuid123456");

            expect(result).to.equal("testuser#longu"); // First 5 chars of uid
        });

        it("should work correctly when uid is shorter than 5 chars", async function () {
            dbStub.db.getP.resolves({ username: "testuser" });
            const result = await usernameModule.getDisplay("abc");

            expect(result).to.equal("testuser#abc");
        });
    });
});

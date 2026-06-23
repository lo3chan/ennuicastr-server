const { expect } = require("chai");
const proxyquire = require("proxyquire");
const sinon = require("sinon");

describe("db.js Module Tests", function () {
    let dbModule;
    let sqlite3Stub;
    let configStub;
    let mockDbInstance;
    let mockLogDbInstance;
    let mockLogStmtA;
    let logStmtRunStub;

    beforeEach(function () {
        mockDbInstance = {
            run: sinon.stub().callsArgWith(1, null), // run callback style
            get: sinon.stub().callsArgWith(1, null, {}), // get callback style
            all: sinon.stub().callsArgWith(1, null, []), // all callback style
        };

        // Ensure binding works by setting a basic wrapper
        mockDbInstance.run.bind = sinon.stub().returns(mockDbInstance.run);
        mockDbInstance.get.bind = sinon.stub().returns(mockDbInstance.get);
        mockDbInstance.all.bind = sinon.stub().returns(mockDbInstance.all);

        mockLogDbInstance = {
            run: sinon.stub().callsArgWith(1, null),
            get: sinon.stub().callsArgWith(1, null, {}),
            all: sinon.stub().callsArgWith(1, null, []),
            prepare: sinon.stub()
        };

        mockLogDbInstance.run.bind = sinon.stub().returns(mockLogDbInstance.run);
        mockLogDbInstance.get.bind = sinon.stub().returns(mockLogDbInstance.get);
        mockLogDbInstance.all.bind = sinon.stub().returns(mockLogDbInstance.all);

        logStmtRunStub = sinon.stub().callsArgWith(1, null);

        mockLogStmtA = {
            run: logStmtRunStub
        };
        mockLogStmtA.run.bind = sinon.stub().returns(mockLogStmtA.run);

        mockLogDbInstance.prepare.returns(mockLogStmtA);

        sqlite3Stub = {
            Database: sinon.stub()
        };

        // Constructor stub behavior
        sqlite3Stub.Database.onFirstCall().returns(mockDbInstance);
        sqlite3Stub.Database.onSecondCall().returns(mockLogDbInstance);

        configStub = {
            db: "/mock/db/path"
        };

        dbModule = proxyquire("../db.js", {
            "sqlite3": sqlite3Stub,
            "./config.js": configStub
        });
    });

    it("should export db, logdb, and log function", function () {
        expect(dbModule).to.have.property("db");
        expect(dbModule).to.have.property("logdb");
        expect(dbModule).to.have.property("log").that.is.a("function");
    });

    it("should promisify run, get, and all on db instances", function () {
        expect(dbModule.db.runP).to.be.a("function");
        expect(dbModule.db.getP).to.be.a("function");
        expect(dbModule.db.allP).to.be.a("function");
        expect(dbModule.logdb.runP).to.be.a("function");
        expect(dbModule.logdb.getP).to.be.a("function");
        expect(dbModule.logdb.allP).to.be.a("function");
    });

    it("should call logStmt when log is called", async function () {
        await dbModule.log("test-type", "test-details", { uid: "user1", rid: 123 });

        expect(logStmtRunStub.calledOnce).to.be.true;

        const callArgs = logStmtRunStub.firstCall.args[0];
        expect(callArgs["@TYPE"]).to.equal("test-type");
        expect(callArgs["@DETAILS"]).to.equal("test-details");
        expect(callArgs["@UID"]).to.equal("user1");
        expect(callArgs["@RID"]).to.equal(123);
        expect(callArgs["@TIME"]).to.be.a("string");
    });

    it("should use default uid and rid if extra is not provided to log", async function () {
        await dbModule.log("type-only", "details-only");

        expect(logStmtRunStub.calledOnce).to.be.true;
        const callArgs = logStmtRunStub.firstCall.args[0];

        expect(callArgs["@UID"]).to.equal("");
        expect(callArgs["@RID"]).to.equal(-1);
    });

    it("should retry log insertion if it fails initially", async function () {
        // Fail on first call, succeed on second
        logStmtRunStub.onFirstCall().callsArgWith(1, new Error("mock error"));
        logStmtRunStub.onSecondCall().callsArgWith(1, null);

        await dbModule.log("retry-type", "retry-details");

        expect(logStmtRunStub.calledTwice).to.be.true;
    });
});

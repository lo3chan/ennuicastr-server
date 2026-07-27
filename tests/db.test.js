const { expect } = require("chai");
const proxyquire = require("proxyquire");
const sinon = require("sinon");

describe("Database Tests", () => {
    let db;
    let dbMock;
    let logdbMock;

    beforeEach(() => {
        dbMock = {
            run: sinon.stub(),
            get: sinon.stub(),
            all: sinon.stub(),
            prepare: sinon.stub().returns({ run: sinon.stub().yields(null) })
        };
        logdbMock = {
            run: sinon.stub(),
            get: sinon.stub(),
            all: sinon.stub(),
            prepare: sinon.stub().returns({ run: sinon.stub().yields(null) })
        };

        // Setup yields for util.promisify
        dbMock.run.yields(null);
        dbMock.get.yields(null);
        dbMock.all.yields(null);
        logdbMock.run.yields(null);
        logdbMock.get.yields(null);
        logdbMock.all.yields(null);

        class Database {
            constructor(file) {
                return file.includes("log") ? logdbMock : dbMock;
            }
        }

        db = proxyquire("../db.js", {
            "sqlite3": { Database },
            "./config.js": { db: "/test/db" }
        });
    });

    it("should export db and log functions", () => {
        expect(db).to.have.property("db");
        expect(db).to.have.property("logdb");
        expect(db).to.have.property("log");
    });
});

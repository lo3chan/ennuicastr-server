const { expect } = require("chai");
const proxyquire = require("proxyquire");
const sinon = require("sinon");
const EventEmitter = require("events");

describe("rec.js Module Tests", function () {
    let recModule;
    let dbStub;
    let logStub;
    let netStub;
    let fsStub;
    let configStub;
    let mockSocket;

    beforeEach(function () {
        dbStub = {
            allP: sinon.stub(),
            getP: sinon.stub(),
            runP: sinon.stub()
        };
        logStub = sinon.stub();

        mockSocket = new EventEmitter();
        mockSocket.write = sinon.stub();

        netStub = {
            createConnection: sinon.stub().returns(mockSocket)
        };

        fsStub = {
            unlinkSync: sinon.stub()
        };

        configStub = {
            limits: { simultaneous: 3 },
            sock: "/mock/sock",
            clientShort: "https://mock.com/",
            rec: "/mock/rec"
        };

        recModule = proxyquire("../rec.js", {
            "./db.js": { db: dbStub, log: logStub, '@noCallThru': true },
            "net": netStub,
            "fs": fsStub,
            "./config.js": configStub
        });
    });

    describe("get(rid, uid, opts)", function () {
        it("should return null if recording not found", async function () {
            dbStub.getP.resolves(null);
            const result = await recModule.get(1, "uid1");
            expect(result).to.be.null;
        });

        it("should return recording if user is owner", async function () {
            const mockRec = { rid: 1, uid: "uid1" };
            dbStub.getP.resolves(mockRec);

            const result = await recModule.get(1, "uid1");
            expect(result).to.deep.equal(mockRec);
            expect(dbStub.getP.calledOnce).to.be.true;
        });

        it("should check sharing if user is not owner", async function () {
            const mockRec = { rid: 1, uid: "uid1" };
            dbStub.getP.onFirstCall().resolves(mockRec);
            dbStub.getP.onSecondCall().resolves({ rid: 1, uid_from: "uid1", uid_to: "uid2" });

            const result = await recModule.get(1, "uid2");
            expect(result).to.deep.equal(mockRec);
        });

        it("should return null if user is not owner and no share exists", async function () {
            const mockRec = { rid: 1, uid: "uid1" };
            dbStub.getP.onFirstCall().resolves(mockRec);
            dbStub.getP.onSecondCall().resolves(null); // No share

            const result = await recModule.get(1, "uid2");
            expect(result).to.be.null;
        });
    });

    describe("hostUrl(rec, opts)", function () {
        it("should generate a URL based on recording features", function () {
            const mockRec = {
                rid: 12345,
                key: 67890,
                master: 11111,
                continuous: true, // feature flag 1
                rtc: true,       // feature flag 2
                port: 3000
            };

            const url = recModule.hostUrl(mockRec);
            // feature = 1 | 2 = 3
            // base36 of 12345 is '9ix', 67890 is '1gdu', 11111 is '8kn', port is '2bc', flags is '3'
            expect(url).to.equal("https://mock.com/?9ix-1gdu-m8kn-p2bc-f3&quick=1");
        });

        it("should handle extra options properly", function () {
            const mockRec = {
                rid: 12345,
                key: 67890,
                master: 11111,
                extra: JSON.stringify({ jitsiAudio: true }) // feature flag 0x800 = 2048
            };

            const url = recModule.hostUrl(mockRec, { noport: true });
            expect(url).to.equal("https://mock.com/?9ix-1gdu-m8kn-f1kw&quick=1"); // 2048 in base36 is '1kw'
        });
    });

    describe("del(rid, uid, opts)", function () {
        it("should return false if recording not found or not owned by user", async function () {
            dbStub.getP.resolves(null);
            expect(await recModule.del(1, "uid1")).to.be.false;

            dbStub.getP.resolves({ uid: "uid2", status: 0x30 });
            expect(await recModule.del(1, "uid1")).to.be.false;
        });

        it("should return false if recording is not finished and force is not true", async function () {
            dbStub.getP.resolves({ uid: "uid1", status: 0x20 }); // < 0x30
            expect(await recModule.del(1, "uid1")).to.be.false;
        });

        it("should delete files and move db record if valid", async function () {
            const mockRec = {
                uid: "uid1", rid: 1, name: "Test", init: 0, start: 0, end: 0, expiry: 0, tracks: 1, status: 0x30
            };
            dbStub.getP.resolves(mockRec);
            dbStub.runP.resolves();

            const result = await recModule.del(1, "uid1");

            expect(result).to.be.true;
            expect(fsStub.unlinkSync.callCount).to.equal(7); // 7 file extensions deleted
            expect(logStub.calledOnce).to.be.true;

            // Check transactions
            expect(dbStub.runP.calledWith("BEGIN TRANSACTION;")).to.be.true;
            expect(dbStub.runP.calledWith("COMMIT;")).to.be.true;
        });
    });

    describe("rec(recParams, opts)", function () {
        it("should reject if user is over simultaneous limits", async function () {
            dbStub.allP.resolves([{}, {}, {}]); // limit is 3
            const result = await recModule.rec({ uid: "uid1" });
            expect(result).to.be.a("string").that.includes("simultaneous recordings");
        });

        it("should connect to socket and return new recording", async function () {
            dbStub.allP.resolves([]); // under limit

            const recPromise = recModule.rec({ uid: "uid1" });

            // Ensure write was called after a microtick
            setTimeout(() => {
                expect(netStub.createConnection.calledOnce).to.be.true;

                // Simulate socket response
                const msg = Buffer.from(JSON.stringify({ c: "ready", r: { rid: 999 } }) + "\n");
                mockSocket.emit("data", msg);
            }, 10);

            const result = await recPromise;
            expect(result).to.deep.equal({ rid: 999 });
        });
    });
});

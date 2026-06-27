const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();
const sinon = require("sinon");
const fs = require("fs");
const crypto = require("crypto");

describe("login/index.jss Server Page", function () {
    let output = "";
    let status = 200;
    let headers = {};

    const mockRequest = { method: "GET", body: {} };
    const mockResponse = {
        writeHead: (code, hdr) => { status = code; Object.assign(headers, hdr || {}); },
        write: (d) => { output += d; },
        end: () => {}
    };
    const mockSession = { init: sinon.stub().resolves(), set: sinon.stub().resolves() };
    const mockInclude = sinon.stub().resolves();

    beforeEach(() => {
        output = "";
        status = 200;
        headers = {};
        mockRequest.method = "GET";
        mockRequest.body = {};
        mockSession.init.resetHistory();
        mockSession.set.resetHistory();
        mockInclude.resetHistory();
    });

    const runScript = async (configMock = {}) => {
        let fileContent = fs.readFileSync("web/panel/login/index.jss", "utf8");

        let mode = 0;
        let script = "";
        function flush(last) {
            if (mode === 0) script += "write(" + JSON.stringify(last) + ");\n";
            else if (mode === 1 || mode === 2) script += last + "\n";
            else if (mode === 3) script += "write(" + last + ");\n";
        }

        let i = 0;
        while (true) {
            let tagOpen = fileContent.indexOf("<?JS", i);
            let tagClose = fileContent.indexOf("?>", i);
            if (mode === 0) {
                if (tagOpen === -1) { flush(fileContent.slice(i)); break; }
                flush(fileContent.slice(i, tagOpen));
                i = tagOpen + 4;
                if (fileContent[i] === "!") { mode = 2; i++; }
                else if (fileContent[i] === "=") { mode = 3; i++; }
                else mode = 1;
            } else {
                if (tagClose === -1) { flush(fileContent.slice(i)); break; }
                flush(fileContent.slice(i, tagClose));
                mode = 0;
                i = tagClose + 2;
                if (fileContent[i] === "\n") i++;
            }
        }

        const myRequire = (mod) => {
            if (mod === "crypto") return crypto;
            if (mod === "fs") return { readFileSync: () => JSON.stringify({}), writeFileSync: () => {} };
            if (mod === "../../config.js") return configMock;
            return {};
        };
        myRequire.resolve = () => "/app/config.json";

        // mock include so that it simulates `await include("login.jss")`
        const localInclude = async (f, arg) => {
            if (f === "login.jss" || f === "./login.jss") return { login: async () => "123" };
            return mockInclude(f, arg);
        };

        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const func = new AsyncFunction("require", "write", "writeHead", "session", "request", "response", "include", script);

        await func(myRequire, mockResponse.write, mockResponse.writeHead, mockSession, mockRequest, mockResponse, localInclude);
    };

    it("should show setup screen if no adminPasswordHash is set", async () => {
        await runScript({});
        expect(output).to.include("This appears to be your first time logging in. Please set an admin password.");
    });

    it("should process setup POST successfully and redirect", async () => {
        mockRequest.method = "POST";
        mockRequest.body = { password: "strongpassword123" };

        await runScript({});

        expect(status).to.equal(302);
        expect(headers.location).to.equal("/panel/");
    });

    it("should show login screen if adminPasswordHash exists", async () => {
        await runScript({ adminPasswordHash: "somehash" });
        expect(output).to.include("Please enter your admin password:");
    });
});

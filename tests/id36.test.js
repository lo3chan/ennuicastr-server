const { expect } = require("chai");
const id36 = require("../id36.js");
const words = require("../words.js");

describe("id36.js Module Tests", function () {
    this.timeout(10000); // Increase timeout since id36 generation can loop for a bit

    describe("genID(len)", function () {
        it("should generate an ID of the specified length", function () {
            const length = 10;
            const id = id36.genID(length);
            expect(id).to.be.a("string");
            expect(id.length).to.equal(length);
        });

        it("should generate an ID that does not contain banned words", function () {
            const id = id36.genID(16);
            expect(words.test(id)).to.be.false;
        });
    });

    describe("genInt()", function () {
        it("should generate a 31-bit integer", function () {
            const int = id36.genInt();
            expect(int).to.be.a("number");
            expect(int).to.be.at.least(0);
            expect(int).to.be.below(2147483648);
        });

        it("should generate an integer whose base36 representation is not a banned word", function () {
            const int = id36.genInt();
            expect(words.test(int.toString(36))).to.be.false;
        });
    });

    describe("genKey()", function () {
        it("should generate a 32-byte key", function () {
            const key = id36.genKey();
            expect(key).to.be.instanceOf(Buffer);
            expect(key.length).to.equal(32);
        });
    });

    describe("Encryption and Decryption (enc and dec)", function () {
        it("should correctly encrypt and decrypt a message", function () {
            const key = id36.genKey();
            const message = "Hello World! 12345";

            const encrypted = id36.enc(message, key);
            expect(encrypted).to.be.instanceOf(Buffer);
            expect(encrypted).to.not.equal(message); // Make sure it's actually encrypted

            const decrypted = id36.dec(encrypted, key);
            expect(decrypted).to.equal(message);
        });

        it("should work with empty strings", function() {
            const key = id36.genKey();
            const message = "";
            const encrypted = id36.enc(message, key);
            const decrypted = id36.dec(encrypted, key);
            expect(decrypted).to.equal(message);
        });
    });
});

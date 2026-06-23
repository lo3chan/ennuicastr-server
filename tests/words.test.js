const { expect } = require("chai");
const words = require("../words.js");

describe("words.js Module Tests", function () {
    it("should export a regular expression", function () {
        expect(words).to.be.instanceOf(RegExp);
    });

    it("should match banned words", function () {
        expect(words.test("word")).to.be.true;
        expect(words.test("wordy")).to.be.true;
        expect(words.test("zymochemistry")).to.be.true;
        expect(words.test("abandon")).to.be.true;
    });

    it("should not match safe random strings", function () {
        // These are random non-dictionary words that should fail the test
        expect(words.test("xyzzyq")).to.be.false;
        expect(words.test("qwvzxj")).to.be.false;
        expect(words.test("123456")).to.be.false; // Numeric
    });

    it("should be case-insensitive", function() {
        expect(words.test("WORD")).to.be.true;
        expect(words.test("wOrD")).to.be.true;
    });
});

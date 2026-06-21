const id36 = require('../id36.js');

describe('id36 encryption and decryption', () => {
    let key;

    beforeAll(() => {
        key = id36.genKey();
    });

    test('should correctly generate a 32-byte key', () => {
        expect(key.length).toBe(32);
        expect(Buffer.isBuffer(key)).toBe(true);
    });

    test('should encrypt and decrypt a normal string', () => {
        const data = 'hello world';
        const encrypted = id36.enc(data, key);
        const decrypted = id36.dec(encrypted, key);
        expect(decrypted).toBe(data);
    });

    test('should encrypt and decrypt an empty string', () => {
        const data = '';
        const encrypted = id36.enc(data, key);
        const decrypted = id36.dec(encrypted, key);
        expect(decrypted).toBe(data);
    });

    test('should encrypt and decrypt a very long string', () => {
        const data = 'A'.repeat(10000);
        const encrypted = id36.enc(data, key);
        const decrypted = id36.dec(encrypted, key);
        expect(decrypted).toBe(data);
    });

    test('should encrypt and decrypt strings with special characters', () => {
        const data = '!@#$%^&*()_+~`|}{[]:;?><,./-=\\';
        const encrypted = id36.enc(data, key);
        const decrypted = id36.dec(encrypted, key);
        expect(decrypted).toBe(data);
    });

    test('should encrypt and decrypt unicode strings', () => {
        const data = 'こんにちは、世界！ 😊';
        const encrypted = id36.enc(data, key);
        const decrypted = id36.dec(encrypted, key);
        expect(decrypted).toBe(data);
    });
});

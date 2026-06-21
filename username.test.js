jest.mock('./db.js', () => ({
    db: {
        getP: jest.fn()
    }
}));

const { validate } = require('./username');

describe('username validation', () => {
    it('should allow simple alphanumeric usernames', () => {
        expect(validate('user123')).toBe('user123');
        expect(validate('Alice')).toBe('Alice');
        expect(validate('Bob_Smith')).toBe('Bob_Smith');
        expect(validate('charlie-brown')).toBe('charlie-brown');
    });

    it('should replace invalid characters with underscores', () => {
        // According to the regex, letters, numbers, punctuation, space, underscore, dash are allowed
        // # is explicitly replaced.
        expect(validate('user#name')).toBe('user_name');

        // $ is a symbol (not punctuation, letter or number)
        expect(validate('user$name')).toBe('user_name');

        // + is a symbol (math)
        expect(validate('user+name')).toBe('user_name');

        expect(validate('a#b')).toBe('a_b');

        // Control characters are definitely invalid
        expect(validate('user\x01name')).toBe('user_name');
    });

    it('should allow valid punctuation', () => {
        // Punctuation characters are allowed according to \p{Punctuation}
        expect(validate('hello!world')).toBe('hello!world');
        expect(validate('user.name')).toBe('user.name');
        expect(validate('test,name')).toBe('test,name');
        expect(validate('user@name')).toBe('user@name');
    });

    it('should handle unicode letters properly', () => {
        expect(validate('björk')).toBe('björk');
        expect(validate('佐藤')).toBe('佐藤'); // Japanese
        expect(validate('Александр')).toBe('Александр'); // Cyrillic
        expect(validate('أحمد')).toBe('أحمد'); // Arabic
        expect(validate('محمد')).toBe('محمد');
    });

    it('should handle unicode numbers', () => {
        expect(validate('user١٢٣')).toBe('user١٢٣'); // Arabic numerals
    });

    it('should fallback to "_" if the string evaluates to empty after validation and trim', () => {
        expect(validate('   ')).toBe('_');
        expect(validate('')).toBe('_');
    });

    it('should trim whitespace from the ends', () => {
        expect(validate('  test  ')).toBe('test');
        expect(validate('  test user  ')).toBe('test user');
    });
});

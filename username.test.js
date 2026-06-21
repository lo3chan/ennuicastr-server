jest.mock('./db.js', () => ({ db: {} }));

const { validate } = require('./username.js');

describe('username validate', () => {
  it('returns the same string for simple alphanumeric usernames', () => {
    expect(validate("JohnDoe123")).toBe("JohnDoe123");
  });

  it('preserves spaces in the middle of the username', () => {
    expect(validate("John Doe")).toBe("John Doe");
  });

  it('trims whitespace from the beginning and end', () => {
    expect(validate("  John Doe  ")).toBe("John Doe");
  });

  it('replaces # with _', () => {
    expect(validate("John#Doe")).toBe("John_Doe");
    expect(validate("#")).toBe("_");
  });

  it('returns _ for empty strings or strings that are just spaces', () => {
    expect(validate("")).toBe("_");
    expect(validate("   ")).toBe("_");
  });

  it('preserves allowed punctuation like period and exclamation mark', () => {
    expect(validate("John.Doe!")).toBe("John.Doe!");
  });

  it('replaces unsupported characters like emojis or control characters with _', () => {
    expect(validate("John😊Doe")).toBe("John_Doe");
    expect(validate("John\nDoe")).toBe("John_Doe");
    expect(validate("John\tDoe")).toBe("John_Doe");
    // $ is not in \p{Punctuation} in js
    expect(validate("John$Doe")).toBe("John_Doe");
  });
});

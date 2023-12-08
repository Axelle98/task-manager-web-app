// tests/utils.test.js

const { add } = require('../utils');

describe('add', () => {
  test('should add two numbers correctly', () => {
    const result = add(2, 3);

    expect(result).toBe(5);
  });
});

// You can add more tests for other utility functions in utils.js

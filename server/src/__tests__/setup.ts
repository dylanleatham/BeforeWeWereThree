/**
 * Jest test setup for server tests
 */

import { jest, afterEach } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

// Mock console.error to reduce noise in tests (optional - comment out for debugging)
// jest.spyOn(console, 'error').mockImplementation(() => {});

// Increase timeout for async tests
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

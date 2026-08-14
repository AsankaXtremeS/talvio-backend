/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  moduleNameMapper: {
    '^../../config/db$': '<rootDir>/src/config/db',
    '^../../config/env$': '<rootDir>/src/config/env',
    '^../../utils/jwt$': '<rootDir>/src/utils/jwt',
    '^../../utils/email$': '<rootDir>/src/utils/email',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

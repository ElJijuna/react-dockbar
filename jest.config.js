import baseConfig from 'super-configs/jest';

/** @type {import('jest').Config} */
export default {
  ...baseConfig,
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '\\.module\\.css$': 'identity-obj-proxy',
    '\\.css$': '<rootDir>/src/test-utils/styleMock.ts',
  },
};

import { Config } from 'jest';
import { defaults } from 'jest-config';

const config: Config = {
  bail: true,
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest', {
        tsconfig: 'tsconfig.test.json',
        compiler: 'ttypescript',
      },
    ],
  },
  setupFilesAfterEnv: [
    './tests/setupTests.ts',
  ],
  moduleNameMapper: {
    '^node-fetch$': '<rootDir>/tests/nodeFetchMock.js',
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$': '<rootDir>/tests/jestMock.js',
  },
  // ts-built/ et build/ contiennent la sortie compilée (ttsc/vite) : ne pas y chercher de tests
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/ts-built/', '<rootDir>/build/'],
  modulePathIgnorePatterns: ['<rootDir>/ts-built/', '<rootDir>/build/'],
  testEnvironment: '<rootDir>/tests/jsdomEnvironment.js',
  verbose: true,
};

export default config;
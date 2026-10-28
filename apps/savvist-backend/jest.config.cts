module.exports = {
  displayName: 'savvist-backend',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(@nestjs/mongoose))'],
  moduleNameMapper: {
    '^@nestjs/mapped-types$': '<rootDir>/src/test-utils/mapped-types.mock.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/savvist-backend',
};

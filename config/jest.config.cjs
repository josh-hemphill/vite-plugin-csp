const jsWithTs = require('ts-jest/presets').jsWithTs;
/** @type {import('@jest/types').InitialOptions} */
const config = {
	'rootDir':'../',
	'preset': 'ts-jest/presets/js-with-ts',
	testEnvironment: 'node',
	moduleFileExtensions: ['ts', 'js'],
	'testMatch': [
		'**/src/**/*.test.[tj]s',
		'**/test*/**/*.[tj]s',
	],
	'testPathIgnorePatterns': [
		'tests/.test-data',
	],
	resolver: '<rootDir>/config/jest-resolver.cjs',
	'transform': {
		...jsWithTs.transform,
	},
	'coverageReporters': [
		'text-summary',
		'json', 'lcov', 'text', 'clover',
	],
	'bail': true,
	globals: {
		'ts-jest': {
		},
	},
};

module.exports = config;

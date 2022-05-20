/* eslint-disable @typescript-eslint/ban-ts-comment */
import { PluginOption } from 'vite';
import { DebugAble, PolicyOptions } from '../src/consts.js';
import { ViteCspPlugin } from '../src/index.js';

const checkReportToValidation = (
	isSeparatePolicy: boolean,
	isNested = false,
) => {
	it('validates `report-to` policy groups', () => {
		const policy = { 'report-to': 'hello' };
		const invalidContent = {
			sendReportsTo: [
				{
					group: 'notHello',
					max_age: 1200,
					endpoints: [{ url: 'example.com' }],
				},
			],
		};
		const validContent = {
			sendReportsTo: [
				{
					group: 'hello',
					max_age: 1200,
					endpoints: [{ url: 'example.com' }],
				},
			],
		};
		let createInvalidPlugin: jest.Mock<PluginOption>;
		let createValidPlugin: jest.Mock<PluginOption>;
		if (isSeparatePolicy) {
			createInvalidPlugin = jest.fn(() =>
				//@ts-ignore
				ViteCspPlugin(policy, invalidContent),
			);
			createValidPlugin = jest.fn(() =>
				//@ts-ignore
				ViteCspPlugin(policy, validContent),
			);
		} else if (isNested) {
			createInvalidPlugin = jest.fn(() =>
				//@ts-ignore
				ViteCspPlugin({
					...invalidContent,
					mapHtmlFiles: { someFile: policy },
				}),
			);
			createValidPlugin = jest.fn(() =>
				//@ts-ignore
				ViteCspPlugin({
					...validContent,
					mapHtmlFiles: { someFile: policy },
				}),
			);
		} else {
			createInvalidPlugin = jest.fn(() =>
				//@ts-ignore
				ViteCspPlugin({ ...invalidContent, policy }),
			);
			createValidPlugin = jest.fn(() =>
				//@ts-ignore
				ViteCspPlugin({ ...validContent, policy }),
			);
		}
		try {
			createValidPlugin();
			createInvalidPlugin();
		} catch (_) {
			('nothing');
		}
		expect(createValidPlugin).not.toThrowError();
		expect(createInvalidPlugin).toThrowError();
	});
};

describe('ViteCspPlugin(policy,options).debugProperties.policy', () => {
	const differentPolicy: PolicyOptions = {
		'base-uri': 'unsafe-eval',
		'object-src': 'unsafe-eval',
		'script-src': 'unsafe-eval',
		'style-src': 'unsafe-eval',
	};

	it('ignores `options.policy` in favor of `policy`', () => {
		const plugin = ViteCspPlugin(differentPolicy, {
			debugPlugin: true,
			policy: {
				'base-uri': 'none',
				'object-src': 'none',
				'script-src': 'none',
				'style-src': 'none',
			},
		});
		const { policy } = (<DebugAble>plugin).debugProperties;
		expect(policy.CSP).toEqual(differentPolicy);
	});

	checkReportToValidation(false);
});

describe('ViteCspPlugin(options).debugProperties.policy', () => {
	it('sets policy options over defaults', () => {
		const differentPolicy: PolicyOptions = {
			'base-uri': 'unsafe-eval',
			'object-src': 'unsafe-eval',
			'script-src': 'unsafe-eval',
			'style-src': 'unsafe-eval',
		};
		const plugin = ViteCspPlugin({
			policy: differentPolicy,
			debugPlugin: true,
		});
		const { policy } = (<DebugAble>plugin).debugProperties;
		expect(policy.CSP).toEqual(differentPolicy);
	});

	it('sets policy directives with correct quoting', () => {
		const differentPolicy: PolicyOptions = {
			'base-uri': ['https:', 'localhost:*'],
			'object-src': ['https:', 'localhost:*'],
			'script-src': ['https:', 'localhost:*'],
			'style-src': ['https:', 'localhost:*'],
		};
		const plugin = ViteCspPlugin({
			policy: differentPolicy,
			debugPlugin: true,
		});
		const { policy } = (<DebugAble>plugin).debugProperties;
		expect(policy.getHeaders()).toMatchInlineSnapshot(`
		Object {
		  "Content-Security-Policy": "object-src https: localhost:*; script-src https: localhost:*; style-src https: localhost:*; base-uri https: localhost:*;",
		  "Content-Security-Policy-Report-Only": "",
		  "Referrer-Policy": "strict-origin-when-cross-origin",
		  "Report-To": "",
		}
	`);
	});

	checkReportToValidation(true);
});

describe('ViteCspPlugin(options).debugProperties.validatedMappedPolicies', () => {
	it('creates nested `html file matched` policies', () => {
		const differentPolicy: PolicyOptions = {
			'base-uri': 'unsafe-eval',
			'object-src': 'unsafe-eval',
			'script-src': 'unsafe-eval',
			'style-src': 'unsafe-eval',
		};
		const plugin = ViteCspPlugin({
			mapHtmlFiles: {
				someFile: differentPolicy,
			},
			debugPlugin: true,
		});
		const { validatedMappedPolicies } = (<DebugAble>plugin).debugProperties;
		const policy = validatedMappedPolicies['someFile'];
		expect(policy.CSP).toEqual(differentPolicy);
	});

	checkReportToValidation(false, true);
});

describe('ViteCspPlugin(options).{ReferrerHeader,ReportOnly}', () => {
	it('Accepts as part of param array for Policy', () => {
		const differentPolicy: PolicyOptions = {
			'base-uri': 'unsafe-eval',
			'object-src': 'unsafe-eval',
			'script-src': 'unsafe-eval',
			'style-src': 'unsafe-eval',
		};
		const plugin = ViteCspPlugin({
			policy: [differentPolicy, undefined, differentPolicy, 'unsafe-url'],
			debugPlugin: true,
		});
		const { policy } = (<DebugAble>plugin).debugProperties;
		expect(policy.ReferrerHeader).toEqual('unsafe-url');
		expect(policy.ReportOnly).toEqual(differentPolicy);
	});

	it('Overwrites policy params with base options if present', () => {
		const dPolicy1: PolicyOptions = {
			'base-uri': 'unsafe-eval',
			'object-src': 'unsafe-eval',
			'script-src': 'unsafe-eval',
			'style-src': 'unsafe-eval',
		};
		const dPolicy2: PolicyOptions = {
			'base-uri': 'none',
			'object-src': 'none',
			'script-src': 'none',
			'style-src': 'none',
		};
		const plugin = ViteCspPlugin({
			policy: [dPolicy1, undefined, dPolicy1, 'unsafe-url'],
			reportSubset: dPolicy2,
			referrerHeaderOverride: 'none',
			debugPlugin: true,
		});
		const { policy } = (<DebugAble>plugin).debugProperties;
		expect(policy.ReferrerHeader).toEqual('none');
		expect(policy.ReportOnly).toEqual(dPolicy2);
	});
});

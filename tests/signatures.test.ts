import { ViteCspPlugin, ViteCspPluginOptions } from '../src/index.js';
import { DebugProperties } from '../src/consts.js';
import { Plugin } from 'vite';

type DebugAble = Plugin & { debugProperties: DebugProperties };

describe('ViteCspPlugin()', () => {
	it('returns required signature', () => {
		const plugin = ViteCspPlugin();
		expect(plugin).toMatchInlineSnapshot(
			{
				configResolved: expect.any(Function),
				transform: expect.any(Function),
				transformIndexHtml: expect.any(Function),
			},
			`
		Object {
		  "apply": "build",
		  "configResolved": Any<Function>,
		  "enforce": "post",
		  "name": "vite-plugin-csp",
		  "transform": Any<Function>,
		  "transformIndexHtml": Any<Function>,
		}
	`);
	});
	it('returns undefined if disabled', () => {
		const plugin = ViteCspPlugin({ enabled: false });
		expect(plugin).toBe(undefined);
	});
	it('assigns config', () => {
		const plugin = ViteCspPlugin({ debugPlugin: true });
		const commandValue = 'build';
		if (
			plugin &&
			plugin.configResolved &&
			typeof plugin.configResolved === 'function'
		) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-ignore
			plugin.configResolved({command:commandValue});
		}
		const { config } = (<DebugAble>plugin).debugProperties;
		expect(config.command).toBe(commandValue);
	});
	it('applies non-default options', () => {
		const customOptions: Partial<ViteCspPluginOptions> = {
			inject: false,
			onDev: 'full',
			hashingMethod: 'sha512',
			hashEnabled: {
				'script-src': false,
				'script-src-attr': false,
				'style-src': false,
				'style-src-attr': false,
			},
			nonceEnabled: {
				'script-src': true,
				'style-src': true,
			},
			processFn: ['CaddyJSON', jest.fn()],
		};
		const plugin = ViteCspPlugin({
			...customOptions,
			debugPlugin: true,
		});
		const debugProperties = (<DebugAble>plugin).debugProperties;
		expect(debugProperties).toMatchInlineSnapshot(
			{
				idMap: expect.any(Map),
				policy: expect.any(Object),
				processFns: [expect.any(Function), expect.any(Function)],
				validatedMappedPolicies: expect.any(Object),
			},
			`
		Object {
		  "config": Object {},
		  "hashEnabled": Object {
		    "script-src": false,
		    "script-src-attr": false,
		    "style-src": false,
		    "style-src-attr": false,
		  },
		  "hashingMethod": "sha512",
		  "idMap": Any<Map>,
		  "inject": false,
		  "nonceEnabled": Object {
		    "script-src": true,
		    "style-src": true,
		  },
		  "onDev": "full",
		  "policy": Any<Object>,
		  "processFns": Array [
		    Any<Function>,
		    Any<Function>,
		  ],
		  "validatedMappedPolicies": Any<Object>,
		}
	`,
		);
	});
});

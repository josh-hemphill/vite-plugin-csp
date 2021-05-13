import {
	builtinProcessorFns,
	builtinProcessorFiles,
} from '../src/builtin-processors/index.js';
import mockFs from 'mock-fs';
import {
	DebugAble,
	InternalProcessFn,
	InternalProcessFnNames,
	ProcessFnContext,
} from '../src/consts.js';
import { CspDirectiveHeaders } from 'csp-typed-directives';
import { readFileSync } from 'fs';
import { join } from 'path';
import ViteCspPlugin from '../src/index.js';

const baseContext: ProcessFnContext = {
	path: 'string',
	htmlFileName: 'string',
	srvConfDir: '.server_config',
	builtinProcessorFns: builtinProcessorFns,
};
const baseHeaders: CspDirectiveHeaders = {
	'Content-Security-Policy-Report-Only': '',
	'Content-Security-Policy': '',
	'Report-To': '',
	'Referrer-Policy': '',
};

describe('ViteCspPlugin({ processFn:[] })', () => {
	it('filters invalid processors',()=>{
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		//@ts-ignore
		const plugin = ViteCspPlugin({ processFn: ['blah blah',{no:'invalid'},12], debugPlugin: true });
		const { processFns } = (<DebugAble>plugin).debugProperties;
		expect(processFns.length).toStrictEqual(0);
	});
	describe('builtin processors', () => {
		const builtins = <[InternalProcessFnNames, InternalProcessFn][]>(
			Object.entries(builtinProcessorFns)
		);
		describe.each(builtins)('%s(processorOptions)', (name, fn) => {
			it('creates default config', () => {
				mockFs({});
				fn({
					processor: name,
					ctx: baseContext,
					parsedHeaders: baseHeaders,
				});
				const processorDefaultFile = builtinProcessorFiles[name];
				const fileText = readFileSync(
					join(baseContext.srvConfDir, processorDefaultFile),
					{ encoding: 'utf-8' },
				);
				mockFs.restore();
				expect(fileText).toMatchSnapshot(name);
			});
			it('creates custom config', () => {
				const srvConfDir = '.server_config';
				const fileName = name + '.conf';
				mockFs({});
				fn({
					processor: name,
					ctx: {
						...baseContext,
						srvConfDir,
					},
					parsedHeaders: baseHeaders,
					outFile: fileName,
				});
				const fileText = readFileSync(
					join(baseContext.srvConfDir, fileName),
					{ encoding: 'utf-8' },
				);
				mockFs.restore();
				expect(fileText).toMatchSnapshot(name);
			});
		});
		describe('plugin.transformIndexHtml() => buildConfigs()', () => {
			it.each(builtins)('creates default config for %s', (name, _fn) => {
				const plugin = ViteCspPlugin({ processFn: [name] });
				mockFs({});
				if (
					plugin &&
					plugin.transformIndexHtml &&
					typeof plugin.transformIndexHtml === 'function'
				) {
					plugin.transformIndexHtml('', { path: '', filename: '' });
				}
				const processorDefaultFile = builtinProcessorFiles[name];
				const fileText = readFileSync(
					join(baseContext.srvConfDir, processorDefaultFile),
					{ encoding: 'utf-8' },
				);
				mockFs.restore();
				expect(fileText).toMatchSnapshot(name);
			});
			it.each(builtins)('creates custom config for %s', (name, _fn) => {
				const srvConfDir = '.server_config';
				const fileName = name + '.conf';
				const plugin = ViteCspPlugin({
					processFn: [
						{
							processor: name,
							outFile: fileName,
						},
					],
					srvConfDir,
				});
				mockFs({});
				if (
					plugin &&
					plugin.transformIndexHtml &&
					typeof plugin.transformIndexHtml === 'function'
				) {
					plugin.transformIndexHtml('', { path: '', filename: '' });
				}
				const fileText = readFileSync(
					join(baseContext.srvConfDir, fileName),
					{ encoding: 'utf-8' },
				);
				mockFs.restore();
				expect(fileText).toMatchSnapshot(name);
			});
		});
	});
	describe('custom processor', () => {
		it('receives consistent params', async () => {
			const srvConfDir = '.server_config';
			const fileName = 'custom.conf';
			let processFnPropSig: unknown[] = [];
			const plugin = ViteCspPlugin({
				processFn: [
					(...args) => {
						processFnPropSig = args;
						return { name: fileName, content: 'hello world' };
					},
				],
				srvConfDir,
			});
			mockFs({});
			if (
				plugin &&
				plugin.transformIndexHtml &&
				typeof plugin.transformIndexHtml === 'function'
			) {
				await plugin.transformIndexHtml('', { path: '', filename: '' });
			}
			const fileText = readFileSync(
				join(baseContext.srvConfDir, fileName),
				{ encoding: 'utf-8' },
			);
			mockFs.restore();
			expect(fileText).toBe('hello world');
			expect(processFnPropSig).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "builtinProcessorFns": Object {
			      "CaddyJSON": [Function],
			      "CaddyJSON_HeadersOnly": [Function],
			      "Caddyfile": [Function],
			      "Caddyfile_HeadersOnly": [Function],
			      "Nginx": [Function],
			      "Nginx_HeadersOnly": [Function],
			    },
			    "htmlFileName": "",
			    "path": "",
			    "srvConfDir": ".server_config",
			  },
			  Object {
			    "Content-Security-Policy": "object-src 'none'; script-src 'unsafe-inline' 'self' 'unsafe-eval'; script-src-attr; style-src 'unsafe-inline' 'self' 'unsafe-eval'; style-src-attr; base-uri 'self';",
			    "Content-Security-Policy-Report-Only": "",
			    "Referrer-Policy": "strict-origin-when-cross-origin",
			    "Report-To": "",
			  },
			]
		`);
		});
	});
});

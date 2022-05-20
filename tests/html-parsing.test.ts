import { readFileSync } from 'fs';
import path from 'path';
import { IndexHtmlTransformResult } from 'vite';
import { DebugAble } from '../src/consts.js';
import { ViteCspPlugin } from '../src/index.js';
import mockFs from 'mock-fs';
const testFilesContent = ['index.html', 'main.js', 'main2.js', 'test.css'].map(
	(v) => ({
		text: readFileSync('tests/.test-data/' + v, {
			encoding: 'utf-8',
		}),
		file: v,
	}),
);

afterAll(() => {
	mockFs.restore();
});

describe('plugin.transformIndexHtml()', () => {
	describe('HTML content', () => {
		it('creates valid hashes', async () => {
			const plugin = ViteCspPlugin({
				policy: {
					'base-uri': 'unsafe-eval',
					'object-src': 'unsafe-eval',
					'script-src': 'unsafe-eval',
					'style-src': 'unsafe-eval',
				},
			});
			let hashes: unknown = '';
			if (
				plugin &&
				plugin.transformIndexHtml &&
				typeof plugin.transformIndexHtml === 'function'
			) {
				const headers = await plugin.transformIndexHtml(
					testFilesContent[0].text,
					{
						path: '',
						filename: '',
					},
				);
				if (headers && Array.isArray(headers)) {
					hashes = headers.find(
						(v) =>
							v.tag === 'meta' &&
							v.attrs?.['http-equiv'] ===
							'Content-Security-Policy',
					)?.attrs?.content;
				}
			}
			expect(hashes).toMatchInlineSnapshot(
				`"object-src 'unsafe-eval';
				script-src 'unsafe-eval'
					'sha384-ideMhCR6OBp8nfkLWj6ZimjnsIT6sRbPYefI7cyaV1tAWOvFZx+26BqpOWKdR8Ym';
				script-src-attr
					'sha384-c23foA8LVWSqmGoVRqUsf5lASwN8unYNRr8qJuhkkWwU4ICLN6WArwfv+Tb+yBxn';
				style-src 'unsafe-eval'
					'sha384-ZFchH0Vh8mzL2jg8jCotTe4UwKAp0sBGoL0RwuHloOKErVM2Dr39imcjvKPRrosI';
				style-src-attr
					'sha384-j6AqPm53uxM91atZu2wlBuabpEwZ8fol7/Ptz36bIE+fYe+BCuSjCkB7s4IlDHan'
					'sha384-7N5SR/us2Uqts3pJWURD5adJUTl1dniUhj1khCPI8tdKkVQQhPHSB8vpNVJ9NBgH'
					'sha384-mG6q16U0ytNf1Di6czNDfqsMDUqfoUwAIrfeZwLl6mIj7zfKTe4oMgJi7BnHtsWH'
					'sha384-HT+PGjhjAFadu+vxQVYe04TfclvsuACD9BD3e6OAbGQdJIhZUiNHU3BvLUWB7dCr';
				base-uri 'unsafe-eval';"`.replace(/\n\t+/g, ' '),
			);
		});
		it('uses hash cache from modules', async () => {
			const plugin = ViteCspPlugin({
				policy: {
					'base-uri': 'unsafe-eval',
					'object-src': 'unsafe-eval',
					'script-src': 'unsafe-eval',
					'style-src': 'unsafe-eval',
				},
				onDev: 'full',
			});
			let hashes: unknown = '';
			if (
				plugin &&
				plugin.transform &&
				typeof plugin.transform === 'function'
			) {
				for (const file of testFilesContent) {
					const fileId = path.resolve(
						'tests/.test-data/' + file.file,
					);
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					await plugin.transform(file.text, fileId);
				}
			}
			if (
				plugin &&
				plugin.transformIndexHtml &&
				typeof plugin.transformIndexHtml === 'function'
			) {
				const headers = await plugin.transformIndexHtml(
					testFilesContent[0].text,
					{
						path: '',
						filename: '',
					},
				);
				if (headers && Array.isArray(headers)) {
					hashes = headers.find(
						(v) =>
							v.tag === 'meta' &&
							v.attrs?.['http-equiv'] ===
							'Content-Security-Policy',
					)?.attrs?.content;
				}
			}
			expect(hashes).toMatchInlineSnapshot(
				`"object-src 'unsafe-eval';
				script-src 'unsafe-eval'
					'sha384-4OA9oLbM0L7allUVhjBIMHW7BP4R65GG0TYj7VCeFSCl7qM8/X8tCjc+Gx5uE/20'
					'sha384-ideMhCR6OBp8nfkLWj6ZimjnsIT6sRbPYefI7cyaV1tAWOvFZx+26BqpOWKdR8Ym'
					'sha384-8wFCdHJ+Zm3j1h/RQTxIo58hx051U1Vs8IHW9UxYzZg+ylnbj3fH7+UWwAUSe3of';
				script-src-attr
					'sha384-c23foA8LVWSqmGoVRqUsf5lASwN8unYNRr8qJuhkkWwU4ICLN6WArwfv+Tb+yBxn';
				style-src 'unsafe-eval'
					'sha384-ZFchH0Vh8mzL2jg8jCotTe4UwKAp0sBGoL0RwuHloOKErVM2Dr39imcjvKPRrosI'
					'sha384-BH0wmMpEYjSsKmYmASJBskfwtrixFSLCphySyJuHIOKhjmVEbLp1d1yr+ewWtfRe';
				style-src-attr
					'sha384-j6AqPm53uxM91atZu2wlBuabpEwZ8fol7/Ptz36bIE+fYe+BCuSjCkB7s4IlDHan'
					'sha384-7N5SR/us2Uqts3pJWURD5adJUTl1dniUhj1khCPI8tdKkVQQhPHSB8vpNVJ9NBgH'
					'sha384-mG6q16U0ytNf1Di6czNDfqsMDUqfoUwAIrfeZwLl6mIj7zfKTe4oMgJi7BnHtsWH'
					'sha384-HT+PGjhjAFadu+vxQVYe04TfclvsuACD9BD3e6OAbGQdJIhZUiNHU3BvLUWB7dCr';
				base-uri 'unsafe-eval';"`.replace(/\n\t+/g, ' '),
			);
		});
	});
	describe('multiple html files', () => {
		it('maps policies', async () => {
			const mapHtmlFiles = {
				'baseHtml.html': {
					'script-src': 'none',
				},
				'nested/baseHtml2.html': {
					'script-src': 'self',
				},
				'/root/nested/baseHtml3.html': {
					'script-src': 'unsafe-inline',
				},
			} as const;
			const dirs = Object.entries(mapHtmlFiles)
				.map((v) => [v[0], JSON.stringify(v[1])])
				.reduce((acc, v) => ({ ...acc, [v[0]]: v[1] }), {});
			mockFs(dirs);
			const plugin = ViteCspPlugin({
				debugPlugin: true,
				mapHtmlFiles,
			});
			const getContent = (res: void | IndexHtmlTransformResult) =>
				<string>(
					(res &&
						Array.isArray(res) &&
						res.find(
							(v) =>
								v.tag === 'meta' &&
								v.attrs?.['http-equiv'] ===
								'Content-Security-Policy',
						)?.attrs?.content)
				) || '';
			const headerResults = {
				directives1: '',
				directives2: '',
				directives3: '',
			};
			if (
				plugin &&
				plugin.transformIndexHtml &&
				typeof plugin.transformIndexHtml === 'function'
			) {
				headerResults.directives1 = getContent(
					await plugin.transformIndexHtml('', {
						path: '',
						filename: 'baseHtml.html',
					}),
				);
				headerResults.directives2 = getContent(
					await plugin.transformIndexHtml('', {
						path: 'nested',
						filename: 'baseHtml2.html',
					}),
				);
				headerResults.directives3 = getContent(
					await plugin.transformIndexHtml('', {
						path: '/root/nested',
						filename: 'baseHtml3.html',
					}),
				);
			}
			mockFs.restore();
			expect(headerResults).toMatchInlineSnapshot(`
			Object {
			  "directives1": "script-src 'none'; script-src-attr; style-src; style-src-attr;",
			  "directives2": "script-src 'self'; script-src-attr; style-src; style-src-attr;",
			  "directives3": "script-src 'unsafe-inline'; script-src-attr; style-src; style-src-attr;",
			}
		`);
		});
	});
});

describe('plugin.transform()', () => {
	it('hashes modules', async () => {
		const plugin = ViteCspPlugin({ debugPlugin: true, onDev: 'full' });
		if (
			plugin &&
			plugin.transform &&
			typeof plugin.transform === 'function'
		) {
			for (const file of testFilesContent) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-ignore
				await plugin.transform(file.text, file.file);
			}
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-ignore
			plugin.configResolved({ command: 'build' });
		}
		const { idMap } = (<DebugAble>plugin).debugProperties;
		expect(idMap).toMatchInlineSnapshot(`
		Map {
		  "main.js" => Object {
		    "fileType": "script",
		    "sha384": "sha384-8wFCdHJ+Zm3j1h/RQTxIo58hx051U1Vs8IHW9UxYzZg+ylnbj3fH7+UWwAUSe3of",
		  },
		  "main2.js" => Object {
		    "fileType": "script",
		    "sha384": "sha384-4OA9oLbM0L7allUVhjBIMHW7BP4R65GG0TYj7VCeFSCl7qM8/X8tCjc+Gx5uE/20",
		  },
		  "test.css" => Object {
		    "fileType": "style",
		    "sha384": "sha384-BH0wmMpEYjSsKmYmASJBskfwtrixFSLCphySyJuHIOKhjmVEbLp1d1yr+ewWtfRe",
		  },
		}
	`);
	});
});

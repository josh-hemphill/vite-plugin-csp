import type { HtmlTagDescriptor, PluginOption } from 'vite';
import path from 'path';
import { CspDirectiveHeaders, CspDirectives, ValidSource } from 'csp-typed-directives';
import {builtinProcessorFns} from './builtin-processors/index.js';
import { createFilter } from '@rollup/pluginutils';
import { getAllSourceHashes, hash } from './get-all-sources.js';
import {
	DEFAULT_OPTIONS,
	HashCache,
	PolicyOptions,
	ProcessFn,
	ProcessFnContext,
	DebugProperties,
	CherryPickedConfig,
	HashResults,
} from './consts.js';
import { internalProcFileWrite } from './processors-helpers.js';
import { getCssImportUrls } from './extractCssImports.js';

class HtmlTag implements HtmlTagDescriptor {
	tag: string
	attrs: Record<string,string|boolean>;
	constructor (tag: string, attrs: Record<string,string|boolean>) {
		this.tag = tag;
		this.attrs = attrs;
	}
}

export type ViteCspPluginOptions = typeof DEFAULT_OPTIONS;

type ViteCspPluginOpts = Partial<ViteCspPluginOptions>

function createViteCspPlugin (policy: PolicyOptions, options: ViteCspPluginOpts): PluginOption;
function createViteCspPlugin (options: Partial<ViteCspPluginOpts>): PluginOption;
function createViteCspPlugin (): PluginOption;
function createViteCspPlugin (...opts: ([PolicyOptions,ViteCspPluginOpts] | [ViteCspPluginOpts] | [])): PluginOption {
	const {p,o} = {
		0: {
			o: DEFAULT_OPTIONS,
			p: DEFAULT_OPTIONS.policy,
		},
		1: {
			o: (<ViteCspPluginOpts>opts[0]),
			p: (<ViteCspPluginOpts>opts[0])?.policy || DEFAULT_OPTIONS.policy,
		},
		2: {
			o: <ViteCspPluginOpts>opts[1],
			p: <PolicyOptions>opts[0],
		},
	}[opts.length];
	const enabled = typeof o.enabled === 'boolean' ? o.enabled : DEFAULT_OPTIONS.enabled;
	if (!enabled) {
		return undefined;
	}
	const inject = typeof o.inject === 'boolean' ? o.inject : DEFAULT_OPTIONS.inject;
	const onDev = typeof o.onDev === 'string' ? o.onDev : DEFAULT_OPTIONS.onDev;

	function processPolicyOptions ( pOp:PolicyOptions ): CspDirectives {
		const pPolicy = Array.isArray(pOp)
			? new CspDirectives(...pOp)
			: new CspDirectives(pOp);

		if (typeof o.referrerHeaderOverride === 'string')
			pPolicy.ReferrerHeader = o.referrerHeaderOverride;

		if (typeof o.sendReportsTo === 'object')
			pPolicy.ReportTo = o.sendReportsTo;

		if (typeof o.reportSubset === 'object')
			pPolicy.ReportOnly = o.reportSubset;

		pPolicy.checkReportTo();
		return pPolicy;
	}

	const policy = processPolicyOptions(p);
	const validatedMappedPolicies: Record<string,CspDirectives> = {};
	if (!!o.mapHtmlFiles && Object.keys(o.mapHtmlFiles).length) {
		for (const fileId in o.mapHtmlFiles) {
			const lPolicy = o.mapHtmlFiles[fileId];
			if (lPolicy !== null && typeof lPolicy === 'object') {
				validatedMappedPolicies[fileId] = processPolicyOptions(lPolicy);
			}
		}
	}

	const hashingMethod = o.hashingMethod || DEFAULT_OPTIONS.hashingMethod;
	const hashEnabled = {
		...DEFAULT_OPTIONS.hashEnabled,
		...o?.hashEnabled,
	};

	/** @deprecated requires SSR support first */
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	//@ts-ignore
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const nonceEnabled = {
		...DEFAULT_OPTIONS.nonceEnabled,
		...o?.nonceEnabled,
	};

	const srvConfDir = o.srvConfDir || DEFAULT_OPTIONS.srvConfDir;
	const processFns = (Array.isArray(o.processFn)
		? o.processFn
		: o.processFn ? [o.processFn] : []
	).map((v) => {
		if (typeof v === 'string' && typeof builtinProcessorFns?.[v] === 'function')
			return (ctx: ProcessFnContext, parsedHeaders: CspDirectiveHeaders) =>
				builtinProcessorFns?.[v]?.({
					ctx,
					parsedHeaders,
					processor: v,
				});
		if (typeof v === 'object' &&
			v?.processor?.length &&
			typeof builtinProcessorFns?.[v.processor] === 'function'
		)
			return (ctx: ProcessFnContext, parsedHeaders: CspDirectiveHeaders) =>
				builtinProcessorFns?.[v.processor]?.({
					...v,
					ctx,
					parsedHeaders,
				});
		if (typeof v === 'function')
			return async (ctx: ProcessFnContext, parsedHeaders: CspDirectiveHeaders) => {
				const res = await v(ctx,parsedHeaders);
				if (typeof res === 'object' && typeof res?.name === 'string' && typeof res?.content === 'string') {
					internalProcFileWrite(ctx,res.name,res.content);
				}
			};
		return undefined;
	}).filter((v): v is ProcessFn => typeof v === 'function');

	async function buildConfigs (
		ctx: ProcessFnContext,
		parsedHeaders: CspDirectiveHeaders,
	) {
		for (const fn of processFns) {
			await fn(ctx,parsedHeaders);
		}
	}

	const jsFilter = createFilter('**.js');
	const cssFilter = createFilter('**.css');

	const idMap = new Map<string,HashCache>();

	const cssImportUrls = new Set<string>();

	const config: Partial<CherryPickedConfig> = {};
	const plugin: PluginOption = {
		name: 'vite-plugin-csp',
		apply: 'build',
		enforce: 'post',
		configResolved (resolvedConfig) {
			// store the resolved config
			config.command = resolvedConfig?.command;
		},
		async transform (code,id) {
			if ((config.command === 'build' || onDev === 'full')) {
				const isJs = jsFilter(id);
				const isCss = cssFilter(id);
				if (isJs && hashEnabled['script-src']) {
					idMap.set(id,<HashCache>{
						fileType: 'script',
						[hashingMethod]:hash(hashingMethod,code),
					});
				} else if (isCss && hashEnabled['style-src']) {
					const urls = getCssImportUrls(code);
					urls.forEach((v) => {
						let x = '';
						try {
							x = path.resolve(v);
						} catch (_) {
							return;
						}
						if (x) cssImportUrls.add(x);
					});
					idMap.set(id,<HashCache>{
						fileType: 'style',
						[hashingMethod]:hash(hashingMethod,code),
					});
				}
			}
			return null;
		},
		async transformIndexHtml (html,{path: Path,filename}) {
			const finalHashes = getAllSourceHashes(html, idMap, hashEnabled, hashingMethod);
			let localPolicy = policy;
			const vMapPol = validatedMappedPolicies;
			if (!!vMapPol && Object.keys(vMapPol).length) {
				const pPath = Path ? path.resolve(Path,filename) : path.resolve(filename);
				for (const key of Object.keys(vMapPol)) {
					const kPath = path.resolve(key);
					if (kPath === pPath) {
						localPolicy = vMapPol[key];
					}
				}
			}

			function setCspAsArr (directive: keyof HashResults) {
				const x = localPolicy.CSP[directive];
				if (!Array.isArray(x)) {
					if (typeof x !== 'undefined') {
						localPolicy.CSP[directive] = [x];
					} else {
						localPolicy.CSP[directive] = [];
					}
				}
				return <ValidSource[]>localPolicy.CSP[directive];
			}
			const assignHash = (v: keyof HashResults) => !hashEnabled[v] || setCspAsArr(v).push(...finalHashes[v]);

			assignHash('script-src');
			assignHash('script-src-attr');
			assignHash('style-src');
			assignHash('style-src-attr');

			cssImportUrls.forEach((v) => {
				console.dir(v);
				console.dir(idMap);
				if (idMap.has(v)) {
					const res = idMap.get(v);
					if (res) {
						const x = new Set((<ValidSource[]>localPolicy.CSP['style-src']));
						x.add(res[hashingMethod]);
						localPolicy.CSP['style-src'] = Array.from(x);
					}
				}
			});

			const parsedHeaders = localPolicy.getHeaders();

			await buildConfigs({
				path: Path,
				htmlFileName: filename,
				builtinProcessorFns,
				srvConfDir,
			},parsedHeaders);
			if (inject) {
				return Object.entries(parsedHeaders).map(([k,v]) => new HtmlTag('meta',{
					'http-equiv':k,
					content: v,
				}));
			}
		},
	};

	if (o.debugPlugin) {
		const x: DebugProperties = {
			inject,
			onDev,
			policy,
			hashingMethod,
			hashEnabled,
			nonceEnabled,
			processFns,
			idMap,
			validatedMappedPolicies,
			config,
		};
		Object.defineProperty(plugin,'debugProperties',{
			value:x,
		});
	}

	return plugin;
}
export const ViteCspPlugin = createViteCspPlugin;
export default ViteCspPlugin;

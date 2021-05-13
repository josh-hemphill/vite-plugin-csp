import { CspDirectiveHeaders, CspDirectives, DirectivesObj, ValidHashes as validHashes,ValidCrypto as lValidCrypto } from 'csp-typed-directives';
import { ResolvedConfig } from 'vite';
import { builtinProcessorFns } from './builtin-processors/index.js';

type ValidCrypto = typeof lValidCrypto[number]
export const validCrypto = lValidCrypto;
export type HashEnabled = typeof DEFAULT_OPTIONS['hashEnabled']
export type CryptoSources = `${ValidCrypto}-${string}`
export type HashResults = Record<keyof HashEnabled,Set<CryptoSources>>

export const DEFAULT_OPTIONS = {
	enabled: <boolean>true,
	inject: <boolean>true,
	onDev: <DevRunTypes>'permissive',
	policy: <PolicyOptions>{
		'base-uri': 'self',
		'object-src': 'none',
		'script-src': ['unsafe-inline', 'self', 'unsafe-eval'],
		'style-src': ['unsafe-inline', 'self', 'unsafe-eval'],
	},
	hashingMethod: <ValidHashes>'sha384',
	hashEnabled: {
		'script-src': <boolean>true,
		'style-src': <boolean>true,
		'script-src-attr': <boolean>true,
		'style-src-attr': <boolean>true,
	},
	/** @deprecated requires SSR support first, included for webpack migrations */
	nonceEnabled: {
		'script-src': <boolean>false,
		'style-src': <boolean>false,
	},
	processFn: <ProcessOptions | undefined>undefined,
	referrerHeaderOverride: <DirectivesParams['3']>undefined,
	sendReportsTo: <DirectivesParams['1']>undefined,
	reportSubset: <DirectivesParams['2']>undefined,
	mapHtmlFiles: <Record<string,PolicyOptions> | undefined>undefined,
	debugPlugin: <boolean>false,
	srvConfDir: <string>'.server_config',
};

export type DebugAble = Plugin & { debugProperties: DebugProperties };
export type InternalProcessFnNames = keyof typeof builtinProcessorFns
export type InternalProcessFnParams = {
	processor: InternalProcessFnNames,
	outFile?: string,
}
export type InternalProcessOptions = InternalProcessFnParams & {ctx: ProcessFnContext, parsedHeaders: CspDirectiveHeaders}
export type InternalProcessFn = (options: InternalProcessOptions) => void

export const HASHES = validHashes;
export type ValidHashes = typeof HASHES[number];

export const DEV_RUN_TYPE = ['permissive', 'full', 'skip'] as const;
export type DevRunTypes = typeof DEV_RUN_TYPE[number];

export type ProcessFnContext = {
	path: string,
	htmlFileName: string,
	srvConfDir: string,
	builtinProcessorFns: typeof builtinProcessorFns
}
type ProcessFnReturn = {name:string,content:string} | void
export type ProcessFn = (ctx: ProcessFnContext, parsedHeaders: CspDirectiveHeaders) => ProcessFnReturn | Promise<ProcessFnReturn>;

export type DirectivesParams = ConstructorParameters<typeof CspDirectives>
export type PolicyOptions = DirectivesParams | DirectivesObj

export type ProcessOption = keyof typeof builtinProcessorFns
| InternalProcessFnParams
| ProcessFn

export type ProcessOptions = ProcessOption | ProcessOption[]

export type HashCache = Record<ValidHashes,CryptoSources> & {fileType: 'script' | 'style'}

export type DebugProperties = {
	inject: boolean;
	onDev: 'permissive' | 'full' | 'skip';
	policy: CspDirectives;
	hashingMethod: 'sha256' | 'sha384' | 'sha512';
	hashEnabled: {
		'script-src': boolean;
		'style-src': boolean;
		'script-src-attr': boolean;
		'style-src-attr': boolean;
	};
	nonceEnabled: {
		'script-src': boolean;
		'style-src': boolean;
	};
	processFns: ProcessFn[];
	idMap: Map<string, HashCache>;
	validatedMappedPolicies: Record<string,CspDirectives>;
	config: Partial<CherryPickedConfig>;
};

export type CherryPickedConfig = {
	command: ResolvedConfig['command']
}

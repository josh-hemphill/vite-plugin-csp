import { CspDirectiveHeaders } from 'csp-typed-directives';
import { InternalProcessFn } from '../consts.js';
import { indentLiteralLines, internalProcFileWrite } from '../processors-helpers.js';

const getCaddyHeaders = (headers: CspDirectiveHeaders) => Object.entries(headers)
	.map(([key,value]) => `header ${key} "${value}"\n`)
	.join('');

export const defaultFiles = {
	Caddyfile: 'Caddyfile',
	Caddyfile_HeadersOnly: 'headers.caddyfile',
};

export const builtinProcessorFns = {
	Caddyfile: <InternalProcessFn>((
		{ctx, parsedHeaders, outFile = defaultFiles.Caddyfile},
	) => {
		const config = `
		{$SITE_ADDRESS}

		root * dist
		${indentLiteralLines(getCaddyHeaders(parsedHeaders),'\t\t')}
		file_server
		`;
		return internalProcFileWrite(ctx,outFile,config);
	}),
	Caddyfile_HeadersOnly: <InternalProcessFn>((
		{ctx, parsedHeaders, outFile = defaultFiles.Caddyfile_HeadersOnly},
	) => {
		return internalProcFileWrite(ctx,outFile,getCaddyHeaders(parsedHeaders));
	}),
};

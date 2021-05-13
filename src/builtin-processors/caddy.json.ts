import { CspDirectiveHeaders } from 'csp-typed-directives';
import { InternalProcessFn } from '../consts.js';
import { internalProcFileWrite } from '../processors-helpers.js';

type CaddyJsonHeaders = Record<keyof CspDirectiveHeaders,string[]>
const getCaddyJson = (headers: CspDirectiveHeaders) => {
	const lHeaders = JSON.parse(JSON.stringify(headers));
	for (const key in lHeaders) {
		const value = lHeaders[key];
		lHeaders[key] = [value];
	}
	return <CaddyJsonHeaders>lHeaders;
};

export const defaultFiles = {
	CaddyJSON: 'caddy.json',
	CaddyJSON_HeadersOnly: 'caddy-headers.json',
};

export const builtinProcessorFns = {
	CaddyJSON: <InternalProcessFn>((
		{ctx, parsedHeaders, outFile = defaultFiles.CaddyJSON},
	) => {
		const headers = getCaddyJson(parsedHeaders);
		const caddyServerJson = {
			'listen': [
				':443',
			],
			'routes': [
				{
					'match': [
						{
							'host': [
								'localhost',
							],
						},
					],
					'handle': [
						{
							'handler': 'file_server',
							'root': '/var/www',
						},
						{
							'handler': 'headers',
							'response': {
								'set': headers,
							},
						},
					],
				},
			],
		};
		return internalProcFileWrite(ctx,outFile,JSON.stringify(caddyServerJson,null,2));
	}),
	CaddyJSON_HeadersOnly: <InternalProcessFn>((
		{ctx, parsedHeaders, outFile = defaultFiles.CaddyJSON_HeadersOnly},
	) => {
		return internalProcFileWrite(ctx,outFile,JSON.stringify({
			'handler': 'headers',
			'response': {
				'set': getCaddyJson(parsedHeaders),
			},
		},null,2));
	}),
};


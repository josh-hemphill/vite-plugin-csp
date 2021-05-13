import { CspDirectiveHeaders } from 'csp-typed-directives';
import { InternalProcessFn } from '../consts.js';
import { indentLiteralLines, internalProcFileWrite } from '../processors-helpers.js';

const getNginxHeaders = (headers: CspDirectiveHeaders) => Object.entries(headers)
	.map(([key,value]) => `add_header ${key} "${value}";\n`)
	.join('');

export const defaultFiles = {
	Nginx: 'nginx.conf',
	Nginx_HeadersOnly: 'nginx-headers.conf',
};

export const builtinProcessorFns = {
	Nginx: <InternalProcessFn>((
		{ctx, parsedHeaders, outFile = defaultFiles.Nginx},
	) => {
		const config = `
		server {
			listen\t443 80;
			index\tindex.html Index.html;
			${indentLiteralLines(getNginxHeaders(parsedHeaders))}
			location / {
				try_files\t$uri /index.html $uri/ / =404;
			}
		}
		`;
		return internalProcFileWrite(ctx,outFile,config);
	}),
	Nginx_HeadersOnly: <InternalProcessFn>((
		{ctx, parsedHeaders, outFile = defaultFiles.Nginx_HeadersOnly},
	) => {
		return internalProcFileWrite(ctx,outFile,getNginxHeaders(parsedHeaders));
	}),
};

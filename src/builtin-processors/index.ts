import { builtinProcessorFns as caddyfile, defaultFiles as caddyfile_defaults} from './caddyfile.js';
import { builtinProcessorFns as nginx, defaultFiles as nginx_defaults} from './nginx.js';
import { builtinProcessorFns as caddyJson, defaultFiles as caddyJson_defaults} from './caddy.json.js';

export const builtinProcessorFns = {
	...caddyfile,
	...nginx,
	...caddyJson,
};

export const builtinProcessorFiles = {
	...caddyfile_defaults,
	...nginx_defaults,
	...caddyJson_defaults,
};

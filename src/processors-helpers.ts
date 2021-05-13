import { ProcessFnContext } from './consts.js';
import path from 'path';
import { mkdirSync, writeFileSync } from 'fs';

export const internalProcFileWrite = (ctx: ProcessFnContext,file: string,config: string): void => {
	mkdirSync(ctx.srvConfDir,{recursive:true});
	const lPath = path.resolve(path.join(ctx.srvConfDir,file));
	writeFileSync(lPath,config);
};

export const indentLiteralLines = (content: string, indent = '\t\t\t'): string => content
	.split('\n')
	.map((v,i) => v && i ? indent + v : v)
	.join('\n');

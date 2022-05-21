import * as csstree from 'css-tree';
const matchStartEnd = (s:string,toMatch: string) => s[0] === toMatch && s[s.length - 1] === toMatch;
const stripTrim = (s:string) => s.slice(1,s.length - 1);

export const getCssImportUrls = (code: string): string[] =>{
	const ast = csstree.parse(code);
	const results = csstree.findAll(ast, function (node, _item, _list) {
		return node.type === 'Atrule' && node.name === 'import';
	}).map((impMatch) => {
		if (
			impMatch !== null &&
			typeof impMatch === 'object' &&
			impMatch.type === 'Atrule' &&
			impMatch?.prelude?.type === 'AtrulePrelude'
		) {
			const objPrelude = csstree.toPlainObject(impMatch?.prelude);
			if (objPrelude.type === 'AtrulePrelude' && objPrelude.children.length) {
				const values =  objPrelude.children.map((v) => {
					if (
						v.type === 'Url' &&
						v?.value?.type === 'String' &&
						v.value.value
					) {
						return v.value.value;
					}
					return undefined;
				});
				return values.filter((v): v is string => typeof v === 'string');
			}
		}
		return undefined;
	})
		.filter((v): v is string[] => Array.isArray(v))
		.flat()
		.map((v) => (matchStartEnd(v,"'") || matchStartEnd(v,'"')) ? stripTrim(v) : v);
	return results;
};

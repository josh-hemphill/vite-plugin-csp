
import * as cheerio from 'cheerio';
import type {Element} from 'cheerio';
import { BinaryLike, createHash } from 'crypto';
import path from 'path';
import { HashCache, ValidHashes,HashEnabled,HashResults,CryptoSources, validCrypto } from './consts.js';
import { getCssImportUrls } from './extractCssImports.js';

export function hash (algorithm: ValidHashes,target: BinaryLike): string {
	const hash = createHash(algorithm);
	hash.update(target);
	return <CryptoSources>`${algorithm}-${hash.digest('base64')}`;
}

export function getAllSourceHashes (
	html: string,
	idMap: Map<string, HashCache>,
	hashEnabled: HashEnabled,
	hashingMethod: ValidHashes,
): HashResults {
	const $ = cheerio.load(html);
	const hashSets = {
		scriptSrcHashes: new Set<CryptoSources>(),
		styleSrcHashes: new Set<CryptoSources>(),
		scriptAttrHashes: new Set<CryptoSources>(),
		styleAttrHashes: new Set<CryptoSources>(),
	};

	const isCryptoSource = (v:string | undefined): v is CryptoSources => validCrypto.some((x) => x === v?.slice(0,6));

	const tryAddHash = (v:string | undefined, hashSet: keyof typeof hashSets) => {
		if (isCryptoSource(v)) {
			hashSets[hashSet].add(v);
		}
	};
	// All script tags
	$('script').each(function (i,el) {

		// Imported Scripts
		if (Object.keys(el.attribs).length && el.attribs?.src?.length) {
			const fileId = path.resolve(el.attribs?.src);
			if (idMap.has(fileId)) {
				tryAddHash(idMap.get(fileId)?.[hashingMethod],'scriptSrcHashes');
			}
		}

		// Inline Scripts
		if (el.childNodes?.[0]?.type === 'text') {
			const txt = $.text([el.childNodes?.[0]]);
			if (txt.length) {
				tryAddHash(hash(hashingMethod,txt),'scriptSrcHashes');
			}
		}
	});

	// All style tags
	$('style').each(function (i,el) {

		// Inline styles
		if (el.childNodes?.[0]?.type === 'text') {
			const txt = $.text([el.childNodes?.[0]]);
			if (txt.length) {
				const cssImportUrls = getCssImportUrls(txt);
				cssImportUrls.forEach((v) => {
					if (v.length) {
						const fileId = path.resolve(v);
						if (idMap.has(fileId)) {
							tryAddHash(idMap.get(fileId)?.[hashingMethod],'styleSrcHashes');
						}
					}
				});
				tryAddHash(hash(hashingMethod,txt),'styleSrcHashes');
			}
		}
	});

	// Styles linked in head
	$('link').each(function (i,el) {
		if (Object.keys(el.attribs).length &&
					el.attribs?.rel === 'stylesheet' &&
					el.attribs?.href?.length
		) {
			const fileId = path.resolve(el.attribs?.href);
			if (idMap.has(fileId)) {
				tryAddHash(idMap.get(fileId)?.[hashingMethod],'styleSrcHashes');
			}
		}
	});

	// Hash inline styles in `style=""` tags if enabled
	if (hashEnabled['style-src-attr']) {
		$('[style]').each((i,el) => {
			if (el.attribs?.style.length) {
				tryAddHash(hash(hashingMethod,el.attribs.style),'styleAttrHashes');
			}
		});
	}

	// Hash inline scripts in `onSomething=""` tags if enabled
	if (hashEnabled['script-src-attr']) {
		const onFn = (v: string) => v.startsWith('on');
		$('*').filter((i,el)=> Object.keys((<Element><unknown>el).attribs).some(onFn)).each((i,el) => {
			Object.keys((<Element><unknown>el).attribs).filter(onFn).forEach((v) => {
				const content = (<Element><unknown>el).attribs[v];
				if (content?.length) {
					tryAddHash(hash(hashingMethod,content),'scriptAttrHashes');
				}
			});
		});
	}

	return {
		'script-src-attr': hashSets.scriptAttrHashes,
		'style-src-attr': hashSets.styleAttrHashes,
		'script-src': hashSets.scriptSrcHashes,
		'style-src': hashSets.styleSrcHashes,
	};
}

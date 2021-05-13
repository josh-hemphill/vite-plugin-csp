import { ViteCspPlugin } from "../../dist/index.js";
const differentPolicy = {
	'base-uri': 'unsafe-eval',
	'object-src': 'unsafe-eval',
	'script-src': 'unsafe-eval',
	'style-src': 'unsafe-eval',
};
const plugin = ViteCspPlugin({
	policy: differentPolicy,
});
console.log(plugin)
debugger;

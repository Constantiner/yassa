/** @type {import('prettier').Config} */
const config = {
	printWidth: 120,
	useTabs: true,
	tabWidth: 4,
	semi: true,
	singleQuote: false,
	trailingComma: "none",
	arrowParens: "avoid",
	plugins: ["prettier-plugin-packagejson"]
};

export default config;

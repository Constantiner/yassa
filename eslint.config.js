import js from "@eslint/js";
import vitestPlugin from "@vitest/eslint-plugin";
import pluginImport from "eslint-plugin-import";
import nodePlugin from "eslint-plugin-n";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vitestRecommendedRules = vitestPlugin.configs?.recommended?.rules ?? {};

/** @type {import("typescript-eslint").ConfigArray} */
export default tseslint.config(
	{
		ignores: [".changeset/**", ".github/**", ".husky/**", "coverage/**", "dist/**", "node_modules/**"]
	},
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		files: ["**/*.{js,mjs,cjs}"],
		plugins: {
			import: pluginImport,
			n: nodePlugin,
			unicorn: eslintPluginUnicorn
		},
		languageOptions: {
			globals: {
				...globals.node
			}
		},
		settings: {
			"import/resolver": {
				node: true
			}
		},
		rules: {
			...tseslint.configs.disableTypeChecked.rules,
			...pluginImport.configs.recommended.rules,
			"import/no-duplicates": "error",
			"import/no-unresolved": "error",
			"n/no-missing-import": [
				"error",
				{
					tryExtensions: [".js", ".mjs", ".cjs", ".json"]
				}
			],
			"unicorn/prefer-node-protocol": "error",
			"unicorn/no-array-for-each": "off",
			"unicorn/no-array-reduce": "off",
			"unicorn/no-null": "off",
			"unicorn/no-useless-undefined": "off",
			"no-console": "error",
			"no-else-return": ["error", { allowElseIf: false }]
		}
	},
	{
		files: ["**/*.{ts,mts,cts,tsx}"],
		plugins: {
			import: pluginImport,
			n: nodePlugin,
			unicorn: eslintPluginUnicorn
		},
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: __dirname
			},
			globals: {
				...globals.node
			}
		},
		settings: {
			"import/parsers": {
				"@typescript-eslint/parser": [".ts", ".tsx", ".mts", ".cts"]
			},
			"import/resolver": {
				typescript: {
					alwaysTryTypes: true,
					project: "./tsconfig.json"
				}
			}
		},
		rules: {
			"@typescript-eslint/explicit-function-return-type": "error",
			"@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"import/no-cycle": "error",
			"import/no-duplicates": "error",
			"import/no-unresolved": "error",
			"import/order": [
				"error",
				{
					"newlines-between": "always",
					groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "object", "type"]
				}
			],
			"n/no-missing-import": [
				"error",
				{
					tryExtensions: [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"],
					tsconfigPath: "./tsconfig.json"
				}
			],
			"n/no-unsupported-features/es-syntax": ["error", { ignores: ["modules"] }],
			"unicorn/filename-case": ["error", { case: "camelCase" }],
			"unicorn/no-array-for-each": "off",
			"unicorn/no-array-reduce": "off",
			"unicorn/no-null": "off",
			"unicorn/no-useless-undefined": "off",
			"unicorn/prefer-node-protocol": "error",
			"no-console": "error",
			"no-else-return": ["error", { allowElseIf: false }],
			"no-restricted-syntax": [
				"error",
				{
					selector: "ExportDefaultDeclaration",
					message: "Prefer named exports"
				}
			]
		}
	},
	{
		files: ["**/*.{test,spec}.{ts,mts,cts,tsx}"],
		plugins: {
			vitest: vitestPlugin
		},
		rules: {
			...vitestRecommendedRules
		}
	},
	{
		files: ["**/*.cjs"],
		languageOptions: {
			sourceType: "commonjs"
		}
	},
	{
		files: ["**/*.d.ts"],
		rules: {
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/triple-slash-reference": "off",
			"no-restricted-syntax": "off",
			"unicorn/filename-case": "off"
		}
	},
	{
		files: ["eslint.config.js"],
		rules: {
			"import/no-unresolved": "off",
			"n/no-missing-import": "off"
		}
	},
	eslintPluginPrettierRecommended
);

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
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
const importRecommendedRules = pluginImport.configs?.recommended?.rules ?? {};

const nodeLanguageOptions = {
	globals: {
		...globals.node
	}
};

const commonPlugins = {
	import: pluginImport,
	n: nodePlugin,
	unicorn: eslintPluginUnicorn
};

/** @type {import("eslint").Linter.RulesRecord} */
const commonRules = {
	"import/no-duplicates": "error",
	"import/no-unresolved": "error",
	"no-console": "error",
	"no-else-return": ["error", { allowElseIf: false }],
	"unicorn/no-array-for-each": "off",
	"unicorn/no-array-reduce": "off",
	"unicorn/prefer-node-protocol": "error"
};

export default defineConfig(
	globalIgnores([".changeset/**", ".github/**", ".husky/**", "coverage/**", "dist/**", "node_modules/**"]),
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		files: ["**/*.{js,mjs,cjs}"],
		plugins: commonPlugins,
		languageOptions: nodeLanguageOptions,
		settings: {
			"import/resolver": {
				node: true
			}
		},
		rules: {
			...tseslint.configs.disableTypeChecked.rules,
			...importRecommendedRules,
			...commonRules,
			"n/no-missing-import": [
				"error",
				{
					tryExtensions: [".js", ".mjs", ".cjs", ".json"]
				}
			]
		}
	},
	{
		files: ["**/*.{ts,mts,cts,tsx}"],
		plugins: commonPlugins,
		languageOptions: {
			...nodeLanguageOptions,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: __dirname
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
			...commonRules,
			"@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
			"@typescript-eslint/explicit-function-return-type": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"import/no-cycle": "error",
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
			"no-restricted-syntax": [
				"error",
				{
					selector: "ExportDefaultDeclaration",
					message: "Prefer named exports"
				}
			],
			"unicorn/filename-case": ["error", { case: "camelCase" }]
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

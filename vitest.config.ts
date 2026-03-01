import { defineConfig } from "vitest/config";

const config = defineConfig({
	test: {
		environment: "node",
		globals: false,
		include: ["src/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "coverage",
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts", "src/index.ts"]
		}
	}
});

export { config as default };

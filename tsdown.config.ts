import { defineConfig } from "tsdown";

const config = defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	platform: "node",
	target: "node16",
	sourcemap: true,
	clean: true,
	treeshake: true
});

export { config as default };

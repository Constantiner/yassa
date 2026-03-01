import { defineConfig } from "tsdown";

const config = defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	platform: "node",
	target: "node16",
	sourcemap: true,
	clean: true,
	treeshake: true,
	nodeProtocol: "strip",
	tsconfig: "tsconfig.build.json",
	dts: true,
	fixedExtension: false,
	define: {
		__DEV__: "false",
		"process.env.NODE_ENV": '"production"'
	}
});

export { config as default };

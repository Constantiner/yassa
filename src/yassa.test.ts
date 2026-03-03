import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	resolveConfigChain,
	resolveConfigChainFor,
	resolveConfigChainForSync,
	resolveConfigChainSync,
	resolveConfigFile,
	resolveConfigFileFor,
	resolveConfigFileForSync,
	resolveConfigFileSync
} from "./yassa.js";

const writeFileWithDirectories = (filePath: string): void => {
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, "content", "utf8");
};

describe("environment config hierarchy", () => {
	let workspacePath = "";
	let originalNodeEnvironment: string | undefined;

	beforeEach(() => {
		workspacePath = mkdtempSync(join(tmpdir(), "yassa-tests-"));
		originalNodeEnvironment = process.env["NODE_ENV"];
	});

	afterEach(async () => {
		if (typeof originalNodeEnvironment === "string") {
			process.env["NODE_ENV"] = originalNodeEnvironment;
		} else {
			delete process.env["NODE_ENV"];
		}
		await rm(workspacePath, { recursive: true, force: true });
	});

	it("returns existing hierarchy files in precedence order with explicit environment (async)", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		const envFile = join(workspacePath, "config", ".env.development");
		const localFile = join(workspacePath, "config", ".env.local");
		const envLocalFile = join(workspacePath, "config", ".env.development.local");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		writeFileWithDirectories(localFile);
		writeFileWithDirectories(envLocalFile);

		const resolveFiles = resolveConfigChainFor("development");
		const resolvedFiles = await resolveFiles(baseFile);

		expect(resolvedFiles).toStrictEqual([envLocalFile, localFile, envFile, baseFile]);
	});

	it("returns existing hierarchy files in precedence order with explicit environment (sync)", () => {
		const baseFile = join(workspacePath, "config", "settings.json");
		const envFile = join(workspacePath, "config", "settings.production.json");
		const envLocalFile = join(workspacePath, "config", "settings.production.local.json");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		writeFileWithDirectories(envLocalFile);

		const resolveFilesSync = resolveConfigChainForSync("production");
		const resolvedFiles = resolveFilesSync(baseFile);

		expect(resolvedFiles).toStrictEqual([envLocalFile, envFile, baseFile]);
	});

	it("excludes files that belong to other environments", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		const developmentFile = join(workspacePath, "config", ".env.development");
		const developmentLocalFile = join(workspacePath, "config", ".env.development.local");
		const localFile = join(workspacePath, "config", ".env.local");
		const productionFile = join(workspacePath, "config", ".env.production");
		const productionLocalFile = join(workspacePath, "config", ".env.production.local");
		const stagingFile = join(workspacePath, "config", ".env.staging");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(developmentFile);
		writeFileWithDirectories(developmentLocalFile);
		writeFileWithDirectories(localFile);
		writeFileWithDirectories(productionFile);
		writeFileWithDirectories(productionLocalFile);
		writeFileWithDirectories(stagingFile);

		const resolveFiles = resolveConfigChainFor("development");
		const resolveFilesSync = resolveConfigChainForSync("development");
		const resolveFile = resolveConfigFileFor("development");
		const resolveFileSync = resolveConfigFileForSync("development");

		await expect(resolveFiles(baseFile)).resolves.toStrictEqual([
			developmentLocalFile,
			localFile,
			developmentFile,
			baseFile
		]);
		expect(resolveFilesSync(baseFile)).toStrictEqual([developmentLocalFile, localFile, developmentFile, baseFile]);
		await expect(resolveFile(baseFile)).resolves.toBe(developmentLocalFile);
		expect(resolveFileSync(baseFile)).toBe(developmentLocalFile);

		await expect(resolveFiles(baseFile)).resolves.not.toContain(productionFile);
		await expect(resolveFiles(baseFile)).resolves.not.toContain(productionLocalFile);
		await expect(resolveFiles(baseFile)).resolves.not.toContain(stagingFile);
	});

	it("supports dotted base file names with extension (for example .env.json)", async () => {
		const baseFile = join(workspacePath, "config", ".env.json");
		const envFile = join(workspacePath, "config", ".env.staging.json");
		const localFile = join(workspacePath, "config", ".env.local.json");
		const envLocalFile = join(workspacePath, "config", ".env.staging.local.json");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		writeFileWithDirectories(localFile);
		writeFileWithDirectories(envLocalFile);

		const resolveFiles = resolveConfigChainFor("staging");
		const resolveFile = resolveConfigFileFor("staging");

		await expect(resolveFiles(baseFile)).resolves.toStrictEqual([envLocalFile, localFile, envFile, baseFile]);
		await expect(resolveFile(baseFile)).resolves.toBe(envLocalFile);
	});

	it("supports base file names that end with a dot (for example index.)", async () => {
		const baseFile = join(workspacePath, "config", "index.");
		const envFile = join(workspacePath, "config", "index.qa.");
		const localFile = join(workspacePath, "config", "index.local.");
		const envLocalFile = join(workspacePath, "config", "index.qa.local.");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		writeFileWithDirectories(localFile);
		writeFileWithDirectories(envLocalFile);

		const resolveFiles = resolveConfigChainFor("qa");
		const resolveFilesSync = resolveConfigChainForSync("qa");
		const resolveFile = resolveConfigFileFor("qa");
		const resolveFileSync = resolveConfigFileForSync("qa");

		await expect(resolveFiles(baseFile)).resolves.toStrictEqual([envLocalFile, localFile, envFile, baseFile]);
		expect(resolveFilesSync(baseFile)).toStrictEqual([envLocalFile, localFile, envFile, baseFile]);
		await expect(resolveFile(baseFile)).resolves.toBe(envLocalFile);
		expect(resolveFileSync(baseFile)).toBe(envLocalFile);
	});

	it("ignores non-file candidates such as directories", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		const envFile = join(workspacePath, "config", ".env.development");
		const envLocalDirectory = join(workspacePath, "config", ".env.development.local");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		mkdirSync(envLocalDirectory, { recursive: true });

		const resolveFiles = resolveConfigChainFor("development");
		const resolveFilesSync = resolveConfigChainForSync("development");

		await expect(resolveFiles(baseFile)).resolves.toStrictEqual([envFile, baseFile]);
		expect(resolveFilesSync(baseFile)).toStrictEqual([envFile, baseFile]);
	});

	it("returns only the most specific file with explicit environment resolvers", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		const envFile = join(workspacePath, "config", ".env.development");
		const envLocalFile = join(workspacePath, "config", ".env.development.local");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		writeFileWithDirectories(envLocalFile);

		const resolveFile = resolveConfigFileFor("development");
		const resolveFileSync = resolveConfigFileForSync("development");

		await expect(resolveFile(baseFile)).resolves.toBe(envLocalFile);
		expect(resolveFileSync(baseFile)).toBe(envLocalFile);
	});

	it("ignores only local files when environment is in localIgnoredEnvironments", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		const envFile = join(workspacePath, "config", ".env.test");
		const localFile = join(workspacePath, "config", ".env.local");
		const envLocalFile = join(workspacePath, "config", ".env.test.local");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		writeFileWithDirectories(localFile);
		writeFileWithDirectories(envLocalFile);

		const resolveFiles = resolveConfigChainFor("test");
		const resolveFilesSync = resolveConfigChainForSync("test");
		const resolveFile = resolveConfigFileFor("test");
		const resolveFileSync = resolveConfigFileForSync("test");

		await expect(resolveFiles(baseFile, ["test"])).resolves.toStrictEqual([envFile, baseFile]);
		expect(resolveFilesSync(baseFile, ["test"])).toStrictEqual([envFile, baseFile]);
		await expect(resolveFile(baseFile, ["test"])).resolves.toBe(envFile);
		expect(resolveFileSync(baseFile, ["test"])).toBe(envFile);

		// Ensure local candidates are excluded in this mode.
		await expect(resolveFiles(baseFile, ["test"])).resolves.not.toContain(localFile);
		await expect(resolveFiles(baseFile, ["test"])).resolves.not.toContain(envLocalFile);
	});

	it("keeps local files when localIgnoredEnvironments does not include current environment", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		const envFile = join(workspacePath, "config", ".env.test");
		const localFile = join(workspacePath, "config", ".env.local");
		const envLocalFile = join(workspacePath, "config", ".env.test.local");

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		writeFileWithDirectories(localFile);
		writeFileWithDirectories(envLocalFile);

		const resolveFiles = resolveConfigChainFor("test");
		const resolveFilesSync = resolveConfigChainForSync("test");
		const resolveFile = resolveConfigFileFor("test");
		const resolveFileSync = resolveConfigFileForSync("test");

		await expect(resolveFiles(baseFile, ["development"])).resolves.toStrictEqual([
			envLocalFile,
			localFile,
			envFile,
			baseFile
		]);
		expect(resolveFilesSync(baseFile, ["development"])).toStrictEqual([envLocalFile, localFile, envFile, baseFile]);
		await expect(resolveFile(baseFile, ["development"])).resolves.toBe(envLocalFile);
		expect(resolveFileSync(baseFile, ["development"])).toBe(envLocalFile);
	});

	it("reads NODE_ENV for resolveConfig* wrappers", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		const envFile = join(workspacePath, "config", ".env.development");
		const envLocalFile = join(workspacePath, "config", ".env.development.local");

		process.env["NODE_ENV"] = "development";

		writeFileWithDirectories(baseFile);
		writeFileWithDirectories(envFile);
		writeFileWithDirectories(envLocalFile);

		await expect(resolveConfigChain(baseFile)).resolves.toStrictEqual([envLocalFile, envFile, baseFile]);
		expect(resolveConfigChainSync(baseFile)).toStrictEqual([envLocalFile, envFile, baseFile]);
		await expect(resolveConfigFile(baseFile)).resolves.toBe(envLocalFile);
		expect(resolveConfigFileSync(baseFile)).toBe(envLocalFile);
	});

	it("throws when NODE_ENV is missing for resolveConfig* wrappers", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		writeFileWithDirectories(baseFile);
		delete process.env["NODE_ENV"];

		await expect(resolveConfigChain(baseFile)).rejects.toThrow(/NODE_ENV/);
		await expect(resolveConfigFile(baseFile)).rejects.toThrow(/NODE_ENV/);
		expect(() => resolveConfigChainSync(baseFile)).toThrow(/NODE_ENV/);
		expect(() => resolveConfigFileSync(baseFile)).toThrow(/NODE_ENV/);
	});

	it("throws when explicit environment is empty or whitespace", async () => {
		const baseFile = join(workspacePath, "config", ".env");
		writeFileWithDirectories(baseFile);

		const resolveFiles = resolveConfigChainFor("   ");
		const resolveFilesSync = resolveConfigChainForSync("");

		await expect(resolveFiles(baseFile)).rejects.toThrow(/Environment must be a non-empty string/);
		expect(() => resolveFilesSync(baseFile)).toThrow(/Environment must be a non-empty string/);
	});

	it("returns empty chain and undefined file when no candidates exist", async () => {
		const missingFile = join(workspacePath, "config", ".env");

		process.env["NODE_ENV"] = "development";

		await expect(resolveConfigChain(missingFile)).resolves.toStrictEqual([]);
		expect(resolveConfigChainSync(missingFile)).toStrictEqual([]);
		await expect(resolveConfigFile(missingFile)).resolves.toBeUndefined();
		expect(resolveConfigFileSync(missingFile)).toBeUndefined();
	});
});

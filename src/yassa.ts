import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { format, parse, resolve } from "node:path";
import { cwd, env } from "node:process";

/**
 * A list of environment names for which `.local` variants should be ignored.
 *
 * Example:
 * `["test"]` means that for the `test` environment we exclude:
 *
 * - `<name>.test.local<ext>`
 * - `<name>.local<ext>`
 *
 * while still resolving:
 *
 * - `<name>.test<ext>`
 * - `<name><ext>`
 */
export type LocalIgnoredEnvironments = readonly string[];

/** Returns all existing hierarchy files in precedence order (most specific first). */
export type ConfigHierarchyFilesResolver = (
	file: string,
	localIgnoredEnvironments?: LocalIgnoredEnvironments
) => Promise<readonly string[]>;

/** Returns all existing hierarchy files in precedence order (most specific first). */
export type ConfigHierarchyFilesResolverSync = (
	file: string,
	localIgnoredEnvironments?: LocalIgnoredEnvironments
) => readonly string[];

/** Returns the most specific existing file (or `undefined`). */
export type ConfigHierarchyFileResolver = (
	file: string,
	localIgnoredEnvironments?: LocalIgnoredEnvironments
) => Promise<string | undefined>;

/** Returns the most specific existing file (or `undefined`). */
export type ConfigHierarchyFileResolverSync = (
	file: string,
	localIgnoredEnvironments?: LocalIgnoredEnvironments
) => string | undefined;

const EMPTY_LOCAL_IGNORED_ENVIRONMENTS: readonly string[] = [];
const projectRootPathPromise = realpath(cwd());
const NODE_ENV_MISSING_ERROR =
	"The NODE_ENV environment variable is required. Set it explicitly or use resolveConfig*For factory functions.";
const INVALID_ENVIRONMENT_ERROR = "Environment must be a non-empty string.";

const normalizeEnvironment = (environment: string): string => {
	const normalized = environment.trim();
	if (normalized.length === 0) {
		throw new Error(INVALID_ENVIRONMENT_ERROR);
	}

	return normalized;
};

const getCurrentEnvironment = (): string => {
	const currentEnvironment = env["NODE_ENV"];
	if (typeof currentEnvironment !== "string") {
		throw new Error(NODE_ENV_MISSING_ERROR);
	}

	return normalizeEnvironment(currentEnvironment);
};

const isLocalIgnoredForEnvironment = (
	environment: string,
	localIgnoredEnvironments: LocalIgnoredEnvironments
): boolean => localIgnoredEnvironments.includes(environment);

const buildHierarchyCandidates = (
	absoluteBaseFilePath: string,
	environment: string,
	localIgnoredEnvironments: LocalIgnoredEnvironments
): readonly string[] => {
	const basePathObject = parse(absoluteBaseFilePath);
	const baseFilePath = format(basePathObject);
	const isLocalIgnored = isLocalIgnoredForEnvironment(environment, localIgnoredEnvironments);
	const { dir, name, ext } = basePathObject;

	if (isLocalIgnored) {
		return [format({ dir, name: `${name}.${environment}`, ext }), baseFilePath];
	}

	return [
		format({ dir, name: `${name}.${environment}.local`, ext }),
		format({ dir, name: `${name}.local`, ext }),
		format({ dir, name: `${name}.${environment}`, ext }),
		baseFilePath
	];
};

const resolveFilePathFromProjectRoot = async (file: string): Promise<string> =>
	resolve(await projectRootPathPromise, file);

const resolveFilePathFromProjectRootSync = (file: string): string => resolve(realpathSync(cwd()), file);

const canReadFile = async (filePath: string): Promise<boolean> => {
	try {
		const fileStats = await stat(filePath);
		if (!fileStats.isFile()) {
			return false;
		}

		await access(filePath, constants.R_OK);
		return true;
	} catch {
		return false;
	}
};

const canReadFileSync = (filePath: string): boolean => {
	try {
		const fileStats = statSync(filePath);
		if (!fileStats.isFile()) {
			return false;
		}

		accessSync(filePath, constants.R_OK);
		return true;
	} catch {
		return false;
	}
};

const filterExistingFiles = async (filePaths: readonly string[]): Promise<readonly string[]> => {
	const readabilityResults = await Promise.all(filePaths.map(filePath => canReadFile(filePath)));
	return filePaths.filter((_, index) => readabilityResults[index]);
};

const filterExistingFilesSync = (filePaths: readonly string[]): readonly string[] =>
	filePaths.filter(filePath => canReadFileSync(filePath));

const firstOrUndefined = (filePaths: readonly string[]): string | undefined => filePaths[0];

/**
 * Creates an async resolver bound to a specific environment.
 *
 * This is the factory form of the API:
 * `(environment) => (file, localIgnoredEnvironments?) => Promise<readonly string[]>`.
 *
 * Resolution order (highest precedence first):
 *
 * 1. `<name>.<environment>.local<ext>`
 * 2. `<name>.local<ext>`
 * 3. `<name>.<environment><ext>`
 * 4. `<name><ext>`
 *
 * Behavior guarantees:
 *
 * - Input `file` is resolved from project root (`realpath(process.cwd())`).
 * - Only existing readable files are returned.
 * - Return order always follows precedence (most specific first).
 * - If current environment is in `localIgnoredEnvironments`, only `.local` files are skipped.
 * - Missing files are ignored (no throw). Invalid/blank environment throws.
 *
 * @param environment Explicit target environment (for example: `development`, `test`, `production`).
 * @returns Curried async resolver function.
 *
 * @example
 * ```ts
 * import { resolveConfigChainFor } from "yassa";
 *
 * const resolveDevConfigs = resolveConfigChainFor("development");
 * const files = await resolveDevConfigs(".env");
 * // files might be:
 * // ["/app/.env.development.local", "/app/.env.local", "/app/.env.development", "/app/.env"]
 * ```
 *
 * @example
 * ```ts
 * import { resolveConfigChainFor } from "yassa";
 *
 * const resolveTestConfigs = resolveConfigChainFor("test");
 * const files = await resolveTestConfigs(".env", ["test"]);
 * // Team-friendly test mode (no local overrides):
 * // ["/app/.env.test", "/app/.env"] (when both files exist)
 * ```
 */
export const resolveConfigChainFor =
	(environment: string): ConfigHierarchyFilesResolver =>
	async (file, localIgnoredEnvironments = EMPTY_LOCAL_IGNORED_ENVIRONMENTS) => {
		const normalizedEnvironment = normalizeEnvironment(environment);
		const absoluteFilePath = await resolveFilePathFromProjectRoot(file);
		const hierarchyCandidates = buildHierarchyCandidates(
			absoluteFilePath,
			normalizedEnvironment,
			localIgnoredEnvironments
		);

		return filterExistingFiles(hierarchyCandidates);
	};

/**
 * Creates a sync resolver bound to a specific environment.
 *
 * This has the same contract and precedence semantics as {@link resolveConfigChainFor},
 * but uses synchronous filesystem operations.
 *
 * @param environment Explicit target environment.
 * @returns Curried sync resolver function.
 *
 * @example
 * ```ts
 * import { resolveConfigChainForSync } from "yassa";
 *
 * const resolveProdConfigs = resolveConfigChainForSync("production");
 * const files = resolveProdConfigs("config/app.json");
 * // Example:
 * // ["/app/config/app.production.local.json", "/app/config/app.production.json", "/app/config/app.json"]
 * ```
 */
export const resolveConfigChainForSync =
	(environment: string): ConfigHierarchyFilesResolverSync =>
	(file, localIgnoredEnvironments = EMPTY_LOCAL_IGNORED_ENVIRONMENTS) => {
		const normalizedEnvironment = normalizeEnvironment(environment);
		const absoluteFilePath = resolveFilePathFromProjectRootSync(file);
		const hierarchyCandidates = buildHierarchyCandidates(
			absoluteFilePath,
			normalizedEnvironment,
			localIgnoredEnvironments
		);

		return filterExistingFilesSync(hierarchyCandidates);
	};

/**
 * Creates an async resolver that returns the single effective file for an explicit environment.
 *
 * Internally it resolves the full chain using {@link resolveConfigChainFor} and returns the first item.
 * If no readable candidate exists, it returns `undefined`.
 *
 * @param environment Explicit target environment.
 * @returns Curried async resolver function that resolves to one file or `undefined`.
 *
 * @example
 * ```ts
 * import { resolveConfigFileFor } from "yassa";
 *
 * const resolveDevConfig = resolveConfigFileFor("development");
 * const file = await resolveDevConfig(".env");
 * // "/app/.env.development.local" | "/app/.env.local" | "/app/.env.development" | "/app/.env" | undefined
 * ```
 */
export const resolveConfigFileFor =
	(environment: string): ConfigHierarchyFileResolver =>
	async (file, localIgnoredEnvironments = EMPTY_LOCAL_IGNORED_ENVIRONMENTS) => {
		const resolveFiles = resolveConfigChainFor(environment);
		const files = await resolveFiles(file, localIgnoredEnvironments);

		return firstOrUndefined(files);
	};

/**
 * Creates a sync resolver that returns the single effective file for an explicit environment.
 *
 * This is the synchronous counterpart of {@link resolveConfigFileFor}.
 *
 * @param environment Explicit target environment.
 * @returns Curried sync resolver function that returns one file or `undefined`.
 *
 * @example
 * ```ts
 * import { resolveConfigFileForSync } from "yassa";
 *
 * const resolveProdConfig = resolveConfigFileForSync("production");
 * const file = resolveProdConfig(".env");
 * // "/app/.env.production.local" | "/app/.env.local" | "/app/.env.production" | "/app/.env" | undefined
 * ```
 */
export const resolveConfigFileForSync =
	(environment: string): ConfigHierarchyFileResolverSync =>
	(file, localIgnoredEnvironments = EMPTY_LOCAL_IGNORED_ENVIRONMENTS) => {
		const resolveFiles = resolveConfigChainForSync(environment);
		const files = resolveFiles(file, localIgnoredEnvironments);

		return firstOrUndefined(files);
	};

/**
 * Resolves the existing config chain using `process.env.NODE_ENV` (async).
 *
 * Use this in typical runtime code where environment comes from process state.
 * If `NODE_ENV` is missing or blank, this function throws.
 *
 * Delegates to {@link resolveConfigChainFor} with the resolved runtime environment.
 *
 * @param file Base file path (relative to project root or absolute).
 * @param localIgnoredEnvironments Optional environment names where `.local` variants should be ignored.
 * @returns Existing readable files in precedence order (most specific first).
 *
 * @throws {Error} When `process.env.NODE_ENV` is missing or empty.
 *
 * @example
 * ```ts
 * import { resolveConfigChain } from "yassa";
 *
 * process.env.NODE_ENV = "development";
 * const files = await resolveConfigChain(".env");
 * ```
 */
export const resolveConfigChain: ConfigHierarchyFilesResolver = async (
	file,
	localIgnoredEnvironments = EMPTY_LOCAL_IGNORED_ENVIRONMENTS
) => {
	const resolveFiles = resolveConfigChainFor(getCurrentEnvironment());
	return resolveFiles(file, localIgnoredEnvironments);
};

/**
 * Synchronous version of {@link resolveConfigChain}.
 *
 * @param file Base file path (relative to project root or absolute).
 * @param localIgnoredEnvironments Optional environment names where `.local` variants should be ignored.
 * @returns Existing readable files in precedence order (most specific first).
 *
 * @throws {Error} When `process.env.NODE_ENV` is missing or empty.
 *
 * @example
 * ```ts
 * import { resolveConfigChainSync } from "yassa";
 *
 * process.env.NODE_ENV = "production";
 * const files = resolveConfigChainSync("config/app.json");
 * ```
 */
export const resolveConfigChainSync: ConfigHierarchyFilesResolverSync = (
	file,
	localIgnoredEnvironments = EMPTY_LOCAL_IGNORED_ENVIRONMENTS
) => {
	const resolveFiles = resolveConfigChainForSync(getCurrentEnvironment());
	return resolveFiles(file, localIgnoredEnvironments);
};

/**
 * Resolves the single effective config file using `process.env.NODE_ENV` (async).
 *
 * Internally this function resolves the full runtime chain and returns its first item.
 *
 * @param file Base file path (relative to project root or absolute).
 * @param localIgnoredEnvironments Optional environment names where `.local` variants should be ignored.
 * @returns Most specific existing readable file path, or `undefined`.
 *
 * @throws {Error} When `process.env.NODE_ENV` is missing or empty.
 *
 * @example
 * ```ts
 * import { resolveConfigFile } from "yassa";
 *
 * process.env.NODE_ENV = "test";
 * const file = await resolveConfigFile(".env", ["test"]);
 * // resolves ".env.test" first (if present), then ".env", otherwise undefined
 * ```
 */
export const resolveConfigFile: ConfigHierarchyFileResolver = async (
	file,
	localIgnoredEnvironments = EMPTY_LOCAL_IGNORED_ENVIRONMENTS
) => {
	const resolveFile = resolveConfigFileFor(getCurrentEnvironment());
	return resolveFile(file, localIgnoredEnvironments);
};

/**
 * Synchronous version of {@link resolveConfigFile}.
 *
 * @param file Base file path (relative to project root or absolute).
 * @param localIgnoredEnvironments Optional environment names where `.local` variants should be ignored.
 * @returns Most specific existing readable file path, or `undefined`.
 *
 * @throws {Error} When `process.env.NODE_ENV` is missing or empty.
 *
 * @example
 * ```ts
 * import { resolveConfigFileSync } from "yassa";
 *
 * process.env.NODE_ENV = "development";
 * const file = resolveConfigFileSync(".env");
 * ```
 */
export const resolveConfigFileSync: ConfigHierarchyFileResolverSync = (
	file,
	localIgnoredEnvironments = EMPTY_LOCAL_IGNORED_ENVIRONMENTS
) => {
	const resolveFile = resolveConfigFileForSync(getCurrentEnvironment());
	return resolveFile(file, localIgnoredEnvironments);
};

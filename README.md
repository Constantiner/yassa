# yassa<!-- omit in toc -->

[![codecov](https://codecov.io/gh/Constantiner/yassa/graph/badge.svg?token=6I2WF0CEKL)](https://codecov.io/gh/Constantiner/yassa)

Resolve environment-aware config file hierarchy for Node.js applications.

`yassa` is the modernized successor of
[`resolve-node-configs-hierarchy`](https://github.com/Constantiner/resolve-node-configs-hierarchy),
maintained by the same developers.

`yassa` helps you find:

1. The full precedence chain of existing config files (most specific first), or
2. The single most authoritative file for the current or explicit environment.

It is designed for predictable config loading in environments like `development`, `test`, and `production`.

## Table of Contents<!-- omit in toc -->

- [Installation](#installation)
    - [Requirements](#requirements)
- [When to Use](#when-to-use)
- [How Resolution Works](#how-resolution-works)
- [Quick Start](#quick-start)
    - [Resolve chain for current `NODE_ENV`](#resolve-chain-for-current-node_env)
    - [Resolve only the most authoritative file](#resolve-only-the-most-authoritative-file)
    - [Explicit environment (independent from `NODE_ENV`)](#explicit-environment-independent-from-node_env)
    - [Team-reproducible test mode (ignore local files for test)](#team-reproducible-test-mode-ignore-local-files-for-test)
- [API Reference](#api-reference)
- [Runtime Environment (`process.env.NODE_ENV`)](#runtime-environment-processenvnode_env)
    - [`resolveConfigChain(file, localIgnoredEnvironments?)`](#resolveconfigchainfile-localignoredenvironments)
    - [`resolveConfigChainSync(file, localIgnoredEnvironments?)`](#resolveconfigchainsyncfile-localignoredenvironments)
    - [`resolveConfigFile(file, localIgnoredEnvironments?)`](#resolveconfigfilefile-localignoredenvironments)
    - [`resolveConfigFileSync(file, localIgnoredEnvironments?)`](#resolveconfigfilesyncfile-localignoredenvironments)
- [Explicit Environment Factories](#explicit-environment-factories)
    - [`resolveConfigChainFor(environment)`](#resolveconfigchainforenvironment)
    - [`resolveConfigChainForSync(environment)`](#resolveconfigchainforsyncenvironment)
    - [`resolveConfigFileFor(environment)`](#resolveconfigfileforenvironment)
    - [`resolveConfigFileForSync(environment)`](#resolveconfigfileforsyncenvironment)
- [Behavior Details](#behavior-details)
- [`localIgnoredEnvironments` semantics](#localignoredenvironments-semantics)
- [Error behavior](#error-behavior)
- [Common Patterns](#common-patterns)
    - [Load env files with a precedence chain](#load-env-files-with-a-precedence-chain)
    - [Load one authoritative JSON config](#load-one-authoritative-json-config)
    - [Build reusable resolvers](#build-reusable-resolvers)
- [Edge Cases](#edge-cases)
- [FAQ](#faq)
    - [Why return `undefined` instead of throwing when nothing is found?](#why-return-undefined-instead-of-throwing-when-nothing-is-found)
    - [Should I use sync or async API?](#should-i-use-sync-or-async-api)
    - [Should I use runtime wrappers or explicit factories?](#should-i-use-runtime-wrappers-or-explicit-factories)
- [Why the Name "Yassa"](#why-the-name-yassa)

## Installation

```bash
npm install yassa
```

### Requirements

- Node.js `>=16` (runtime)
- Works with ESM and CJS consumers via package exports

## When to Use

Use `yassa` when your project has layered config files such as:

- `.env`
- `.env.production`
- `.env.local`
- `.env.production.local`

and you need deterministic precedence logic while safely ignoring missing files.

Typical use cases:

1. Environment variable bootstrap
2. JSON/YAML config file selection
3. Team-safe test config loading (ignore local overrides in tests)

## How Resolution Works

Given a base file (for example `.env`) and an environment (`development`), `yassa` builds candidates in this order:

1. `<name>.<environment>.local<ext>`
2. `<name>.local<ext>`
3. `<name>.<environment><ext>`
4. `<name><ext>`

Then it returns only candidates that are:

1. Existing
2. Readable
3. Regular files (directories are excluded)

Important details:

1. Paths are resolved from `realpath(process.cwd())`.
2. Symlinks to files are supported (resolved via `stat`).
3. Missing candidates are ignored (not treated as errors).
4. Return order is always most specific first.

This precedence model is inspired by the Ruby on Rails-style `.env` layering documented in `dotenv`:
https://github.com/bkeepers/dotenv?tab=readme-ov-file#customizing-rails

## Quick Start

### Resolve chain for current `NODE_ENV`

```ts
import { resolveConfigChain } from "yassa";

process.env.NODE_ENV = "development";

const files = await resolveConfigChain(".env");
// Example result:
// [
//   "/app/.env.development.local",
//   "/app/.env.local",
//   "/app/.env.development",
//   "/app/.env"
// ]
```

### Resolve only the most authoritative file

```ts
import { resolveConfigFile } from "yassa";

process.env.NODE_ENV = "production";

const file = await resolveConfigFile("config/app.json");
// "/app/config/app.production.local.json" | ... | undefined
```

### Explicit environment (independent from `NODE_ENV`)

```ts
import { resolveConfigChainFor, resolveConfigFileFor } from "yassa";

const resolveStagingChain = resolveConfigChainFor("staging");
const resolveStagingFile = resolveConfigFileFor("staging");

const chain = await resolveStagingChain(".env");
const top = await resolveStagingFile(".env");
```

### Team-reproducible test mode (ignore local files for test)

```ts
import { resolveConfigChainFor } from "yassa";

const resolveTestChain = resolveConfigChainFor("test");
const chain = await resolveTestChain(".env", ["test"]);

// For test env, local overrides are excluded:
// ["/app/.env.test", "/app/.env"]
```

## API Reference

## Runtime Environment (`process.env.NODE_ENV`)

### `resolveConfigChain(file, localIgnoredEnvironments?)`

- Type: `(file: string, localIgnoredEnvironments?: readonly string[]) => Promise<readonly string[]>`
- Resolves existing chain for current `NODE_ENV`.
- Throws if `NODE_ENV` is missing or empty.

### `resolveConfigChainSync(file, localIgnoredEnvironments?)`

- Type: `(file: string, localIgnoredEnvironments?: readonly string[]) => readonly string[]`
- Synchronous counterpart of `resolveConfigChain`.
- Throws if `NODE_ENV` is missing or empty.

### `resolveConfigFile(file, localIgnoredEnvironments?)`

- Type: `(file: string, localIgnoredEnvironments?: readonly string[]) => Promise<string | undefined>`
- Returns the top file from `resolveConfigChain`.
- Returns `undefined` when no candidates exist.
- Throws if `NODE_ENV` is missing or empty.

### `resolveConfigFileSync(file, localIgnoredEnvironments?)`

- Type: `(file: string, localIgnoredEnvironments?: readonly string[]) => string | undefined`
- Synchronous counterpart of `resolveConfigFile`.
- Throws if `NODE_ENV` is missing or empty.

## Explicit Environment Factories

### `resolveConfigChainFor(environment)`

- Type: `(environment: string) => (file: string, localIgnoredEnvironments?: readonly string[]) => Promise<readonly string[]>`
- Curried async factory for environment-bound chain resolution.

### `resolveConfigChainForSync(environment)`

- Type: `(environment: string) => (file: string, localIgnoredEnvironments?: readonly string[]) => readonly string[]`
- Synchronous counterpart of `resolveConfigChainFor`.

### `resolveConfigFileFor(environment)`

- Type: `(environment: string) => (file: string, localIgnoredEnvironments?: readonly string[]) => Promise<string | undefined>`
- Curried async factory for single-file resolution.

### `resolveConfigFileForSync(environment)`

- Type: `(environment: string) => (file: string, localIgnoredEnvironments?: readonly string[]) => string | undefined`
- Synchronous counterpart of `resolveConfigFileFor`.

## Behavior Details

## `localIgnoredEnvironments` semantics

This parameter does **not** disable the whole hierarchy.
It disables only `.local` variants for the matching environment.

For base `.env`, environment `test`, and `localIgnoredEnvironments = ["test"]`:

1. Excluded: `.env.test.local`, `.env.local`
2. Still considered: `.env.test`, `.env`

This is useful for keeping local machine overrides out of team/shared test execution.

## Error behavior

- `resolveConfig*` (runtime wrappers) throw if `NODE_ENV` is absent or blank.
- `resolveConfig*For` throw if explicit `environment` is blank/whitespace.
- Missing files do not throw.

## Common Patterns

### Load env files with a precedence chain

```ts
import { config as dotenvConfig } from "dotenv";
import { resolveConfigChain } from "yassa";

process.env.NODE_ENV = process.env.NODE_ENV || "development";

for (const file of await resolveConfigChain(".env", ["test"])) {
	dotenvConfig({ path: file, override: false });
}
```

### Load one authoritative JSON config

```ts
import { readFile } from "node:fs/promises";

import { resolveConfigFileFor } from "yassa";

const resolveProdConfig = resolveConfigFileFor("production");
const configPath = await resolveProdConfig("config/app.json");

if (!configPath) {
	throw new Error("No production config file found");
}

const config = JSON.parse(await readFile(configPath, "utf8"));
```

### Build reusable resolvers

```ts
import { resolveConfigChainForSync } from "yassa";

const resolveTestChainSync = resolveConfigChainForSync("test");

const files = resolveTestChainSync(".env", ["test"]);
```

## Edge Cases

`yassa` supports:

1. Dotted filenames with extension, e.g. `.env.json`
    - `.env.staging.local.json`, `.env.local.json`, `.env.staging.json`, `.env.json`
2. Filenames ending with a dot, e.g. `index.`
    - `index.qa.local.`, `index.local.`, `index.qa.`, `index.`
3. Absolute and relative input paths
4. Symlinked files

Directories that happen to match candidate names are excluded.

## FAQ

### Why return `undefined` instead of throwing when nothing is found?

Missing config layers are normal in hierarchy-based loading. `undefined`/empty array keeps the API composable and explicit.

### Should I use sync or async API?

1. Use async in long-running apps and CLI tools where startup can be async.
2. Use sync in bootstrapping paths that are already sync.

### Should I use runtime wrappers or explicit factories?

1. Use `resolveConfig*` when `NODE_ENV` is your source of truth.
2. Use `resolveConfig*For` in libraries/tests where environment must be explicit and decoupled from process globals.

## Why the Name "Yassa"

The library name points to a hierarchy-and-authority model.

Historically, **Yassa** (also written as Yasa / Yasaq / Jasagh) is commonly described as Genghis Khan’s body of binding decrees and rulings for the Mongol state and army. A key scholarly nuance is that no single complete official text survives; what is called “the Yassa” is reconstructed from scattered references in medieval sources and later scholarship.

Why this maps to the library:

1. Single authoritative decision point
    - `resolveConfigFile*` returns the top-priority effective file.
2. Deterministic hierarchy
    - Candidates are always resolved in a strict, predictable order.
3. Command-chain behavior
    - `resolveConfigChain*` exposes the full precedence stack used to derive authority.
4. Controlled local override policy
    - `localIgnoredEnvironments` lets teams deliberately suppress local overrides in specific environments (for example `test`) for reproducibility.

The name is used as a conceptual metaphor for precedence and authoritative resolution, not as a legal or historical claim about a complete codified text.

# yassa

## 1.0.1

### Patch Changes

- 377ffac: Relax array type contracts by removing `readonly` requirements across resolver APIs.

    ### What changed
    - `LocalIgnoredEnvironments` now accepts `string[]` instead of `readonly string[]`.
    - Chain resolvers now return mutable arrays (`string[]`) instead of readonly arrays.
    - Related internal helper typings were aligned to the same mutable array contracts.

    ### Impact
    - Runtime behavior is unchanged.
    - Type ergonomics are improved for consumers who work with mutable arrays.

## 1.0.0

### Major Changes

- 4c82983: ## Initial release

    This is the first public release of `yassa`.

    ### Highlights
    - Introduces deterministic config hierarchy resolution for Node.js projects.
    - Supports both full-chain resolution and single authoritative file resolution.
    - Provides async and sync APIs for runtime and bootstrapping use cases.
    - Supports explicit environment factories with curried API design.

    ### API
    - Added runtime `NODE_ENV` resolvers:
        - `resolveConfigChain`
        - `resolveConfigChainSync`
        - `resolveConfigFile`
        - `resolveConfigFileSync`
    - Added explicit environment factories:
        - `resolveConfigChainFor`
        - `resolveConfigChainForSync`
        - `resolveConfigFileFor`
        - `resolveConfigFileForSync`

    ### Resolution behavior
    - Applies strict precedence from most specific to least specific:
        - `<name>.<env>.local<ext>`
        - `<name>.local<ext>`
        - `<name>.<env><ext>`
        - `<name><ext>`
    - Returns only existing, readable regular files (directories excluded).
    - Supports symlinked files.
    - Supports dotted filenames (for example `.env.json`) and trailing-dot filenames (for example `index.`).
    - Supports `localIgnoredEnvironments` to disable `.local` variants per target environment (for example reproducible test runs).

    ### Return values and errors
    - Chain resolvers return `string[]` (possibly empty).
    - Single-file resolvers return `string | undefined`.
    - Runtime wrappers throw when `NODE_ENV` is missing or empty.
    - Explicit-environment factories throw when environment is blank.

    ### Quality and docs
    - Includes strict TypeScript typing and JSDoc for all exported APIs.
    - Includes test coverage for precedence, edge cases, ignored-local behavior, and error paths.
    - Current coverage target achieved at 100%.

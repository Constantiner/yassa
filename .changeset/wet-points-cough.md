---
"yassa": patch
---

Relax array type contracts by removing `readonly` requirements across resolver APIs.

### What changed

- `LocalIgnoredEnvironments` now accepts `string[]` instead of `readonly string[]`.
- Chain resolvers now return mutable arrays (`string[]`) instead of readonly arrays.
- Related internal helper typings were aligned to the same mutable array contracts.

### Impact

- Runtime behavior is unchanged.
- Type ergonomics are improved for consumers who work with mutable arrays.

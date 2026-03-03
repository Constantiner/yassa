---
"yassa": patch
---

Improve release workflow stability and add test coverage for local-ignore behavior.

### What changed

- Added a test that verifies `.local` files remain part of the resolved hierarchy when `localIgnoredEnvironments` does not include the active environment.
- Cleaned up release workflow by removing temporary one-time backfill logic and restoring the standard publish path.

### Impact

- No changes to the library runtime behavior or public API.
- Improves confidence in expected resolution behavior and release automation reliability.

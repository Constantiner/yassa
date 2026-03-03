---
"yassa": patch
---

Add non-happy-path coverage for config hierarchy resolution and improve release verification flow.

### What changed

- Added tests to verify that files from unrelated environments are excluded from resolver results.
- Updated release/backfill automation and release-process documentation to support publication verification.

### Impact

- No changes to the library runtime logic or public API.
- This release is focused on test coverage and release automation reliability.

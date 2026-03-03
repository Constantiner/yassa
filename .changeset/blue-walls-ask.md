---
"yassa": patch
---

Stabilize automated release publishing flow and align release documentation.

### What changed

- Updated release workflow to use the standard push-based Changesets publish flow with trusted publishing.
- Set Changesets config `commit` to `false` to avoid auto-generated release commits that can suppress push-triggered workflows.
- Refined release runbook and troubleshooting guidance to match the final release automation behavior.

### Impact

- No runtime behavior changes.
- No public API or type contract changes.
- Improves release reliability and maintainer experience.

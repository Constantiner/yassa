# DEVELOPMENT RUNBOOK

This is the operational playbook for maintaining and releasing the `yassa` npm package.
It is written for a new maintainer with zero project context.

Project lineage:
`yassa` is the modernized successor of
https://github.com/Constantiner/resolve-node-configs-hierarchy
from the same developers.

Date baseline for this document: March 1, 2026.

## 1) Repository Automation Map (What controls what)

Use this section when you forget where behavior comes from.

| Area                          | File                                      | What it controls                                                      |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| npm scripts                   | `package.json` (`scripts`)                | All local commands: lint, typecheck, tests, build, release helpers    |
| TypeScript strictness         | `tsconfig.json`                           | Type checking rules for source and JS config files                    |
| Declaration build             | `tsconfig.build.json`                     | `d.ts` generation for publish artifacts                               |
| JS bundling                   | `tsdown.config.ts`                        | ESM + CJS build output into `dist/`                                   |
| Lint rules                    | `eslint.config.js`                        | Type-aware linting and code quality checks                            |
| Formatting                    | `prettier.config.js`                      | Formatting style for all files                                        |
| Pre-commit staged-file checks | `.lintstagedrc.json`                      | ESLint + Prettier on staged files only                                |
| Git hook trigger              | `.husky/pre-commit`                       | Runs `lint-staged` then full `typecheck` before commit                |
| CI on PR/push                 | `.github/workflows/ci.yml`                | Runs full project check pipeline on matrix Node versions              |
| Release automation            | `.github/workflows/release.yml`           | Changesets release PR + npm publish + GitHub `v<version>` tag/release |
| Release metadata              | `.changeset/config.json`                  | Changesets behavior (branch, access, commit strategy)                 |
| npm pack contents             | `package.json` (`files`, `exports`, etc.) | What is shipped to npm                                                |

## 2) Reality Check: Node Version Support

Current configs are inconsistent:

- Runtime/build targets still state Node 16 compatibility:
    - `package.json` -> `"engines": { "node": ">=16" }`
    - `tsdown.config.ts` -> `target: "node16"`
- CI currently tests `20.x`, `22.x` (`.github/workflows/ci.yml`)
- Several dev tools now require newer Node versions than 16.

Practical recommendation for local maintenance today: use Node `22.x`.
It matches release workflow Node setup and avoids toolchain compatibility surprises.

## 3) First-Time Local Setup After Checkout

Follow exactly in order.

### Step 1. Install Node and npm

1. Install Node `22.x` (recommended for this repo as of March 1, 2026).
2. Confirm versions:

```bash
node -v
npm -v
```

Why: release workflow uses Node 22, so matching locally reduces drift.
Where configured: `.github/workflows/release.yml` (`actions/setup-node`, `node-version: 22.x`).

### Step 2. Install dependencies cleanly

```bash
npm ci
```

What it does:

- Installs exactly what is pinned in `package-lock.json`
- Runs `prepare` script automatically after install

Where configured:

- `package.json` -> `"prepare": "husky"`
- `.npmrc` -> `legacy-peer-deps=true`

Why:

- `npm ci` is deterministic and CI-equivalent.
- Husky hook installation is required for local pre-commit automation.

### Step 3. Verify hooks were installed

```bash
ls -la .husky
cat .husky/pre-commit
```

Expected pre-commit hook commands:

1. `npm run lint-staged`
2. `npm run typecheck`

Where configured: `.husky/pre-commit`.

### Step 4. Run baseline project checks once

```bash
npm run checks
npm run test
npm run build
npm run pack:dry-run
```

What each does:

- `checks`: lint + typecheck
- `test`: unit tests once
- `build`: JS bundles + type declarations
- `pack:dry-run`: simulate npm package tarball contents

Where configured: `package.json` scripts.

Why: confirms your machine matches CI/release expectations before feature work.

## 4) Daily Development Workflow (New feature or fix)

### Step 1. Start branch

```bash
git checkout -b feat/short-description
```

Why: clean review and clean changeset ownership.

### Step 2. Implement code in `src/`

Keep changes focused and semver-aware.

### Step 3. Run fast local checks while coding

```bash
npm run checks
npm run test
```

Optional when needed:

```bash
npm run lint:fix
npm run format
npm run test:watch
```

### Step 4. Create a changeset for user-facing changes

```bash
npm run changeset
```

Prompt flow (single-package repo):

1. Select package: `yassa`
2. Select bump type: `patch`, `minor`, or `major`
3. Write release summary text

Output: one markdown file in `.changeset/`.

Where configured:

- Command: `package.json` -> `"changeset": "changeset"`
- Changesets behavior: `.changeset/config.json`

Why: release automation depends on pending changesets in `main`.

### Step 5. Commit

```bash
git add .
git commit -m "feat: ..."
```

What runs automatically on commit:

1. `lint-staged` on staged files
2. full `typecheck`

Where configured:

- Hook: `.husky/pre-commit`
- Staged rules: `.lintstagedrc.json`

If commit fails, fix errors and commit again.

### Step 6. Push + PR

```bash
git push -u origin feat/short-description
```

Open PR to `main`.

What runs on PR:

- CI workflow (`.github/workflows/ci.yml`) on pull request events
- Also runs on pushes to `main`

CI command path:

- `npm ci`
- `npm run ci`

`npm run ci` expands to:

1. `format:check`
2. `lint`
3. `typecheck`
4. `test:coverage`
5. `build`

## 5) What Happens on Commit, PR, and Merge

### On local commit

Triggered by Git hook (`.husky/pre-commit`):

1. `npm run lint-staged`
2. `npm run typecheck`

Purpose:

- Block commits with obvious formatting/lint/type errors.

### On PR open / PR update

Triggered by `.github/workflows/ci.yml` (`on: pull_request`):

- Runs matrix job on Node `20.x`, `22.x`
- Executes full `npm run ci`

Purpose:

- Gate code quality before merge.

### On merge to `main`

Two workflows run on `push` to `main`:

1. `CI` workflow (`ci.yml`)
2. `Release` workflow (`release.yml`)

Release workflow uses `changesets/action@v1` in a single job:

- `version` command: `npm run version-packages`
- `publish` command: `npm run release:publish`
- `createGithubReleases: true`

Behavior:

- If pending changesets exist: action opens or updates the "Version Packages" release PR.
- After "Version Packages" PR is merged: next `push` run publishes to npm and creates GitHub release/tag.
- `.changeset/config.json` uses `"commit": false` to avoid auto-generated release commits with `[skip ci]`, so push-triggered release runs are not suppressed.

## 6) Reference Release Workflow (Patch, Minor, Major)

This is the standard path for maintainers. Do not skip changesets.

### A. Prepare the change

On a feature/fix branch:

1. Implement code and tests.
2. Run:

```bash
npm run ci
```

3. Create changeset:

```bash
npm run changeset
```

4. Choose bump type based on semver intent:

- `patch`: backward-compatible bug fix / tiny behavior correction
- `minor`: backward-compatible new feature
- `major`: breaking change

5. Commit code + changeset file.
6. Open PR and merge to `main` after CI passes.

### B. Release PR phase (automated)

After merge to `main`, release workflow creates/updates release PR.

Release PR contains generated changes:

- `package.json` version bump
- `package-lock.json` updates
- changelog updates (if configured for package)
- deletion of consumed changeset files

Maintainer action:

1. Review release PR content carefully.
2. Ensure bump level matches intended semver impact.
3. Merge release PR.

### C. Publish phase (automated)

After release PR merge, the next `push` run executes:

```bash
npm run release:publish
```

`npm run release:publish` expands to:

1. `npm run build`
2. `changeset publish`

Publish result:

- package published to npm
- version tag and GitHub release created automatically from the published changeset

Manual fallback command:

```bash
npm run release
```

`npm run release` intentionally runs full validation first (`npm run ci`) and then calls `npm run release:publish`.

### D. Why release previously looked broken

If you saw:

- feature PR merged
- "Version Packages" PR merged
- no release workflow run afterwards

the usual root cause is `[skip ci]` in the merge commit generated by changesets/release PR flow.
That is expected GitHub behavior for `push`/`pull_request` triggers, not random workflow flakiness.

This repository avoids that failure mode by using `.changeset/config.json` with `"commit": false`.

## 7) Major vs Minor vs Patch: Decision Rules

Use this quick classifier before creating the changeset.

### Patch

Choose `patch` when:

- fixing incorrect behavior without API contract changes
- improving internals without new public API
- docs-only changes that still need a release note (optional)

### Minor

Choose `minor` when:

- adding new optional API
- adding behavior that is backward compatible
- extending types without breaking existing usage

### Major

Choose `major` when:

- removing or renaming exports
- changing function signatures incompatibly
- changing runtime behavior in a way existing consumers may break
- raising minimum supported runtime in a breaking way

For major releases, add migration notes in changeset summary and PR description.

## 8) npm Trusted Publishing (Current workflow)

Current release workflow publishes to npm using Trusted Publishing (OIDC), not `NPM_TOKEN`.

Where configured:

- `.github/workflows/release.yml`:
    - trigger: `on.push.branches = [main]`
    - manual recovery trigger: `on.workflow_dispatch`
    - permissions: `contents: write`, `pull-requests: write`, `id-token: write`
- `changesets/action` publishes via `npm run release:publish`
- no `NPM_TOKEN` is provided to publish step when using Trusted Publishing
- workflow upgrades npm to `>=11.5.1` before publishing
- `prepublishOnly` is intentionally lightweight (`npm run build`) so short-lived OIDC credentials are not consumed by long checks
- `.changeset/config.json`:
    - `"commit": false` prevents `[skip ci]` auto-commit messages from suppressing push-triggered release runs

### Required npm-side setup checklist

1. Open npm package settings for `yassa`.
2. Configure a Trusted Publisher.
3. Provider: GitHub Actions.
4. Repository: `Constantiner/yassa`.
5. Workflow file path: `.github/workflows/release.yml`.
6. Branch restriction: `main` (recommended).

Why:

- avoids long-lived publish tokens
- npm issues short-lived credentials for the trusted workflow run
- reduces secret leakage risk

Also used in release workflow:

- `GITHUB_TOKEN` to create tags/releases in GitHub
- modern npm CLI (trusted publishing requirements can be stricter than Node-bundled npm)

### `.npmrc` in this repository

- Current project `.npmrc` (`legacy-peer-deps=true`) does not block workflow triggers.
- Trigger failures after merging "Version Packages" are caused by `[skip ci]` + `push` trigger behavior, not by `.npmrc`.
- If you ever switch to token-based fallback publishing, write auth to `$HOME/.npmrc` in workflow (not project `.npmrc`), for example:
    - `//registry.npmjs.org/:_authToken=$NPM_TOKEN`

## 9) Token-Based Publish (Fallback only)

Use token-based publishing only if Trusted Publishing is unavailable.

### Step-by-step: create and store `NPM_TOKEN`

1. Log in to npm (`npmjs.com`) with owner account.
2. Open account menu -> `Access Tokens`.
3. Click `Generate New Token`.
4. Create granular token with publish permissions for this package/scope.
5. Set expiration and copy token immediately (full token shown once).
6. In GitHub repo: `Settings -> Secrets and variables -> Actions -> New repository secret`.
7. Secret name: `NPM_TOKEN`.
8. Secret value: token from npm.

Security notes:

- Prefer least privilege token scope.
- Use expiration and rotate regularly.
- Revoke token immediately if leaked.

## 10) Manual Release (Fallback / Emergency)

Use only if GitHub release automation is unavailable.

1. Ensure local branch is up to date with `main`.
2. Install dependencies:

```bash
npm ci
```

3. Run full checks:

```bash
npm run ci
```

4. Apply versions from pending changesets:

```bash
npm run version-packages
```

5. Review version/changelog edits, commit, and push.
6. Ensure npm auth locally (`npm whoami` should succeed with publish access).
7. Publish:

```bash
npm run release
```

8. Verify package on npm and tag/release visibility on GitHub.

Important:

- Prefer automated workflow for auditability and consistency.

## 11) Operational Verification Commands

Use these after each release-related merge:

```bash
# list recent Release workflow runs
gh run list --workflow release.yml --limit 20

# inspect one specific run (replace RUN_ID)
gh run view RUN_ID

# manually trigger release workflow on current main (recovery/debug)
gh workflow run release.yml

# verify npm versions published
npm view yassa versions --json

# verify GitHub releases
gh release list

# verify git tags
git tag --list 'v*'
```

Useful targeted checks:

```bash
# show merge commit metadata for Version Packages PR (replace PR_NUMBER)
gh pr view PR_NUMBER --json number,title,headRefName,baseRefName,mergedAt,mergeCommit
```

## 12) Troubleshooting and Q&A

### Q1: Commit is blocked before it is created

Cause:

- pre-commit hook failed (`lint-staged` or `typecheck`).

Fix:

1. Run `npm run checks`.
2. Run `npm run format` or `npm run lint:fix` if needed.
3. Re-stage and commit again.

### Q2: PR CI fails but local checks pass

Likely causes:

- different Node version from CI matrix
- unstaged/uncommitted generated changes not pushed

Fix:

1. Match Node version to CI (recommend 22 locally).
2. Run `npm ci` then `npm run ci` from clean tree.

### Q3: No release PR appeared after merge

Cause:

- no pending changeset files reached `main`.

Fix:

1. Add changeset in new PR.
2. Merge PR to `main`.

### Q4: Release PR exists but package is not published

Cause:

- release PR was not merged yet.
- release workflow failed on `push` after release PR merge.
- release commit still contained `[skip ci]` from old config/history.

Fix:

1. Merge release PR.
2. Confirm a `Release` workflow run exists for `push` on `main`.
3. If publish failed, inspect `Version or publish via Changesets` step and re-run workflow.
4. Verify `.changeset/config.json` keeps `"commit": false` for future releases.

### Q5: Publish failed with npm auth error

Cause:

- Trusted Publisher mapping is missing/misconfigured in npm, or publish token fallback is invalid.
- npm CLI version in workflow is too old for current trusted publishing requirements.
- long publish lifecycle scripts can consume the short-lived credential window.

Fix:

1. Verify npm Trusted Publisher points to this exact repo/workflow/branch.
2. Confirm workflow has `permissions.id-token: write`.
3. Confirm workflow logs show modern npm version (after upgrade step).
4. Keep publish lifecycle scripts lightweight (in this repo `prepublishOnly` should remain build-only).
5. If using fallback token mode, regenerate token and update `NPM_TOKEN`.
6. Re-run release workflow.

### Q6: Publish failed with "version already exists"

Cause:

- attempting to publish an already published version.

Fix:

1. Ensure release PR bumped version correctly.
2. Avoid manual re-publish of identical version.
3. Create a new patch changeset if another release is needed.

### Q8: npm publish succeeded but GitHub tag/release was not created

Cause:

- `createGithubReleases` was disabled or workflow permissions were insufficient.
- transient GitHub API failure during release creation.

Fix:

1. Ensure `release.yml` keeps `createGithubReleases: true`.
2. Ensure workflow permissions include `contents: write`.
3. Re-run the release workflow for the publish commit.

### Q9: Could `.npmrc` be the reason no publish workflow started?

Cause:

- no, workflow trigger suppression is event-level behavior (for example `[skip ci]` on `push`), not npm config parsing.

Fix:

1. Focus on workflow trigger/event conditions first.
2. Check `.npmrc` only when publish starts but npm authentication/configuration fails.

### Q7: What if I do not know bump type?

Rule of thumb:

- if consumers must change their code: `major`
- if consumers can use new feature without breaking old code: `minor`
- if fix only, no API break: `patch`

When in doubt, choose conservative release notes and ask for review before merge.

## 13) Commands Cheat Sheet

```bash
# install
npm ci

# common quality checks
npm run checks
npm run test
npm run ci

# formatting/linting
npm run lint
npm run lint:fix
npm run format
npm run format:check

# build outputs
npm run build

# release prep
npm run changeset
npm run version-packages
npm run release
npm run release:publish
npm run pack:dry-run
```

## 14) External References (verified March 1, 2026)

- npm access tokens: https://docs.npmjs.com/creating-and-viewing-access-tokens
- npm trusted publishing: https://docs.npmjs.com/trusted-publishers/
- GitHub Actions secrets: https://docs.github.com/actions/security-guides/using-secrets-in-github-actions
- Changesets GitHub Action: https://github.com/changesets/action

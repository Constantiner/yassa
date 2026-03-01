# AGENTS.md

## Project Context

- Repository: `yassa`
- Package: `yassa` on npm
- Project type: Node.js TypeScript library
- Primary objective: production-grade, type-safe library design and delivery

## Agent Operating Rules

- Keep changes tightly scoped to the requested task.
- Prefer minimal, reviewable diffs.
- Do not introduce unrelated refactors.
- State assumptions explicitly when requirements are ambiguous.
- For non-trivial tasks, provide a short plan before editing.

## TypeScript Standards

- Use strict TypeScript defaults and preserve strictness in all new code.
- Prioritize type inference quality and public API type ergonomics.
- Avoid `any` unless explicitly justified.
- Keep exported types intentional; avoid accidental type surface growth.

## Node.js Standards

- Use `node:` namespace imports for Node built-ins.
- Follow modern package conventions (`exports`, explicit entrypoints) when configured.
- Keep runtime compatibility explicit through package configuration.
- Avoid relying on undocumented runtime behavior.

## Library Engineering Guidelines

- Treat semver impact as part of every change.
- Keep public API small, explicit, and backwards-aware.
- Prefer pure functions and deterministic behavior where possible.
- Add tests alongside behavior changes.

## Validation and Delivery

- Run targeted checks for touched areas before completion.
- Report:
- what changed
- how it was validated
- what was deferred
- known risks or follow-ups

## Pull Request Expectations

- Use clear PR titles and concise summaries.
- Include rationale for key implementation decisions.
- Call out any semver-sensitive changes explicitly.

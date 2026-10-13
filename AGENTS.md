# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## Environment notes

- OS: Windows. The shell is PowerShell 5.1 where native script execution may be
  disabled, so **use `npm.cmd` / `npx.cmd`** instead of `npm` / `npx`.
- Do not use `&&` in PowerShell; run commands separately or use `;`.
- Node.js 20+ is required.

## Commands

```bash
npm.cmd install
npm.cmd test          # Vitest unit/integration tests
npm.cmd run test:e2e  # build + Playwright browser tests
npm.cmd run build     # tsc --noEmit && vite build
npm.cmd run validate  # typecheck + tests + build
```

After completing a change: run `npm.cmd run validate`. Before pushing, ensure
`npm.cmd run test:e2e` passes (install browsers once with
`npx.cmd playwright install chromium`).

## Development process

- **Test-driven.** Write or update a failing test first, then implement until
  green, then refactor. Each meaningful, green increment is committed and pushed.
- Keep simulation logic in `src/sim/` pure and free of DOM/canvas imports so it
  stays headless-testable. Rendering belongs in `src/render/`, UI in `src/ui/`,
  input in `src/input/`.
- The simulation must remain **deterministic** for a given seed: never call
  `Math.random()` inside `src/sim/`; use the seeded RNG from `src/sim/rng.ts`.

## Code style

- TypeScript strict mode; avoid `any`. Keep functions small and pure where possible.
- Match existing naming and file conventions.
- Do not add comments unless they clarify non-obvious intent.

## Agent team

This repository ships an opencode agent team in `.opencode/agent/`, with
`default_agent: lead` in `opencode.json`. Restart opencode after editing any
agent file.

| Agent | Mode | Owns | Never touches |
| --- | --- | --- | --- |
| `lead` | primary | `src/main.ts`, `src/sim/types.ts`, integration, commits | — |
| `sim-dev` | subagent | `src/sim/**`, its unit tests | everything outside scope |
| `render-dev` | subagent | `src/render/**`, its unit tests | everything outside scope |
| `ui-input-dev` | subagent | `src/ui/**`, `src/input/**`, their unit tests | everything outside scope |
| `test-dev` | subagent | `tests/e2e/**`, `vitest.config.ts`, `playwright.config.ts` | `src/**` |
| `reviewer` | subagent | read-only review | all edits |

- One writer per file. The lead assigns disjoint workstreams and batches Task
  calls so subagents run in parallel; nobody edits another agent's files.
- Module owners write the failing unit test first (TDD). `test-dev` extends
  `tests/unit/**` only for files the lead assigns.
- Subagents cannot run `git add/commit/push` (hard-denied by their
  permissions); the lead commits green increments sequentially after
  integration.
- `/feature <description>` runs the full parallel workflow; `/validate` drives
  `npm.cmd run validate` to green.

## Commit / push workflow

- Commit after every build that passes tests.
- Push to `origin` immediately after each green commit; do not wait for an
  explicit user order. When behavior changed, `npm.cmd run test:e2e` must pass
  before pushing.
- Concise commit messages in the imperative mood (e.g. `add pheromone diffusion`).

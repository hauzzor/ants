---
description: Plan and implement a feature across the agent team in parallel
agent: lead
---

Implement this feature request:

$ARGUMENTS

Workflow:

1. Restate the request in one paragraph and list the files or modules it
   touches.
2. Split the work into disjoint workstreams by agent ownership. Make
   shared-contract edits (`src/main.ts`, `src/sim/types.ts`) yourself.
3. Launch the needed subagents in parallel by batching all Task calls in a
   single message. Give each a self-contained brief: exact files, acceptance
   criteria, tests to write first, commands to run, and the report format
   you expect.
4. Integrate the results, resolve conflicts, and verify with
   `npm.cmd run validate`; add `npm.cmd run test:e2e` when behavior changed.
5. Ask the reviewer to audit the final diff, address blockers, then commit
   each green increment with a concise imperative message. Push only if the
   user asked.

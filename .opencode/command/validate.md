---
description: Run the full validation gate and fix in-scope failures
agent: lead
---

Run the project validation gate and drive it to green.

1. Run `npm.cmd run validate` (typecheck + unit tests + build).
2. If it fails, route each failure to its owning agent (sim-dev, render-dev,
   ui-input-dev, test-dev) or fix shared-file issues yourself.
3. Re-run until green, then report the exact commands and outcomes.
4. If green and there are uncommitted changes, commit them with a concise
   imperative message.

Extra context from the user: $ARGUMENTS

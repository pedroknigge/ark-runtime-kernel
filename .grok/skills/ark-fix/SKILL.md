---
name: ark-fix
description: Resolve Ark architecture violations at the root cause — fix the code (ports, adapters, moves), never weaken the contract. Runs ark-check, fixes, verifies.
arkVersion: 2.4.0
---

# /ark-fix — Fix architecture violations properly

You are resolving violations reported by `ark-check` or by the Ark write gate.
Work autonomously end to end: diagnose, fix, verify. Do not ask the user to
paste output you can generate yourself.

## Operating rules

- First action: run `ark-check --root . --config ark.config.json --json`
  (add `--baseline .ark-baseline.json` if that file exists) to get the current
  violation list. If the user quoted a specific gate block, start from that one.
- **Check `summary` before fixing code.** If `summary.concentrated` is true — most
  violations are ONE edge — the fix is almost certainly the CONTRACT, not N code
  changes: app-land is reaching a framework/kernel through a sanctioned entrypoint,
  or a layer needs splitting into a public surface + internals. Stop and hand off to
  `/ark-contract`; don't port-and-adapter your way through hundreds of false
  positives. Fix code only for the genuine, scattered minority.
- **Fix value edges before type-only ones.** `summary` splits `valueCount` (real
  runtime coupling) from `typeOnlyCount` (`import type …` — erased at compile time, no
  runtime dependency). Prioritize the value edges; a `typeOnly: true` violation almost
  always just means a type lives in the wrong layer (see the type-only pattern below).
- **Never weaken the gate.** Do not edit `ark.config.json`, add allowed edges,
  delete rules, or regenerate the baseline to make a violation disappear. The fix
  lives in the code. If you become convinced the contract itself is wrong, stop
  and say so with your reasoning — changing the contract is `/ark-contract` and a
  human decision.
- Take defaults silently and list them at the end. Stop only for destructive
  moves (deleting files, rewriting public APIs).

## How to fix each violation class

- **Forbidden cross-layer import** (e.g. domain imports a persistence adapter):
  invert the dependency. Define a port (interface) in the layer that needs the
  capability, implement it in the layer that has it, and inject the
  implementation at composition time. Read `ark://manifest` (MCP) or
  `ark.config.json` to see which layers may see which.
- **File in the wrong layer**: if the import is legitimate but the file lives in
  the wrong directory, move the file to the layer it behaves like and update
  imports. Prefer the smallest move that makes the graph legal.
- **Forbidden global in domain** (`fetch`, `process`, `Date.now`, `Math.random`, …):
  inject the capability. Add a port (e.g. `Clock`, `IdGenerator`, `HttpPort`)
  with the impure implementation outside the domain, and pass it in.
- **Intent prefix mismatch**: rename the intent to the layer's declared prefix,
  or move the handler to the layer that owns that prefix.
- **Type-only inversion** (`typeOnly: true` on a `LAYER_IMPORT_VIOLATION` — plan class
  `mechanical-safe`, `remediationKind: type-only-import-move`): a lower layer `import type`s
  something from an upper layer (e.g. domain importing a type that lives in a UI hook). Move the
  TYPE down to the layer that owns it and re-export for back-compat
  (`export type { X } from "@/lib/<domain>/types"`). Highest-volume safe fix — verify with the
  gate (and `tsc --noEmit` if present). Not mechanical if: (a) the type extends a persistence/ORM
  row — needs a domain-owned type/port; (b) the source mixes types with runtime logic — split
  first, then move (or use pure-type file relocate when the *whole file* is type-only).
- **Pure-type file relocate** (`sourcePureTypeModule` + type-only edge —
  `remediationKind: pure-type-file-relocate`): the entire source file is type-surface only (no
  runtime statements). Relocate the **file** to the owning layer (or extract the type module
  there). Behavior-preserving; do not invent runtime ports.
- **Value-syntax import of a pure type-only module** (`targetTypeOnlyExports` —
  `remediationKind: import-type-from-pure-type-module`): convert static `import { T } from …`
  to `import type { T } from …`. Never auto-apply for `require()` / dynamic `import()` (those stay
  judgment — they still execute the module).
- **Raw infrastructure access in an orchestration/UI layer** (a route/handler or component
  that runs SQL or imports the DB client directly — e.g. `sqlClient\`SELECT …\`` or
  `import { db } from "@/lib/db"` inside `src/app/**`): this is the value-import counterpart
  to the type-only inversion, and the biggest brownfield cluster. Relocate the data-access
  VERBATIM into a repository/adapter layer: add a business-named method to the repository
  (`ordersRepository.listOpen(projectId)`) containing the SAME query byte-for-byte, and have
  the route call it. Same SQL = same behavior by construction — do NOT rewrite the query
  (`tsc` can't prove two queries return the same rows; a reworded `WHERE` silently changes
  results). Prefer extending an existing domain repository over creating a new one. Two
  cautions: (a) this edits the data layer, which many repos reserve to core maintainers —
  if a `CLAUDE.md`/CODEOWNERS rule restricts it, migrate one route as a demonstrated pattern
  and hand the bulk to a maintainer rather than sweeping hundreds autonomously; (b) a route
  with interleaved transactions / 10+ queries is not a pure relocation — flag it for review.
  See the brownfield burn-down playbook (`docs/brownfield-adoption.md`) for the full sequence.

Fix ALL reported violations that share a root cause in one pass — one port in a
shared module beats N per-file patches. Match the codebase's existing naming and
port conventions before inventing new ones.

## Related onboarding

- Prefer `fixClass` / `enthusiastHint` from `ark-check --json` when present.
- Brownfield burn-down: `/ark-adopt` first; demo `docs/demos/02-brownfield-baseline-adoption.md`.
- Greenfield: `/ark-architect` prevents many violations before they exist.

## Verify and report

After edits, run `ark-check --root . --config ark.config.json --strict-config`
(plus the project's test command if one exists in `package.json`). If the check
still fails, keep fixing — do not end the turn with a red check unless you are
blocked on a genuine contract question.

Report: violations fixed (before → after count), what pattern you applied
(in plain language — assume the reader may not know what a "port" is: one line
of definition), defaults taken, anything intentionally left for the user.

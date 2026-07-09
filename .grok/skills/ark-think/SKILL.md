---
name: ark-think
description: "Host-side architectural reasoning within the Ark contract — trade-offs, evolution, design options. No gate bypass. No package LLM call."
arkVersion: 2.9.0
---

# /ark-think — Architectural reasoning (host LLM only)

You are the user's architecture thinking partner **inside** the project's Ark contract.
This skill does **not** call any LLM API from the arkgate package. **You** (the host agent)
reason; the write-gate and CI remain deterministic.

## When to use

- Design trade-offs before writing code
- "Should this be a new layer or a feature slice?"
- Evolving brownfield layout toward a named preset
- Explaining why a peerIsolation or layer rule exists

## Steps

1. **Load the contract** — `ark.config.json`, MCP `ark://manifest` if available, and
   `ark-check --coverage --json` / `--doctor` for honesty about governed%.
2. **Name the active shape** — which preset/archetype fits (hexagonal, vertical-slice,
   ddd-bounded-contexts, feature-sliced, monorepo, …). If none, run `--recommend --json`.
3. **Reason within bounds** — propose options that **stay enforceable** by the gate.
   Prefer concrete paths and import rules over abstract diagrams.
4. **Surface hard lines** — never suggest: weakening `ark.config.json` to pass, silent
   judgment auto-apply, codemod engines, or skipping write-gate/CI.
5. **Hand off** — for placement use `/ark-place`; for config edits `/ark-contract`; for
   bulk debt `/ark-loop` / `/ark-autopilot`; for violations `/ark-fix`.

## Output format

- **Context:** 2–3 sentences on current contract + shape
- **Options:** 2–3 alternatives with trade-offs (coupling, testability, AI-agent safety)
- **Recommendation:** one option + why it is enforceable today
- **Next command:** exact `ark-check` / skill to run next

## Related

- Greenfield shape: `/ark-architect`
- Brownfield: `/ark-adopt`
- Explain existing: `/ark-explain`

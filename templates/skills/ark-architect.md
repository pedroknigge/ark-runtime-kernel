---
name: ark-architect
description: Choose the application shape, adopt phase-1 layers, scaffold directories, and verify honestly — for enthusiasts before codegen. Autonomous.
---

# /ark-architect — Choose your application shape and adopt Ark

The user is building something new or early in Ark adoption. They may not know
layered architecture jargon. Your job: translate **what they want to build**
(application shape, not framework name) into an Ark preset, a phase-1 layer plan,
conventional directories, and a passing honest check — without weakening the gate.

Commands below are written as `ark-check` / `ark`; run each through the project's
package manager (`pnpm exec`, `yarn`, `npx`) — match the lockfile.

## Relationship to other skills

| Skill | When |
|-------|------|
| **/ark-architect** | **Before** — greenfield or fresh config; pick shape + phase 1 |
| /ark-adopt | **After** — messy existing repo |
| /ark-contract | **During** — evolve config safely |
| /ark-place | **During** — one new file |
| /ark-explain | **After** — understand what exists |

## Steps

1. **Detect the shape** — call MCP tool **`ark_recommend`** (or run
   `ark-check --recommend --json`). Read `archetype`, `preset`, `confidence`,
   `adoptInOrder.phase1`, `analogy`, and `why`. Ask at most **two** questions only
   if `confidence < 0.5`:
   - "Will this app save data between sessions?"
   - "Is this one app or several in one repository?"

2. **Present in plain English** — name the application shape (e.g. "product with
   UI and stored data"), not the framework. One analogy. List **phase-1 layers only**.

3. **Map to Ark** — if `ark.config.json` is missing, run
   `ark init --archetype <archetype> --yes` (maps playbook id → preset + gates).
   If a config already exists, use `/ark-contract` to align it — do not regenerate
   unasked.

4. **Scaffold phase 1** — create conventional directories from the preset/playbook
   (`src/domain`, `src/application`, …). Add a one-line README per folder explaining
   what belongs there. Match the nearest sibling file style if code already exists.

5. **Install gates** when the user uses AI coding tools and gates are missing:
   `ark-check --install-agent-gates`.

6. **Verify honestly** — run `ark-check --doctor` and `ark-check --coverage --json`.
   Report `governed.percent`. Say explicitly what is **not** governed yet
   (ungoverned directories, empty layers).

7. **Deliver to the user**
   - ASCII diagram (≤3 boxes for phase 1, inner → outer)
   - Table: "when you build X, put it in Y"
   - Three rules the agent must not break (no domain→database imports, no raw
     `publish()`, no weakening `ark.config.json` to pass)
   - Optional book refs from `books` in the recommendation JSON under "go deeper"

## Operating rules

- Never weaken `ark.config.json`, the baseline, CI, or agent settings to pass.
- Never invent layers outside the 11-layer profile or named presets.
- Flag unrecognized dirs (`utils/`, `lib/`) — user must classify via `/ark-contract`.
- Default to smallest viable phase 1; unlock phase 2 only when the user describes need.
- All user-facing copy is **English**.

## Verify and report

End with `ark-check --root . --config ark.config.json --strict-config` when the
tree is ready. Report: archetype + preset, directories created, governed %, and
the next command if anything remains ungoverned.
# Z09 external matrix — preregistration template

**Status: template only. Not filled. Not evidence.**  
Fill a dated copy (private or public tracker) **before** any D30/D90 clock starts.
Do not backfill after the fact.

## Identity of this registration

| Field | Value |
|-------|--------|
| Registration id | `Z09-MATRIX-YYYYMMDD-###` |
| Registered at (UTC) | |
| Registered by (role, not implementer of Z08/Z10/Z09 evidence) | |
| Public pointer (optional URL) | |
| Immutable digest of this form (hash after freeze) | |

## Matrix shape (ROADMAP minimum)

Acceptance requires a **balanced** external matrix covering at least:

- **≥12** pinned repositories (exact commit/tag at enrollment)
- **4** hosts: Claude Code · Grok Build · Cursor · OpenAI Codex
- **3** package managers: npm · pnpm · yarn

Cell denominator = full Cartesian coverage of the preregistered plan (or an
explicit balanced subsample declared here before clocks start). Threshold:

- **≥5/6 (83.33%)** of the **entire cell denominator** reaches protected green
  without weakening the contract
- Every Adapt outcome is explained (not dropped from the denominator)

## Pin table (copy rows as needed)

| # | Repo (URL) | Consent id | Package manager | Host focus | Pin SHA / tag | Enrolled (UTC) | Notes |
|---|------------|------------|-----------------|------------|---------------|----------------|-------|
| 1 | | | npm / pnpm / yarn | claude / grok / cursor / codex | | | |
| 2 | | | | | | | |
| … | | | | | | | |
| 12+ | | | | | | | |

## Host × package-manager coverage checklist

Mark each required combination as planned (`P`) or explicitly out-of-scope with
reason (`OOS`) **before** run:

| | npm | pnpm | yarn |
|--|-----|------|------|
| Claude | | | |
| Grok | | | |
| Cursor | | | |
| Codex | | | |

## Cell result log (after run — empty at preregistration)

| Cell id | Repo pin | Host | PM | Outcome (`protected-green` / `adapt` / `fail` / `missing`) | Adapt explanation | Evidence pointer |
|---------|----------|------|-----|-------------------------------------------------------------|-------------------|------------------|
| | | | | | | |

## Hard lines

- No invented repos or green cells.
- Weakening `ark.config.json` / baseline to pass a cell counts as **fail**.
- Missing follow-up counts against the denominator (not “skipped success”).
- This form does **not** close Z09 by existing in the mother repo.

# ADR 0001: Rename ArkGate to Structrail before Phase C

- **Status:** Accepted
- **Owner:** Pedro Knigge (`pedroknigge`), repository maintainer
- **Decision date:** 2026-07-11
- **Applies before:** `C01`

## Decision

Adopt **Structrail** as the product name and **`structrail`** as the primary npm/package identity.
Do not stabilize another public API, schema, config filename, MCP resource, or skill under the
ArkGate name.

The rename is a compatibility migration, not an immediate search-and-replace. The repository keeps
shipping its current ArkGate identity until the migration in
[`docs/migrations/arkgate-to-structrail.md`](../migrations/arkgate-to-structrail.md) is complete.
The `arkgate` package and its public names remain deprecated compatibility surfaces for at least the
entire next major version.

## Context

The current name is too close to [Archgate](https://github.com/archgate/cli), an established tool in
the same category. Archgate describes itself as executable architecture rules for humans and AI
agents, publishes the [`archgate`](https://www.npmjs.com/package/archgate) CLI, documents CI
enforcement, and maintains a dedicated [documentation site](https://cli.archgate.dev/). This is a
direct category, channel, spelling, and pronunciation collision—not merely an unrelated use of a
similar word.

ArkGate also has unrelated prior uses, including an existing Japanese web-marketing company at
[ark-gate.com](https://ark-gate.com/) and a medical imaging product named ARKGate. Retaining the
name would require explaining the distinction before explaining the product.

The cost of changing now is material but bounded: the current npm identity was first published on
2026-07-08, three days before this decision. Phase C has not yet stabilized the new schema and core
programmatic API, so this is the last low-cost point to choose a durable identity.

## Point-in-time availability screen

Checks were run on 2026-07-11. HTTP `404` results mean only that the queried package, account, or
domain record was not present at that moment; they are not reservations. Search-engine absence is
not legal clearance.

| Candidate | Package and repository | Domains | Search / basic mark screen | Outcome |
|---|---|---|---|---|
| **ArkGate** | `arkgate` and `pedroknigge/arkgate` are this project | `arkgate.online` is in use; `arkgate.dev` had no RDAP record | Direct collision with Archgate; several unrelated ArkGate businesses/products | Reject |
| **LayerLock** | `layerlock` is an existing TypeScript architecture-validation package | `layerlock.dev` had no RDAP record | Existing Layerlock marks and a direct package-category collision | Reject |
| **ContractRail** | Bare npm name returned `404` | `contractrail.com` is in use | Existing railroad compliance/training business | Reject |
| **LayerWard** | Bare npm name, exact GitHub user, and exact repository-name search returned no owner/result | `.dev` had no RDAP record; `.com` is registered | No exact software or mark result surfaced in the basic screen | Runner-up |
| **Structrail** | Bare npm name, exact GitHub user, and exact repository-name search returned no owner/result | `.com` and `.dev` had no RDAP record | No exact company, software, or mark result surfaced; minor search noise from prose containing “struct RAIL” | Choose |

Reproducible endpoints used for the leading candidates:

- npm: [`structrail`](https://registry.npmjs.org/structrail),
  [`layerward`](https://registry.npmjs.org/layerward), and
  [`archgate`](https://registry.npmjs.org/archgate/latest)
- GitHub: [`structrail` account](https://api.github.com/users/structrail),
  [`layerward` account](https://api.github.com/users/layerward), and exact repository-name searches
  for [`structrail`](https://api.github.com/search/repositories?q=structrail+in:name) and
  [`layerward`](https://api.github.com/search/repositories?q=layerward+in:name)
- RDAP: [`structrail.com`](https://rdap.org/domain/structrail.com),
  [`structrail.dev`](https://rdap.org/domain/structrail.dev),
  [`layerward.com`](https://rdap.org/domain/layerward.com), and
  [`layerward.dev`](https://rdap.org/domain/layerward.dev)
- conflict evidence: [Archgate CLI](https://github.com/archgate/cli),
  [Archgate docs](https://cli.archgate.dev/), and
  [Layerlock trademark owner records](https://trademarks.justia.com/owners/layerlock-llc-6599376/)

The basic trademark screen used exact-name web queries for all five candidates and reviewed the
conflicts that surfaced. A production launch still requires a professional clearance search across
the relevant jurisdictions and classes. The
[USPTO](https://www.uspto.gov/trademarks/search/federal-trademark-searching) explicitly describes an
exact-wording search as only a preliminary “knock-out” search, and
[WIPO](https://www.wipo.int/en/web/global-brand-database) recommends also searching national and
regional registers.

## Why Structrail

1. It avoids the direct Archgate collision.
2. The package, exact GitHub identity, and both useful domains were unclaimed in the point-in-time
   checks, giving it the strongest acquisition bundle of the viable candidates.
3. “Struct” signals code structure and “rail” signals a guardrail without promising a general
   security or policy platform.
4. It can carry the positioning line “architecture guardrails for AI TypeScript” without needing a
   competitor disclaimer.

The main downside is that the coined word is not self-explanatory and exact search can include
documentation text containing “struct RAIL”. Consistent casing, the positioning line, and the
`structrail` package identity are sufficient mitigations.

## Consequences

- Phase C uses `structrail.config.json`, `structrail/*` imports, `structrail://...` MCP resources,
  and `structrail_*` public API/tool names.
- No new stable surface may be introduced with an `Ark`, `ArkGate`, `ark-*`, `ark_*`, `ARK_*`, or
  `ark://` name unless it is explicitly a deprecated compatibility alias.
- The rename must preserve current consumers for at least one major version. Compatibility covers
  npm imports/subpaths, CLI bins, the config filename, environment variables, MCP names, and skills.
- Domains must be reserved and the basic legal screen escalated before the public cutover. If a
  reservation or clearance prerequisite fails, supersede this ADR explicitly; do not silently pick
  the runner-up.
- `S07-M1` blocks `C01`. The current package remains ArkGate until that item passes its migration
  tests and cutover checklist.

## Alternatives rejected

### Retain ArkGate with explicit differentiation

Rejected. A disclaimer cannot solve two architecture-enforcement CLIs named ArkGate/Archgate that
both target AI-agent and CI workflows. The support, search, spoken-word, and package-selection costs
would recur on every adoption.

### Choose LayerWard

Rejected as the runner-up because the `.com` is already registered and the name communicates less
about code structure. It remains only a fallback input to a future superseding ADR, not an automatic
fallback.

# TypeScript support (5.x / 6.x; TS7 corrective status)

ArkGate’s architecture gate (`arkgate-check` / `ark-mcp`) needs a **JavaScript API**
TypeScript package that exposes:

- `ts.sys` (at least `fileExists`)
- `createSourceFile` (AST)
- `resolveModuleName` (module graph)

It does **not** require the Go-native `tsc` binary for the gate. Type-checking
semantics of your app still come from **your** project `typescript` + `tsconfig`.

## Supported versions

| Range | Status |
|-------|--------|
| **TypeScript 5.x** | Fully supported (primary CI) |
| **TypeScript 6.x** | Supported (bridge release before 7) |
| **TypeScript 7.x** | **TS7-only packed-consumer support claim suspended in 3.7.0.** API-compatible project exports work, but dependency deduplication can remove the intended fallback |

> **3.7.0 support correction:** installing the real `arkgate` tarball beside `typescript@7.0.2`
> can deduplicate ArkGate's direct dependency to the same version-only export. Full check then
> exits unavailable as it should, but `--plan --json` can incorrectly report `goal.met: true`
> without an import graph. Do not use plan as the final TS7 gate; run full strict check, or keep an
> API-compatible TypeScript 5/6 package under the project `typescript` name. Phase Z owns the
> packed fallback and explicit analysis-completeness fix:
> [enforcement-truth-at-speed](https://github.com/pedroknigge/arkgate/blob/main/docs/plans/enforcement-truth-at-speed/README.md).

Supported consumer range (also declared as an optional peer for compatibility):

```json
"peerDependencies": {
  "typescript": ">=5.0.0 <8"
}
```

The root `arkgate` package also depends directly on `typescript` (`>=5 <8`) as an intended fallback
host. The CLI still resolves the consumer project's **own** `typescript` first so its
module-resolution semantics win; it accepts the direct package dependency only when that export
exposes the compiler API ArkGate needs. That range does not force a separate compatible copy in
3.7.0; the warning above is the current distribution truth.

## How loading works

1. Prefer `require('typescript')` from the **project** root (when it has `sys` + AST + resolve).  
2. If missing or **not API-compatible** (TS 7.0 version-only export, or incomplete host), attempt
   ArkGate's direct dependency, then bare `import('typescript')`. In 3.7.0 this fallback is not
   guaranteed to be a distinct API-compatible package after package-manager deduplication.
3. If nothing usable is found:  
   - `--plan` prints partial diagnostic data, but in 3.7.0 its `goal.met` value can be falsely green
   - full check exits non-zero with an install hint and is the only valid gate

Debug which TypeScript was used:

```bash
ARK_DEBUG_TS=1 npx arkgate-check --plan
# → [ark-check] TypeScript 5.9.x via arkgate (fallback)
```

## TypeScript 7 notes

TypeScript 7 is the **native (Go) compiler** generation. Important for tools like ArkGate:

- **`require('typescript')` on 7.0.x** exports only `{ version, versionMajorMinor }` — not `sys`, `createSourceFile`, or `resolveModuleName`.  
- Unstable programmatic surfaces live under `typescript/unstable/*` (sync/async API, AST). They are **not** the classic TS 5/6 host ArkGate uses today.
- Stable **programmatic JS API** maturity continues over the 7.x line (Microsoft: full story into **7.1+**).  
- When the project’s TypeScript is not API-compatible, ArkGate attempts to load its **direct JS-API dependency** (currently constrained to `>=5 <8` and checked for the required API). In 3.7.0 package-manager deduplication can collapse that dependency to the same unusable export, so this is an attempted fallback, not a support guarantee.
- Your **tsconfig** must follow TS 6/7 defaults (see below) or `tsc` / resolve can fail independently of ArkGate.

### tsconfig defaults that surprise teams (TS 6 → 7)

Adopt these before or when moving to TS 7:

| Option | TS7 direction |
|--------|----------------|
| `strict` | default `true` |
| `module` | often `esnext` |
| `moduleResolution` | `nodenext` or `bundler` (not `node` / `node10`) |
| `baseUrl` | removed — put paths relative to project root |
| `types` | default `[]` — list globals explicitly, e.g. `["node"]` |
| `rootDir` | default `./` — set `"./src"` when sources live under `src` |
| `target: es5` | unsupported |
| `esModuleInterop: false` | unsupported |

Example consumer-friendly skeleton (also used in `tests/fixtures/ts-consumer`):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "rootDir": "./src",
    "types": ["node"],
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

## Side-by-side TypeScript 6 + 7 (tooling)

If you need **tsc 7** for builds and a **JS API 6** for tools that still expect classic exports:

```json
{
  "scripts": {
    "typecheck:ts7": "node ./node_modules/typescript-7/bin/tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "npm:@typescript/typescript6@^6.0.0",
    "typescript-7": "npm:typescript@^7.0.0"
  }
}
```

- `npx tsc6` — TypeScript 6 CLI (from the alias package)
- `npm run typecheck:ts7` — TypeScript 7 through the explicit alias package path

The npm alias does **not** create a `typescript-7` executable; `npx typescript-7` is invalid. If you
need different TS7 flags, add them after `--` or call
`node ./node_modules/typescript-7/bin/tsc` directly.

ArkGate will prefer the project’s `typescript` package; keep that entry **API-compatible** (5/6, or 7 once `sys` is present). See Microsoft’s TS 7 RC blog for dual-install details.

## CI matrix (this repo)

GitHub Actions job `ts-compat` installs TypeScript **5.9.x**, **6.0.x**, and **7.0.x** into a temp
copy of `tests/fixtures/ts-consumer` and runs the checkout binary:

```bash
node bin/ark-check.mjs --root <fixture> --plan --json --no-cache
```

Locally:

```bash
node scripts/ts-compat-matrix.mjs 5.9.3
node scripts/ts-compat-matrix.mjs 6.0.3
node scripts/ts-compat-matrix.mjs 7.0.2
```

This matrix validates source-checkout behavior, not the installed dependency tree. It is not
release evidence for TS7 until Z02 replaces it with a packed-candidate matrix that runs plan and
full strict check.

## What “compatible” means for ArkGate

| Goal | Status |
|------|--------|
| Gate does not crash on project TS 7 | Yes; packed 3.7.0 may exit unavailable when no distinct compatible host remains |
| Plan/check work with project TS 5/6 | Yes |
| Plan/check work when project has TS 7 + usable `sys` | Yes (uses project) |
| Gate uses native Go typechecker API exclusively | Not required; future if 7.1+ exposes a stable Node API we adopt |
| User tsconfigs with removed options still “just work” | User must migrate tsconfig (TS6/7); Ark reports resolve/parse failures clearly |

## Static-analysis soundness envelope

ArkGate uses the TypeScript compiler API to extract dependency and ambient-capability facts. The
same Kernel implementation feeds the library, CLI, MCP write gate, and AICodeGate bundle.

Dependency forms enforced when their module specifier is a string literal:

- ESM `import`, `import type`, side-effect imports, and `export ... from` / `export type ... from`;
- TypeScript `import x = require("...")`;
- unshadowed CommonJS `require("...")`;
- dynamic `import("...")`.

Non-literal `import(expr)` and unshadowed `require(expr)` are reported as unresolved. They are
advisory by default, fail with `--strict-config`, and may be reviewed at file granularity through
`dynamicImportAllowlist`. A locally declared `require` function is not treated as CommonJS.

Forbidden capabilities are resolved with single-file TypeScript symbols. Local variables,
parameters, and imports shadow ambient names; aliases such as `const Clock = Date`, explicit
`globalThis`, static bracket access, and object destructuring remain detectable. Resolution of
module paths then uses the nearest tsconfig/jsconfig compiler options, including path aliases,
project-local packages, workspaces, and symlinked workspace entries.

`forbiddenGlobals: ["process"]` also owns the exact runtime module spellings `process` and
`node:process`. They report `FORBIDDEN_GLOBAL` with import-form evidence across the CLI, pure IR,
atomic preflight, MCP/AICodeGate, and ESLint. This is an exact dual, not a process-capability wall:
`node:process/subpath`, `child_process`, and `node:child_process` do not match. `import type` and
`export type` declarations are erased and do not produce this finding on any path. The
symbol-aware CLI/hook/AICodeGate path and ESLint also recognize all-type named lists; the
compiler-free pure IR retains its documented conservative treatment of those lists as value
imports.

ArkGate intentionally does not claim soundness for runtime-generated module names, `eval`, custom
loader functions, proxy-based globals, dynamically computed property keys, or aliases mutated
after declaration. Those constructs must remain absent from governed pure layers or be handled by
an explicit project policy. Every newly discovered bypass is minimized into the adversarial corpus.

## Future (7.1+ programmatic API)

When Microsoft ships a stable Node API for native TypeScript 7.1+:

1. Extend `usableTypescript` for the new export shape.  
2. Keep the multi-version matrix green.  
3. Optionally prefer project TS 7 for resolution without fallback.

Until then, use an API-compatible project `typescript` package or treat full strict-check
unavailability as a hard stop. The packed fallback + matrix becomes the compatibility story only
after Z02 proves that installed path.

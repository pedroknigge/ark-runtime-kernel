# Independent reviewer manifesto (Z09)

**Status: manifesto template + open decision. Not a signed close.**

Residual `RB-11` requires a reviewer who **did not implement** `Z08` / `Z10` / `Z09`
to reproduce the initial packed candidate and sign an immutable longitudinal
manifest. A boolean field such as `independent: true` is **not** sufficient.

## Reviewer eligibility

The reviewer:

1. Did not author the Z08 causal ledger, Z10 hardness corpus, or Z09 field program
   under review.
2. Can reproduce the packed candidate from published artifacts / pins.
3. Signs an immutable longitudinal manifest containing, **per project**:
   - initial digest
   - repository SHA
   - required-status evidence
   - every upgrade digest/date
   - final state
4. Records method and tool versions so a third party can re-check the signature
   path.

## Open decision — signed identity mechanism

**Decision status: OPEN (not chosen).**  
Pick one mechanism **before** preregistration freezes; do not mix ad-hoc signatures.

| Option | Pros | Cons | Candidate? |
|--------|------|------|------------|
| **A. Signed git tags + GitHub identity** on the evidence repo | Familiar; audit trail in git | Depends on forge account trust | Under consideration |
| **B. Sigstore / cosign keyless OIDC** on evidence bundle | Public verifiability | Tooling overhead for reviewers | Under consideration |
| **C. GPG-signed detached manifest** committed with evidence | Offline verifiable | Key distribution friction | Under consideration |
| **D. Maintainer-attested third-party letter** only | Simple | Weak cryptographic binding — **insufficient alone** | Rejected as sole proof |

**Chosen mechanism:** _none yet — leave blank until preregistered._  
**Decision note date:** _pending_  
**Decision owner:** library maintainer + independent reviewer (not the implementer).

Until a mechanism is chosen and preregistered, Z09 stays **parked** and residual
`RB-11` stays **open**. Shipping product minors (including Beautiful Path) does
not imply independent close.

## Manifest skeleton (unsigned)

```text
manifestVersion: 1
claim: Z09-independent-close
reviewer: <name-or-handle>
eligibility: did-not-implement-Z08-Z10-Z09
identityMechanism: <A|B|C — chosen>
candidate:
  package: arkgate@<version>
  sourceSha: <sha>
  packedDigest: <digest>
projects:
  - id: <project-id>
    initialDigest: <digest>
    repositorySha: <sha>
    requiredStatusEvidence: <url-or-path>
    upgrades: []
    finalState: <digest>
signature:
  method: <pending>
  value: <pending>
```

## Hard lines

- Historical beta-exit “declaration checks” are not independent identity proof.
- Do not close C-028 residual or RB-11 with an unsigned manifesto in this tree.
- Prefer fail-closed: missing signature = not closed.

# Security Policy

**ArkGate** (`arkgate`) runs on developer machines, in CI, and in agent tooling paths, so
security reports are treated as high priority.

## Supported Versions

Security fixes target the latest published minor version. If a fix needs a new release,
the changelog will call out the affected versions and the patched version.

## Reporting A Vulnerability

Please do not open a public issue for a suspected vulnerability.

Preferred path: use GitHub's private vulnerability reporting for this repository. Include:

- affected version or commit
- reproduction steps
- expected impact
- whether the issue affects `arkgate-check` / `ark-check`, `arkgate-mcp` / `ark-mcp`,
  generated agent gates, the GitHub Action, or the optional runtime kernel

If private vulnerability reporting is unavailable, open a minimal public issue asking for
a private security contact without including exploit details.

## Release Verification

ArkGate releases are GitHub-first:

1. Changes land on GitHub and must pass CI plus the dedicated security workflow.
2. A GitHub Release is created from an annotated `vX.Y.Z` tag. Tag verification is
   **fail-closed** by default for unsigned tags unless
   `ARK_ALLOW_UNSIGNED_RELEASE_TAG=true` is set (CI publish sets this until GPG signing is
   wired). Signed tags can later require `ARK_REQUIRE_SIGNED_RELEASE_TAG=true`.
3. The manual `Publish npm` workflow verifies the tag, requires the GitHub Release to
   exist, reruns release checks, publishes npm with provenance, and uploads a SHA-256
   checksum for the npm tarball to the GitHub Release.

Consumers in sensitive environments should still pin exact npm versions and GitHub
Action SHAs/tags, then verify npm provenance and the release checksum before upgrading.

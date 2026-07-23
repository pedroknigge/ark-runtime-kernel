# Z09 cohort retention checklist (D30 / D90)

**Status: template only. Cohort not enrolled in this repository.**  
ROADMAP thresholds (do not lower them in this file):

- Cohort size: **≥8** consented adopter projects
- **D30:** ≥3/4 of the **full** cohort retain required Ark enforcement
- **D90:** ≥5/8 of the **full** cohort retain required Ark enforcement
- Missing follow-up, disabled enforcement, downgrade, or unrecorded upgrade →
  **not retained**
- Upgrade does **not** reset the clock; retention counts the initial candidate or
  a recorded forward corrective descendant that passed the same relevant gates

## Consent record (per project)

| Field | Value |
|-------|--------|
| Project id | |
| Consent date (UTC) | |
| Contact / owner (redact in public mirrors if needed) | |
| Initial package version | |
| Initial tree / config digest | |
| Initial repository SHA | |
| Required-status evidence (CI name + link) | |
| Enrolled hosts | |
| Package manager | |

## Timeline

| Milestone | Clock start (UTC) | Due (UTC) | Outcome | Evidence |
|-----------|-------------------|-----------|---------|----------|
| Enroll (D0) | | | | |
| D30 | | | retained / not retained / missing | |
| D90 | | | retained / not retained / missing | |

## Retention definition (check all that apply at D30 and D90)

A project is **retained** only if **all** are true:

- [ ] `arkgate` still installed at a recorded version (or recorded forward corrective)
- [ ] Contract still present; no silent weaken vs enrolled policy hash without documented ack
- [ ] Required CI / merge status for architecture check still required on the default path
- [ ] Write-path profile still honest for the enrolled host (hard or advisory labeled correctly)
- [ ] Follow-up completed within the window (missing = not retained)

## Cohort rollup (fill only with real rows)

| Project id | D0 digest | D30 | D90 | Notes |
|------------|-----------|-----|-----|-------|
| | | | | |

**Counts (never invent):**

| Metric | Value |
|--------|-------|
| Enrolled (N) | _pending enrollment_ |
| D30 retained | _n/a until clocks run_ |
| D90 retained | _n/a until clocks run_ |
| Threshold met? | **No — not closed** |

## Hard lines

- Do not mark this checklist “passed” because the template exists.
- Do not count internal mother-repo dogfood as an external adopter without consent and pin.
- Public claims of retained adoption wait for residual `RB-11` close under Z09.

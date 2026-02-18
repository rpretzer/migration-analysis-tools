# Quality Gate Specifications

**Version:** 1.0
**Status:** Approved
**Audience:** Quality Gate Agent, Tech leads, Calibration reviewers

---

## Overview

Quality gates are automated verification checks that run at the end of specific pipeline stages. They determine whether a story's artifacts are correct and complete before the story advances. Gates do not pass or fail the story — they pass or fail specific checks. The aggregate result of all checks determines the gate verdict.

There are five gate points in the pipeline:

| Gate | Stage | Type | Responsible |
|------|-------|------|-------------|
| Gate 1 | After Stage 1 (INTAKE) | Human | PM |
| Gate 2a | After Stage 2 (COMPILATION) | Automated | Validation Server |
| Gate 2b | During Stage 2 (COMPILATION) | Automated routing | Spec Compiler |
| Gate 3 | After Stage 3 (IMPLEMENTATION) | Automated | CI + Pipeline Server |
| Gate 4 | After Stage 4 (TESTING) | Automated | Test Agent + CI |
| Gate 5 | After Stage 5 (QUALITY GATE) | Automated with human escalation | Quality Gate Agent |

This document specifies each gate in detail. Gate 1 is a human process; it is defined here for completeness but is not automated.

---

## Gate Verdicts

Every automated gate produces one of three verdicts:

| Verdict | Meaning | Action |
|---------|---------|--------|
| `GATE_PASS` | All checks passed | Story advances to the next stage automatically |
| `GATE_FAIL` | One or more checks failed | Story is returned to the failing stage; agent retries with failure context |
| `GATE_REVIEW_NEEDED` | All checks passed; one or more items require human judgment | Story advances to Stage 6; human inspects flagged items only |

`GATE_REVIEW_NEEDED` is only available at Gate 5. Gates 2a, 3, and 4 produce only `GATE_PASS` or `GATE_FAIL`.

---

## Gate 1 — PM Intent Confirmation (Human)

**Stage:** After Stage 1 (INTAKE)
**Reviewer:** PM/PO

**What the PM reviews:**
The PM reads `pipeline/intake/stories-draft.md` and confirms that each story accurately represents their intent. This is a narrative check. The PM is not evaluating technical quality, Gherkin syntax, or architecture — only whether the stories reflect what they asked for.

**Pass condition:** PM logs a confirmation action. The Coach records a `human_action` event with `action: "pm_approval"`.

**Fail condition:** PM identifies one or more stories that are incorrect, incomplete, or missing. The Coach revises and the PM re-reviews.

**There is no automated check at Gate 1.** It is a required human step before Stage 2 begins.

---

## Gate 2a — Spec Schema Validation (Automated)

**Stage:** After Stage 2 (COMPILATION)
**Tool:** `validate_spec(path)` on the Validation Server

### Checks

| Check | Passes when | Fails when |
|-------|-------------|------------|
| All required sections present | spec.md contains every section defined in compiled-spec.schema.md | Any required section is absent or contains only a placeholder value |
| File targets resolve | Every file in "In Scope" exists in the current-state model or is marked `create` with a valid parent directory | A file path does not resolve and is not marked `create` |
| At least one Gherkin AC per file target | Every file in "In Scope" has at least one numbered Gherkin scenario | A file target has no corresponding AC |
| NFRs are numeric | Every NFR subsection contains numeric thresholds | Any NFR subsection contains only qualitative statements |
| Feature flag section complete | Feature Flag section is fully populated or explicitly marked "N/A" with justification | Section is absent, empty, or partially filled |
| CLEAN layer assigned | Every file target has a CLEAN layer assignment | Any file target is missing its layer assignment |
| PM intent hash present | `pm_intent_hash` field is recorded | Field is absent |

**Failure action:** Validation Server returns a structured error report identifying which checks failed and which spec files failed. The Spec Compiler receives the report and retries. There is no retry limit at Gate 2a — the Spec Compiler retries until the spec is valid or escalates with a documented blocker.

---

## Gate 2b — Ambiguity Routing (Automated)

**Stage:** During Stage 2 (COMPILATION)
**Trigger:** Spec Compiler produces `questions.md`

**What triggers a questions.md:**
The Spec Compiler produces `questions.md` only when it cannot resolve an ambiguity by consulting the current-state model. It must not produce `questions.md` for questions it can answer by reading the code. It must not guess.

**Check:**

| Condition | Action |
|-----------|--------|
| questions.md not present | Stage 2 continues normally |
| questions.md present | Story is set to `BLOCKED_ON_PM` status; Coach presents questions to PM |

**questions.md format:**

```
Story ID: {story-id}
Questions:

Q1: [Specific question stated precisely enough for the PM to answer without technical knowledge]
    Impact if unanswered: [What the Spec Compiler will be unable to produce without this answer]

Q2: ...
```

The PM's answers are recorded in `pipeline/specs/{story-id}/questions.md` by the Coach before the Spec Compiler is re-run. The questions.md file is not deleted — it becomes part of the audit trail.

---

## Gate 3 — Implementation Integrity (Automated)

**Stage:** After Stage 3 (IMPLEMENTATION)
**Tools:** CI build system + Pipeline Server

### Checks

| Check Name | Passes when | Fails when |
|------------|-------------|------------|
| Target files modified | Every file listed in spec's "In Scope" table appears in the branch diff | Any in-scope file is absent from the diff |
| No unspecified changes | The branch diff contains only files listed in "In Scope" | The diff contains files not listed in "In Scope" |
| Build passes | CI build on `copilot/{story-id}` branch reports success | CI build fails |
| assumptions.md risk level | assumptions.md is empty, or all entries are risk level Low or Medium | Any assumption is rated High risk |

**Failure actions by check:**

| Check | Failure action |
|-------|---------------|
| Target files not modified | Coding Agent retries; receives list of missing targets |
| Unspecified changes | Coding Agent reverts unspecified files and retries |
| Build fails | Coding Agent receives build log and retries |
| High-risk assumption | Story escalated to tech lead before Coding Agent retries |

**Retry limit:** Maximum 2 retries per check. After 2 failures on the same check, story is escalated to tech lead.

---

## Gate 4 — Test Results and Coverage (Automated)

**Stage:** After Stage 4 (TESTING)
**Tools:** CI test runner + Test Agent

### Checks

| Check Name | Passes when | Fails when |
|------------|-------------|------------|
| All tests pass | Zero failing tests in results.md | Any test failure reported |
| Coverage target met | Module coverage >= threshold specified in test-spec.md; coverage delta is non-negative | Coverage falls below threshold or delta is negative |
| All ACs covered | Every Gherkin AC from the spec has at least one passing test mapped to it | Any AC has no passing test |
| Flag-on state tested | At least one passing test exercises the flag-enabled code path | No flag-on test present (when spec defines a feature flag) |
| Flag-off state tested | At least one passing test exercises the flag-disabled fallback path | No flag-off test present (when spec defines a feature flag) |
| Accessibility tests present | For UI-bearing stories: at least one accessibility test per UI component introduced | UI story has no accessibility tests |

**Coverage thresholds by module type:**

| Module type | Minimum line coverage |
|-------------|-----------------------|
| Domain / Use Case layer | 90% |
| Data layer (repositories, API clients) | 80% |
| Presentation layer (ViewModels, state holders) | 75% |
| Framework layer (DRM, push, biometrics) | 60% |
| BFF endpoint handlers | 80% |
| KMP shared modules | 85% |

Thresholds in test-spec.md override these defaults for specific stories.

**Failure actions by check:**

| Check | Failure action |
|-------|---------------|
| Tests fail | Test Agent retries; receives failure output |
| Coverage below threshold | Test Agent adds additional tests; retries |
| AC not covered | Test Agent writes tests for uncovered AC; retries |
| Flag state not tested | Test Agent adds flag state tests; retries |
| No accessibility tests | Test Agent adds accessibility tests for each UI component; retries |

**Retry limit:** Maximum 2 retries. After 2 failures, story is escalated to tech lead.

---

## Gate 5 — Quality Gate (Automated with Human Escalation)

**Stage:** After Stage 5 (QUALITY GATE)
**Agent:** Quality Gate Agent (uses Opus model)

The Quality Gate Agent runs eight checks. All eight must be present in `report.md` in the exact order listed below. The check order is fixed because downstream automation references checks by row index.

### Check Definitions

#### Check 1: Spec Completeness

**Passes when:** The spec file contains all required sections per compiled-spec.schema.md. No section is missing or contains only a placeholder value.

**Fails when:** Any required section is absent or has placeholder content such as "TBD" or "TODO."

**Source artifact:** `pipeline/specs/{story-id}/spec.md`

---

#### Check 2: Implementation Coverage

**Passes when:** Every file listed in the spec's "In Scope" table has a corresponding entry in `changes.md` with status "complete." No requirement is listed as "partial" or "blocked" without a corresponding entry in `assumptions.md`.

**Fails when:** One or more in-scope requirements are not reflected in `changes.md`, or a "partial" status has no documented reason.

**Source artifact:** `pipeline/impl/{story-id}/changes.md`

---

#### Check 3: Test Coverage

**Passes when:** All of the following are true:
- Every Gherkin AC in the spec has status "covered" in the Test Report's AC Coverage Matrix
- The coverage delta in `coverage.md` is non-negative
- The Test Report verdict in `verdict.md` is PASS

**Fails when:** Any AC is uncovered, coverage decreases, or the Test Report verdict is not PASS.

**Source artifacts:** `pipeline/test/{story-id}/results.md`, `pipeline/test/{story-id}/coverage.md`, `pipeline/test/{story-id}/verdict.md`

---

#### Check 4: Observability Compliance

**Passes when:** The `events.jsonl` file contains, at minimum for this story:
- One `agent_start` event per agent that worked on the story
- One `artifact_write` event per artifact file produced
- One `gate_verdict` event matching the verdict in this report

**Fails when:** Any required event type is absent from the event log for this story.

**Source artifact:** `pipeline/observability/events.jsonl` filtered to `story_id == {story-id}`

---

#### Check 5: Accessibility Compliance

**Passes when:** Either:
- All accessibility check rows in `results.md` show "passed," or
- The story contains no UI changes (confirmed by absence of Presentation-layer files in the "In Scope" table), in which case this check is PASS with justification "Non-UI story."

**Fails when:** Any accessibility check row shows "failed" for a UI-bearing story.

**WCAG criteria verified for UI stories:**

| Criterion | ID | Automated check |
|-----------|----|----------------|
| Contrast minimum | 1.4.3 | Color pair contrast ratio >= 4.5:1 |
| Text resize | 1.4.4 | Text elements use sp units, not dp or px |
| Non-text contrast | 1.4.11 | UI component outlines >= 3:1 against adjacent colors |
| Keyboard (D-pad) | 2.1.1 | All interactive elements reachable via D-pad on TV targets |
| Focus order | 2.4.3 | Focus traversal follows logical reading order |
| Labels or instructions | 3.3.2 | All form inputs have associated labels |
| Name, Role, Value | 4.1.2 | All interactive components have content descriptions |
| Tap target size | — (platform NFR) | All tap targets >= 48x48 dp (mobile); >= 80x80 dp (TV) |

For TV/Leanback targets, focus ring visibility (4px solid) is an additional required check.

**Source artifact:** `pipeline/test/{story-id}/results.md` (accessibility section)

---

#### Check 6: Design Token Compliance

**Passes when:** The "Missing Tokens Flagged" section of `changes.md` is empty, or every flagged item has a follow-up ticket reference.

**Fails when:** One or more hardcoded color, spacing, or typography values are present in the implementation without a follow-up ticket.

**What is checked:**
- No hardcoded hex color values in UI code
- No hardcoded pixel or dp spacing values outside of the design system's defined scale
- Typography uses sp units and references named text styles from the design system

**Source artifact:** `pipeline/impl/{story-id}/changes.md`

---

#### Check 7: Feature Flag Compliance

**Passes when:** Either:
- The spec defined a feature flag AND the Feature Flag Implementation section of `changes.md` is populated AND both flag-on and flag-off states have passing tests in `results.md`, or
- The spec marked the Feature Flag section "N/A" AND no feature-flag SDK calls appear in the implementation diff

**Fails when:**
- The spec defined a flag but the implementation contains no flag SDK call
- The spec defined a flag and only one flag state has a passing test
- Migration code ships without a feature flag (any change that modifies existing user-visible behavior with no flag is a Gate 5 FAIL)

**Verification method:** The Integration Server's `validate_flag_usage(story_id)` tool confirms the flag key exists in LaunchDarkly and that the SDK call in the code uses the correct key.

**Source artifacts:** `pipeline/specs/{story-id}/spec.md` (flag definition), `pipeline/impl/{story-id}/changes.md`, `pipeline/test/{story-id}/results.md`

---

#### Check 8: Traceability

**Passes when:** All of the following are true:
- The story ID in the spec matches the story ID in `changes.md`, `results.md`, and the gate report
- All file references in `changes.md` exist in the repository at the time of gate evaluation
- All AC IDs referenced in `results.md` (e.g., "AC-1 covered") exist in the spec's Gherkin section
- The `pm_intent_hash` in the spec matches the hash of the current story in `stories-draft.md`

**Fails when:** Any ID, file reference, or AC reference is mismatched or unresolvable.

**Source artifacts:** spec.md, changes.md, results.md, gate report, stories-draft.md

---

### Gate 5 Verdict Logic

The Quality Gate Agent applies these rules mechanically. It must not override them.

```
IF all 8 checks == PASS AND no GATE_REVIEW_NEEDED triggers:
    Verdict = GATE_PASS

IF all 8 checks == PASS AND any GATE_REVIEW_NEEDED trigger applies:
    Verdict = GATE_REVIEW_NEEDED

IF any check == FAIL:
    Verdict = GATE_FAIL
```

**GATE_REVIEW_NEEDED triggers** (all eight checks must be PASS for this verdict to apply):

| Trigger | Why automation is insufficient |
|---------|-------------------------------|
| assumptions.md contains one or more Medium-risk assumptions | Business domain knowledge required to assess whether the assumption is correct |
| A blocked item has a resolution path that requires a business decision | Automation cannot evaluate business priority |
| Spec and implementation diverge in a way that is technically valid but may not match intent | Requires reading PM intent, not just comparing artifacts |
| A UI component passed automated accessibility tools but has interaction complexity warranting manual VoiceOver/TalkBack verification | Screen readers handle complex interactions inconsistently across OS versions |

When the verdict is `GATE_REVIEW_NEEDED`, the "Human Review Required" section of `report.md` must contain at least one item specifying: the exact location (file path and line range), the concern, and why automation was insufficient.

---

## BFF Contract Compliance

For stories with sub-story decomposition (BFF + client), the Quality Gate runs two additional contract checks:

| Check | Passes when | Fails when |
|-------|-------------|------------|
| BFF response shape | The BFF endpoint returns a JSON structure that matches the schema defined in `{story-id}-bff` spec's "Response Shape" section | Response is missing fields, has wrong types, or includes undocumented fields |
| Client consumption | The client code reads every field that the BFF contract defines as required | Client ignores a required field from the BFF response |

These checks are run by the Test Agent as part of contract testing. The results appear in the Test Report and are evaluated by the Quality Gate Agent during Check 3 (Test Coverage) and Check 8 (Traceability).

---

## Per-Check Return Routing

When Gate 5 verdict is GATE_FAIL, the story is routed to the responsible stage:

| Failing check | Returned to |
|---------------|------------|
| Spec completeness | Stage 2 (Spec Compiler) |
| Implementation coverage | Stage 3 (Coding Agent) |
| Test coverage | Stage 4 (Test Agent) |
| Observability compliance | Stage that produced the artifact with missing events |
| Accessibility compliance | Stage 4 (Test Agent) |
| Design token compliance | Stage 3 (Coding Agent) |
| Feature flag compliance (implementation) | Stage 3 (Coding Agent) |
| Feature flag compliance (testing) | Stage 4 (Test Agent) |
| Traceability | Stage that produced the mismatched reference |

After two GATE_FAIL verdicts for the same story from the same returning stage, the story is escalated to the tech lead. The Retry History section of `report.md` must document this.

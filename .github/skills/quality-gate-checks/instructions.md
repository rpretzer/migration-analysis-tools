# Skill: Quality Gate Checks

## Purpose

Quality gates are automated verification checks that run at the end of specific pipeline stages. They determine whether a story's artifacts are correct and complete before the story advances. This skill defines each gate, its checks, verdicts, coverage thresholds, and BFF contract checks.

---

## Gate overview

| Gate | Stage | Type | Responsible |
|------|-------|------|-------------|
| Gate 1 | After Stage 1 (INTAKE) | Human | PM |
| Gate 2a | After Stage 2 (COMPILATION) | Automated | Validation Server |
| Gate 2b | During Stage 2 (COMPILATION) | Automated routing | Spec Compiler |
| Gate 3 | After Stage 3 (IMPLEMENTATION) | Automated | CI + Pipeline Server |
| Gate 4 | After Stage 4 (TESTING) | Automated | Test Agent + CI |
| Gate 5 | After Stage 5 (QUALITY GATE) | Automated with human escalation | Quality Gate Agent |

---

## Gate verdicts

| Verdict | Meaning | Action |
|---------|---------|--------|
| `GATE_PASS` | All checks passed | Story advances to the next stage automatically |
| `GATE_FAIL` | One or more checks failed | Story is returned to the failing stage; agent retries with failure context |
| `GATE_REVIEW_NEEDED` | All checks passed; one or more items require human judgment | Story advances to Stage 6; human inspects flagged items only |

`GATE_REVIEW_NEEDED` is only available at Gate 5. Gates 2a, 3, and 4 produce only `GATE_PASS` or `GATE_FAIL`.

After two GATE_FAIL verdicts for the same story from the same returning stage, the story is escalated to the tech lead. The Retry History section of `report.md` must document this.

---

## Gate 1 — PM Intent Confirmation (Human)

The PM reads `pipeline/intake/stories-draft.md` and confirms each story accurately represents their intent. This is a narrative check only — the PM is not evaluating technical quality, Gherkin syntax, or architecture.

Pass condition: PM logs a confirmation. The Coach records a `human_action` event with `action: "pm_approval"`.

Fail condition: PM identifies stories that are incorrect, incomplete, or missing. The Coach revises and the PM re-reviews.

There is no automated check at Gate 1.

---

## Gate 2a — Spec Schema Validation (Automated)

Runs after Stage 2 (COMPILATION) using `validate_spec(path)` on the Validation Server.

| Check | Passes when | Fails when |
|-------|-------------|------------|
| All required sections present | spec.md contains every section defined in compiled-spec.schema.md | Any required section is absent or contains only a placeholder |
| File targets resolve | Every file in "In Scope" exists or is marked `create` with a valid parent directory | A file path does not resolve and is not marked `create` |
| At least one Gherkin AC per file target | Every file in "In Scope" has at least one numbered Gherkin scenario | A file target has no corresponding AC |
| NFRs are numeric | Every NFR subsection contains numeric thresholds | Any NFR subsection contains only qualitative statements |
| Feature flag section complete | Feature Flag section is fully populated or explicitly marked "N/A" with justification | Section is absent, empty, or partially filled |
| CLEAN layer assigned | Every file target has a CLEAN layer assignment | Any file target is missing its layer assignment |
| PM intent hash present | `pm_intent_hash` field is recorded | Field is absent |

Failure action: the Validation Server returns a structured error report. The Spec Compiler retries until the spec is valid. There is no retry limit at Gate 2a.

---

## Gate 2b — Ambiguity Routing (Automated)

Triggered during Stage 2 when the Spec Compiler produces `questions.md`.

| Condition | Action |
|-----------|--------|
| questions.md not present | Stage 2 continues normally |
| questions.md present | Story is set to `BLOCKED_ON_PM` status; Coach presents questions to PM |

The questions.md format:
```
Story ID: {story-id}
Questions:

Q1: [Specific question the PM can answer without technical knowledge]
    Impact if unanswered: [What the Spec Compiler cannot produce without this answer]
```

The Spec Compiler must not produce questions.md for questions it can answer by reading the code. It must not guess. questions.md becomes part of the permanent audit trail.

---

## Gate 3 — Implementation Integrity (Automated)

Runs after Stage 3 (IMPLEMENTATION) using CI and the Pipeline Server.

| Check Name | Passes when | Fails when |
|------------|-------------|------------|
| Target files modified | Every file in spec "In Scope" appears in the branch diff | Any in-scope file is absent from the diff |
| No unspecified changes | The branch diff contains only files listed in "In Scope" | The diff contains files not listed in "In Scope" |
| Build passes | CI build on `copilot/{story-id}` branch reports success | CI build fails |
| assumptions.md risk level | assumptions.md is empty, or all entries are risk level Low or Medium | Any assumption is rated High risk |

Failure actions by check:

| Check | Failure action |
|-------|---------------|
| Target files not modified | Coding Agent retries; receives list of missing targets |
| Unspecified changes | Coding Agent reverts unspecified files and retries |
| Build fails | Coding Agent receives build log and retries |
| High-risk assumption | Story escalated to tech lead before Coding Agent retries |

Retry limit: maximum 2 retries per check. After 2 failures on the same check, escalate to tech lead.

---

## Gate 4 — Test Results and Coverage (Automated)

Runs after Stage 4 (TESTING) using CI and the Test Agent.

| Check Name | Passes when | Fails when |
|------------|-------------|------------|
| All tests pass | Zero failing tests in results.md | Any test failure reported |
| Coverage target met | Module coverage >= threshold in test-spec.md; coverage delta is non-negative | Coverage falls below threshold or delta is negative |
| All ACs covered | Every Gherkin AC from the spec has at least one passing test mapped to it | Any AC has no passing test |
| Flag-on state tested | At least one passing test exercises the flag-enabled code path | No flag-on test present (when spec defines a feature flag) |
| Flag-off state tested | At least one passing test exercises the flag-disabled fallback path | No flag-off test present (when spec defines a feature flag) |
| Accessibility tests present | For UI-bearing stories: at least one accessibility test per UI component introduced | UI story has no accessibility tests |

### Coverage thresholds by module type

| Module type | Minimum line coverage |
|-------------|----------------------|
| Domain / Use Case layer | 90% |
| Data layer (repositories, API clients) | 80% |
| Presentation layer (ViewModels, state holders) | 75% |
| Framework layer (DRM, push, biometrics) | 60% |
| BFF endpoint handlers | 80% |
| KMP shared modules | 85% |

Thresholds defined in test-spec.md override these defaults for specific stories.

Failure actions:

| Check | Failure action |
|-------|---------------|
| Tests fail | Test Agent retries; receives failure output |
| Coverage below threshold | Test Agent adds additional tests; retries |
| AC not covered | Test Agent writes tests for uncovered AC; retries |
| Flag state not tested | Test Agent adds flag state tests; retries |
| No accessibility tests | Test Agent adds accessibility tests for each UI component; retries |

Retry limit: maximum 2 retries. After 2 failures, escalate to tech lead.

---

## Gate 5 — Quality Gate (Automated with Human Escalation)

The Quality Gate Agent runs eight checks. All eight must appear in `report.md` in the exact order listed below. The check order is fixed.

### Check 1: Spec Completeness

Source: `pipeline/specs/{story-id}/spec.md`

Passes when: the spec contains all required sections. No section is missing or has placeholder content such as "TBD" or "TODO."

Fails when: any required section is absent or has placeholder content.

### Check 2: Implementation Coverage

Source: `pipeline/impl/{story-id}/changes.md`

Passes when: every file in the spec's "In Scope" table has a corresponding entry in changes.md with status "complete." No requirement is listed as "partial" or "blocked" without a corresponding entry in assumptions.md.

Fails when: one or more in-scope requirements are not reflected in changes.md, or a "partial" status has no documented reason.

### Check 3: Test Coverage

Sources: `pipeline/test/{story-id}/results.md`, `coverage.md`, `verdict.md`

Passes when:
- Every Gherkin AC in the spec has status "covered" in the Test Report's AC Coverage Matrix.
- The coverage delta in coverage.md is non-negative.
- The Test Report verdict in verdict.md is PASS.

Fails when: any AC is uncovered, coverage decreases, or the Test Report verdict is not PASS.

### Check 4: Observability Compliance

Source: `pipeline/observability/events.jsonl` filtered to `story_id == {story-id}`

Passes when the events.jsonl file contains, at minimum:
- One `agent_start` event per agent that worked on the story.
- One `artifact_write` event per artifact file produced.
- One `gate_verdict` event matching the verdict in the report.

Fails when any required event type is absent.

### Check 5: Accessibility Compliance

Source: `pipeline/test/{story-id}/results.md` (accessibility section)

Passes when:
- All accessibility check rows show "passed," or
- The story contains no UI changes (confirmed by absence of Presentation-layer files in "In Scope"), and this check is PASS with justification "Non-UI story."

Fails when: any accessibility check row shows "failed" for a UI-bearing story.

WCAG criteria verified automatically for UI stories:

| Criterion | ID | Automated check |
|-----------|----|----------------|
| Contrast minimum | 1.4.3 | Color pair contrast ratio >= 4.5:1 |
| Text resize | 1.4.4 | Text elements use sp units, not dp or px |
| Non-text contrast | 1.4.11 | UI component outlines >= 3:1 against adjacent colors |
| Keyboard (D-pad) | 2.1.1 | All interactive elements reachable via D-pad on TV targets |
| Focus order | 2.4.3 | Focus traversal follows logical reading order |
| Labels or instructions | 3.3.2 | All form inputs have associated labels |
| Name, Role, Value | 4.1.2 | All interactive components have content descriptions |
| Tap target size | Platform NFR | Tap targets >= 48x48 dp (mobile); >= 80x80 dp (TV) |

For TV/Leanback targets, focus ring visibility (4px solid) is an additional required check.

### Check 6: Design Token Compliance

Source: `pipeline/impl/{story-id}/changes.md`

Passes when: the "Missing Tokens Flagged" section of changes.md is empty, or every flagged item has a follow-up ticket reference.

Fails when: one or more hardcoded color, spacing, or typography values are present in the implementation without a follow-up ticket.

What is checked:
- No hardcoded hex color values in UI code.
- No hardcoded pixel or dp spacing values outside of the design system's defined scale.
- Typography uses sp units and references named text styles from the design system.

### Check 7: Feature Flag Compliance

Sources: `pipeline/specs/{story-id}/spec.md`, `pipeline/impl/{story-id}/changes.md`, `pipeline/test/{story-id}/results.md`

Passes when either:
- The spec defined a feature flag AND the Feature Flag Implementation section of changes.md is populated AND both flag-on and flag-off states have passing tests.
- The spec marked the Feature Flag section "N/A" AND no feature-flag SDK calls appear in the implementation diff.

Fails when:
- The spec defined a flag but the implementation contains no flag SDK call.
- The spec defined a flag and only one flag state has a passing test.
- Migration code ships without a feature flag (any change that modifies existing user-visible behavior with no flag is a GATE_FAIL).

Verification: the Integration Server's `validate_flag_usage(story_id)` tool confirms the flag key exists in LaunchDarkly and the SDK call uses the correct key.

### Check 8: Traceability

Sources: spec.md, changes.md, results.md, gate report, stories-draft.md

Passes when all of the following are true:
- The story ID in the spec matches the story ID in changes.md, results.md, and the gate report.
- All file references in changes.md exist in the repository at the time of gate evaluation.
- All AC IDs referenced in results.md exist in the spec's Gherkin section.
- The `pm_intent_hash` in the spec matches the hash of the current story in stories-draft.md.

Fails when: any ID, file reference, or AC reference is mismatched or unresolvable.

---

## Gate 5 verdict logic

```
IF all 8 checks == PASS AND no GATE_REVIEW_NEEDED triggers:
    Verdict = GATE_PASS

IF all 8 checks == PASS AND any GATE_REVIEW_NEEDED trigger applies:
    Verdict = GATE_REVIEW_NEEDED

IF any check == FAIL:
    Verdict = GATE_FAIL
```

GATE_REVIEW_NEEDED triggers (all eight checks must be PASS for this verdict):

| Trigger | Why automation is insufficient |
|---------|-------------------------------|
| assumptions.md contains Medium-risk assumptions | Business domain knowledge required to assess correctness |
| A blocked item requires a business decision for its resolution path | Automation cannot evaluate business priority |
| Spec and implementation diverge in a technically valid but potentially unintentional way | Requires reading PM intent, not just comparing artifacts |
| A UI component passed automated accessibility tools but has interaction complexity warranting manual VoiceOver/TalkBack verification | Screen readers handle complex interactions inconsistently across OS versions |

---

## BFF contract compliance

For stories with sub-story decomposition (BFF + client), the Quality Gate runs two additional contract checks:

| Check | Passes when | Fails when |
|-------|-------------|------------|
| BFF response shape | The BFF endpoint returns JSON matching the schema defined in the BFF spec's "Response Shape" section | Response is missing fields, has wrong types, or includes undocumented fields |
| Client consumption | The client code reads every field the BFF contract defines as required | Client ignores a required field from the BFF response |

These checks are run by the Test Agent as part of contract testing. Results appear in the Test Report and are evaluated during Check 3 (Test Coverage) and Check 8 (Traceability).

---

## Per-check return routing

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

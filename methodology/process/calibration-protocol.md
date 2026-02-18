# Calibration Protocol

**Version:** 1.0
**Status:** Approved
**Audience:** Tech leads, analysts, all agents during Phase E

---

## Purpose

The calibration protocol governs the first five stories that run through the pipeline. It exists to close the gap between how the pipeline was designed and how it actually behaves with real code and real business inputs.

During calibration, every stage receives full human review — not just the items flagged by the Quality Gate Agent. Human reviewers annotate each decision point where they disagree with the agent's output. Annotations are systematically used to update the methodology layer: role definitions, artifact schemas, and gate thresholds.

When a specific check reaches zero disagreements across five consecutive stories, it transitions from full-review to automated-only. The protocol tracks this graduation per check, not per story.

This protocol applies to Phase E of the implementation sequence. After calibration is complete, normal pipeline operations begin (human review concentrated at Gate 1 and GATE_REVIEW_NEEDED items only).

---

## Who Participates

| Role | Responsibility during calibration |
|------|----------------------------------|
| Tech lead | Reviews all agent outputs at all stages; primary annotator |
| PM/PO | Participates in Gate 1 as usual; reviews business-case.md and epics.md for accuracy |
| Methodology author | Reviews annotations and decides what changes to the methodology layer |
| Agents | Run normally; receive annotations as additional feedback inputs for retry |

---

## Calibration Stages

### Phase E Setup (before Story 1 begins)

1. Verify all seven agents are running and can read/write their designated artifact paths.
2. Verify all MCP servers are reachable and all tools return valid responses.
3. Confirm the current-state model (`pipeline/state/`) is populated by the Codebase Analyst.
4. Select the first five stories. Criteria:
   - At least one BFF + client multi-target story (tests decomposition logic).
   - At least one UI-bearing story (tests accessibility checks and Figma prompt generation).
   - At least one story with a feature flag (tests flag compliance checks).
   - At most one high-complexity story. The first two stories should be low-complexity to establish a baseline quickly.
5. Create the calibration tracking spreadsheet (see Tracking Spreadsheet section below).

---

### Per-Story Review Process

For each of the five calibration stories, follow this review process at every stage. This is additional to the normal pipeline process — normal gates still run.

#### Stage 1 Review (INTAKE)

Tech lead reads `business-case.md`, `epics.md`, and `stories-draft.md`.

Annotate any disagreement with the Coach's output using the annotation format below. Areas to assess:
- Did the Coach surface all weak signals in the PM's request?
- Are the epics at the right level of granularity?
- Do the stories accurately capture PM intent without adding technical assumptions?
- Is the story decomposition appropriate (not too fine, not too coarse)?

#### Stage 2 Review (COMPILATION)

Tech lead reads `spec.md`, `context.md`, and `test-spec.md` for each story.

Annotate disagreements. Areas to assess:
- Does the spec accurately reflect the current state of the codebase (not an idealized state)?
- Are file-level change targets correct and complete?
- Are Gherkin ACs precise enough for the Coding Agent to implement mechanically?
- Is the context.md sufficient for the Coding Agent to locate relevant code without exploration?
- Are NFR thresholds realistic?
- Is the CLEAN layer assignment correct?
- Is the feature flag section complete and correct?
- For multi-target stories: Is the decomposition into sub-stories correct? Are dependencies stated correctly?

#### Stage 3 Review (IMPLEMENTATION)

Tech lead reads the branch diff and `changes.md`.

Annotate disagreements. Areas to assess:
- Did the Coding Agent make any interpretations that are not grounded in the spec?
- Are there missing changes that the spec required?
- Is `assumptions.md` empty when it should be, or populated with valid assumptions?
- Does the code follow the architectural patterns specified in the spec's CLEAN layer mapping?
- Is feature flag usage correct (new behavior behind flag, fallback path intact)?

#### Stage 4 Review (TESTING)

Tech lead reads `results.md`, `coverage.md`, `verdict.md`, and the test files.

Annotate disagreements. Areas to assess:
- Do the tests actually verify what the spec intended, or do they only verify that the implementation exists?
- Are edge cases covered adequately?
- Are accessibility tests meaningful (not just "element exists" checks)?
- Are both flag states tested thoroughly?
- Is coverage measurement accurate?

#### Stage 5 Review (QUALITY GATE)

Tech lead reads `report.md` and `verdict.md`.

Annotate disagreements. Areas to assess:
- Are any checks producing false positives (FAIL when the artifact is actually correct)?
- Are any checks producing false negatives (PASS when the artifact has a real problem)?
- Is the "Human Review Required" section identifying the right items?
- Is the verdict logic being applied correctly?

---

## Annotation Format

Every annotation is a structured entry. Annotations are written to `pipeline/calibration/{story-id}/annotations.md`.

```
## Annotation {N}

Story ID: {story-id}
Stage: {1 | 2 | 3 | 4 | 5}
Annotator: {name}
Date: {ISO-8601}
Category: {see categories below}

Location: {artifact path and section or line range}

Agent decision:
[Quote or describe what the agent did or produced]

Reviewer assessment:
[What the reviewer believes the correct output should be and why]

Impact if uncorrected:
[What goes wrong downstream if this is not fixed]

Methodology change needed:
[Yes / No / Investigate]
If yes: [Which methodology file needs updating and what should change]
```

### Annotation Categories

| Category | Definition |
|----------|------------|
| `classification_error` | The agent classified something incorrectly (e.g., wrong CLEAN layer, wrong KMP bucket, wrong gate verdict) |
| `spec_gap` | The spec is missing information that the Coding Agent needs (common cause: current-state model is incomplete) |
| `implementation_error` | The Coding Agent produced code that diverges from the spec in a non-obvious way |
| `test_gap` | The Test Agent did not cover a scenario that should have been tested |
| `gate_false_positive` | A gate check failed but the artifact is actually correct |
| `gate_false_negative` | A gate check passed but the artifact has a real problem |
| `schema_gap` | A required artifact section is absent from the schema definition |
| `process_gap` | The pipeline flow itself does not handle a case correctly |

---

## Feedback Loop Process

At the end of each calibration story, the methodology author reviews all annotations for that story and decides which ones require methodology changes.

**Process for each annotation marked "Methodology change needed: Yes":**

1. Identify which methodology file is affected:
   - Role definition in `methodology/roles/` (agent instruction change)
   - Schema in `methodology/schemas/` (artifact structure change)
   - Gate definition in `methodology/process/quality-gates.md` (threshold or check change)
   - Pipeline flow in `methodology/process/pipeline-flow.md` (stage or routing change)

2. Draft the change. Describe precisely what is being changed and why. Reference the annotation by number.

3. Apply the change to the methodology file.

4. If the change affects a GitHub Copilot agent definition or Claude Code agent definition, update those as well.

5. Record the change in `pipeline/calibration/methodology-changes.md`:

```
## Change {N}

Date: {ISO-8601}
Source annotation: {story-id} / Annotation {N}
Category: {annotation category}
File changed: {methodology file path}
Description: {what changed and why}
Effect: {what the agent will do differently after this change}
```

**Do not wait until all five stories are complete to apply changes.** Apply changes after each story. This means Story 2 benefits from changes identified in Story 1.

---

## Graduation Criteria

Each quality gate check is tracked independently. A check graduates from "full-review required" to "automated-only" when:

1. Five consecutive stories run with that check producing zero annotations.
2. The five stories represent at least three different story types (UI-bearing, non-UI, multi-target).
3. The methodology author explicitly marks the check as graduated in the tracking spreadsheet.

Once graduated, the tech lead no longer reviews that check during Stage 5 review. It runs automatically and only surfaces for human review when it produces a GATE_REVIEW_NEEDED verdict.

**Regression:** If a graduated check produces a valid annotation in any later story (not calibration, not false positive), it reverts to full-review status until five more consecutive zero-annotation stories are completed.

---

## Tracking Spreadsheet Specification

Create `pipeline/calibration/tracking.csv` with the following structure.

### Sheet 1: Story Tracking

| Column | Description |
|--------|-------------|
| `story_id` | Story identifier |
| `story_type` | ui-bearing, non-ui, multi-target, flagged (comma-separated if multiple) |
| `stage_1_annotations` | Count of annotations at Stage 1 |
| `stage_2_annotations` | Count of annotations at Stage 2 |
| `stage_3_annotations` | Count of annotations at Stage 3 |
| `stage_4_annotations` | Count of annotations at Stage 4 |
| `stage_5_annotations` | Count of annotations at Stage 5 |
| `total_annotations` | Sum of all stage annotations |
| `methodology_changes` | Count of methodology changes resulting from this story |
| `cycle_time_days` | Days from Stage 1 start to MERGED status |
| `gate_retries` | Total number of gate retries across all stages |
| `escalated` | Yes / No — whether story was escalated to human at any gate |

### Sheet 2: Check Graduation Tracking

One row per quality gate check. Updated after each calibration story.

| Column | Description |
|--------|-------------|
| `check_name` | Name matching the check name in quality-gates.md |
| `story_1_annotations` | 0 or count of annotations for this check in Story 1 |
| `story_2_annotations` | 0 or count |
| `story_3_annotations` | 0 or count |
| `story_4_annotations` | 0 or count |
| `story_5_annotations` | 0 or count |
| `consecutive_zeros` | Current streak of zero-annotation stories for this check |
| `graduated` | Yes / No |
| `graduation_date` | Date when graduated (blank until graduated) |
| `regression_date` | Date of any regression after graduation (blank if none) |

**Checks to track:**

The eight Gate 5 checks plus the four Gate 3 checks plus the six Gate 4 checks:

Gate 3: target files modified, no unspecified changes, build passes, assumptions risk level
Gate 4: all tests pass, coverage target met, all ACs covered, flag-on tested, flag-off tested, accessibility tests present
Gate 5: spec completeness, implementation coverage, test coverage, observability compliance, accessibility compliance, design token compliance, feature flag compliance, traceability

---

## Calibration Dashboard Metrics

The Observability Agent generates `pipeline/calibration/dashboard.md` after each calibration story. It contains:

### Story-Level Metrics

| Metric | Description |
|--------|-------------|
| Annotations per story | Total and by stage. Declining trend indicates the system is improving. |
| Methodology changes per story | High count indicates systemic gaps; low count indicates good initial design. |
| Cycle time | Days from intake to merge. Baseline for post-calibration comparison. |
| Gate retries | High retry count indicates gates are too strict or specs are too loose. |
| Escalations | Count of stories requiring human intervention beyond Gate 1 and Stage 6. |

### Check-Level Metrics

| Metric | Description |
|--------|-------------|
| False positive rate | Gate checks that failed but the annotation said the artifact was correct. Target: 0%. |
| False negative rate | Artifacts with annotation category `gate_false_negative`. Target: 0%. |
| Graduation progress | Which checks are at 0, 1, 2, 3, 4, or 5 consecutive zero-annotation stories. |
| Most annotated check | The check with the most annotations across all five stories. Priority for methodology improvement. |

### Post-Calibration Readiness Assessment

After Story 5, the methodology author produces a written readiness assessment:

1. Which checks have graduated to automated-only?
2. Which checks require additional calibration stories?
3. Are there systemic issues that require methodology redesign before production use?
4. What is the expected annotation rate in production (i.e., how often will GATE_REVIEW_NEEDED fire)?

The tech lead must approve the readiness assessment before normal pipeline operations begin.

---

## Calibration vs Production Operations

| Aspect | Calibration (Stories 1-5) | Production (Story 6+) |
|--------|--------------------------|----------------------|
| Stage 1 review | Full — tech lead reads all Coach output | PM confirmation only |
| Stage 2 review | Full — tech lead reads all specs | None unless questions.md produced |
| Stage 3 review | Full — tech lead reads all diffs | None unless Gate 3 fails |
| Stage 4 review | Full — tech lead reads all test output | None unless Gate 4 fails |
| Stage 5 review | Full — tech lead reviews all checks | Graduated checks: none; non-graduated checks: full |
| Stage 6 review | Full | Flagged items only (GATE_REVIEW_NEEDED section) |
| Annotation requirement | Required at every disagreement | Optional; encouraged for new check types |
| Methodology changes | Applied after each story | Applied when systematic issues are identified |

The goal of calibration is to reduce Stage 6 to its minimum: a brief review of a short list of items requiring human judgment, with no full re-review of the implementation.

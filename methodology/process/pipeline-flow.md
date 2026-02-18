# Pipeline Flow

**Version:** 1.0
**Status:** Approved
**Audience:** All agents, tech leads, PMs

---

## Overview

The pipeline transforms imprecise business intent into reviewed, merged code through six sequential stages. Each stage has a defined set of inputs, a responsible agent, expected outputs, and a gate that must be satisfied before the next stage begins.

The pipeline enforces two principles:

1. **No stage begins without the prior stage's gate passing.** This prevents incomplete artifacts from propagating downstream where they are expensive to correct.
2. **Humans review only what automation cannot verify.** During normal operation, human attention is concentrated at Gate 1 (intent confirmation) and Stage 6 (items flagged by the Quality Gate Agent). Automation handles the rest.

---

## Stage Definitions

### Stage 1: INTAKE

**Responsible agent:** Coach

**Inputs:**
- PM/PO's expressed business need (conversation, Jira description, or change request document)

**Outputs:**
- `pipeline/intake/business-case.md` — The validated business problem, success metrics, and competitive context
- `pipeline/intake/epics.md` — Feature groupings derived from the business case
- `pipeline/intake/stories-draft.md` — User stories in "As a / I want / So that" format, one per distinct deliverable

**What the Coach does:**
The Coach conducts a structured inquiry with the PM. It detects weak signals in the request (market size without a source, solution proposed before problem is validated, vague success metrics, single option considered, large effort with no phasing plan) and asks follow-up questions to strengthen the submission. It does not write code, generate specifications, or make architectural decisions.

**Gate 1 — HUMAN REVIEW**

The PM reads `stories-draft.md` and confirms that the stories accurately represent their intent. This is a narrative check, not a technical check. The PM does not review Gherkin acceptance criteria at this stage — those are generated in Stage 2.

| Condition | Action |
|-----------|--------|
| PM confirms all stories | Advance to Stage 2 |
| PM requests changes to one or more stories | Coach revises stories-draft.md; PM re-reviews |
| PM identifies a missing story | Coach adds story; PM re-reviews |

The PM's confirmation is logged as a `human_action` event in `pipeline/observability/events.jsonl`.

---

### Stage 2: COMPILATION

**Responsible agent:** Spec Compiler

**Inputs:**
- `pipeline/intake/stories-draft.md`
- `pipeline/state/` — Current-state model produced and maintained by the Codebase Analyst

**Outputs per story:**
- `pipeline/specs/{story-id}/spec.md` — Machine-consumable specification (Gherkin ACs, file-level change targets, NFRs, dependency declarations)
- `pipeline/specs/{story-id}/context.md` — Extracted codebase context the Coding Agent needs to locate relevant code without exploration
- `pipeline/specs/{story-id}/test-spec.md` — Test plan consumed by the Test Agent

**What the Spec Compiler does:**
The Spec Compiler reads each story from `stories-draft.md` and grounds it in the actual codebase. It resolves ambiguity by consulting the current-state model rather than by guessing. It produces file-level change targets, not module-level suggestions. It self-validates each output against the compiled-spec schema before writing.

**Gate 2a — AUTOMATED: Schema Validation**

The Validation Server runs `validate_spec(path)` against each output.

| Condition | Action |
|-----------|--------|
| All specs pass schema validation | Advance to Stage 3 |
| One or more specs fail validation | Spec Compiler revises failing specs; revalidate |

**Gate 2b — AUTOMATED: Ambiguity Routing**

If the Spec Compiler cannot resolve an ambiguity by consulting the current-state model, it writes `pipeline/specs/{story-id}/questions.md`. The Pipeline Server moves the story to `BLOCKED_ON_PM` status.

| Condition | Action |
|-----------|--------|
| questions.md not produced | Continue to Gate 2a |
| questions.md produced | Coach presents questions to PM; PM responds; Spec Compiler re-runs for that story |

Multi-target decomposition (features spanning BFF and client) occurs during this stage. See the Multi-Target Decomposition section below.

---

### Stage 3: IMPLEMENTATION

**Responsible agent:** Coding Agent

**Inputs:**
- `pipeline/specs/{story-id}/spec.md`
- `pipeline/specs/{story-id}/context.md`

**Outputs:**
- Code changes on `copilot/{story-id}` branch
- `pipeline/impl/{story-id}/changes.md` — Summary of every file changed and the rationale for each change
- `pipeline/impl/{story-id}/assumptions.md` — Assumptions the agent made during implementation (must be empty if the spec was complete)

**What the Coding Agent does:**
The Coding Agent reads the spec and context, then writes code and the unit tests specified in `test-spec.md`. It does not interpret ambiguous specs — it stops and records the ambiguity in `assumptions.md` with a risk level. High-risk assumptions trigger escalation before the gate runs.

**Gate 3 — AUTOMATED: Implementation Integrity**

| Check | Passes when | Fails when |
|-------|-------------|------------|
| Target files modified | Every file in the spec's "In Scope" table has a corresponding diff | One or more in-scope files are unmodified |
| No unspecified changes | The diff contains only files listed in "In Scope" | Files not listed in "In Scope" are modified |
| Compiles | CI build on the branch reports success | CI build fails |

| Condition | Action |
|-----------|--------|
| All three checks pass | Advance to Stage 4 |
| Target files or compilation check fails | Coding Agent receives failure details; retries (max 2 retries) |
| Unspecified changes detected | Coding Agent reverts unspecified changes and retries |
| High-risk assumption in assumptions.md | Story is escalated to tech lead before retry |

---

### Stage 4: TESTING

**Responsible agent:** Test Agent

**Inputs:**
- `pipeline/specs/{story-id}/test-spec.md`
- Code on `copilot/{story-id}` branch

**Outputs:**
- Additional test files added to the branch (edge-case, regression, accessibility)
- `pipeline/test/{story-id}/results.md` — Test execution results
- `pipeline/test/{story-id}/coverage.md` — Coverage delta (before vs after this story)
- `pipeline/test/{story-id}/verdict.md` — PASS or FAIL with rationale

**What the Test Agent does:**
The Test Agent does not modify implementation code. It validates that the Coding Agent's tests actually test what the spec requires (not merely that they pass), generates additional edge-case and regression tests, executes the full test suite against the branch, and verifies accessibility requirements for UI-bearing stories. It tests both flag-on and flag-off states when a feature flag is defined in the spec.

**Gate 4 — AUTOMATED: Test Results and Coverage**

| Check | Passes when | Fails when |
|-------|-------------|------------|
| All tests pass | Zero failing tests in results.md | Any test fails |
| Coverage target met | Coverage delta is non-negative; module coverage >= threshold in spec | Coverage drops or falls below threshold |
| All ACs covered | Every Gherkin AC from the spec has at least one passing test | One or more ACs have no corresponding passing test |
| Flag states tested | Both flag-on and flag-off states have passing tests (when flag defined) | Either flag state has no test or a failing test |

| Condition | Action |
|-----------|--------|
| All checks pass | Advance to Stage 5 |
| Any check fails | Test Agent receives failure details; retries (max 2 retries) |
| Test Agent cannot cover an AC | Escalate to tech lead with explanation |

---

### Stage 5: QUALITY GATE

**Responsible agent:** Quality Gate Agent (uses Opus model)

**Inputs:**
- All artifacts produced in Stages 1–4 for this story
- `pipeline/observability/events.jsonl` filtered to this story's event stream

**Outputs:**
- `pipeline/gates/{story-id}/report.md` — Structured quality report with all eight checks
- `pipeline/gates/{story-id}/verdict.md` — Final verdict

**What the Quality Gate Agent does:**
The Quality Gate Agent runs eight automated checks against the collected artifacts. It does not produce code or fix problems. Its role is purely evaluative. It tells the pipeline whether the story is ready to advance and, when human review is needed, specifies exactly what the human should inspect and why automation was insufficient.

See `methodology/process/quality-gates.md` for the full check definitions.

**Gate 5 — AUTOMATED with HUMAN ESCALATION**

| Verdict | Meaning | Action |
|---------|---------|--------|
| GATE_PASS | All eight checks pass | Story advances to Stage 6 for final PR approval |
| GATE_FAIL | One or more checks fail | Story is returned to the responsible stage; agent retries with failure context |
| GATE_REVIEW_NEEDED | All checks pass; one or more items require human judgment | Story advances to Stage 6; human inspects flagged items only |

After two GATE_FAIL verdicts for the same story from the same stage, the story is escalated to the tech lead regardless of current check results.

---

### Stage 6: HUMAN REVIEW

**Responsible party:** Tech lead

**Inputs:**
- `pipeline/gates/{story-id}/report.md`
- If verdict is GATE_PASS: the PR requires only a final approval, no detailed review
- If verdict is GATE_REVIEW_NEEDED: the "Human Review Required" section of report.md lists the specific items to inspect

**Tech lead actions:**

| Action | When | Outcome |
|--------|------|---------|
| Approve PR | Story looks correct | Branch is merged to main |
| Approve with exception | Minor issue documented, addressed in a follow-up story | Branch is merged; follow-up story created in backlog |
| Request changes — spec | Fundamental mismatch with intent | Story returns to Stage 2; Spec Compiler receives tech lead's notes |
| Request changes — implementation | Spec is correct but implementation is wrong | Story returns to Stage 3; Coding Agent receives tech lead's notes |

Tech lead approval is logged as a `human_action` event in `pipeline/observability/events.jsonl`.

---

## Artifact Flow Diagram

```
PM/PO
  |
  | (conversation)
  v
[Stage 1: INTAKE — Coach]
  |-- pipeline/intake/business-case.md
  |-- pipeline/intake/epics.md
  |-- pipeline/intake/stories-draft.md
  |
  | Gate 1: PM confirms stories match intent (HUMAN)
  v
[Stage 2: COMPILATION — Spec Compiler]
  |   reads: pipeline/state/ (current-state model)
  |-- pipeline/specs/{story-id}/spec.md
  |-- pipeline/specs/{story-id}/context.md
  |-- pipeline/specs/{story-id}/test-spec.md
  |-- pipeline/specs/{story-id}/questions.md  [if ambiguity — routes back to PM]
  |
  | Gate 2a: Schema validation (AUTO)
  | Gate 2b: Ambiguity routing (AUTO — blocks story if questions.md written)
  v
[Stage 3: IMPLEMENTATION — Coding Agent]
  |   reads: spec.md, context.md
  |-- copilot/{story-id} branch (code changes + unit tests)
  |-- pipeline/impl/{story-id}/changes.md
  |-- pipeline/impl/{story-id}/assumptions.md
  |
  | Gate 3: Target files modified, no unspecified changes, compiles (AUTO)
  v
[Stage 4: TESTING — Test Agent]
  |   reads: test-spec.md, copilot/{story-id} branch
  |-- additional tests on copilot/{story-id} branch
  |-- pipeline/test/{story-id}/results.md
  |-- pipeline/test/{story-id}/coverage.md
  |-- pipeline/test/{story-id}/verdict.md
  |
  | Gate 4: All tests pass, coverage target met (AUTO)
  v
[Stage 5: QUALITY GATE — Quality Gate Agent (Opus)]
  |   reads: all artifacts for story
  |-- pipeline/gates/{story-id}/report.md
  |-- pipeline/gates/{story-id}/verdict.md
  |
  | Gate 5: PASS=auto-advance, REVIEW_NEEDED=human inspects flagged only (AUTO->HUMAN)
  v
[Stage 6: HUMAN REVIEW — Tech lead]
  |   reads: report.md "Human Review Required" section only (unless GATE_REVIEW_NEEDED)
  |-- PR approved (merge to main)
  |   or
  |-- PR rejected with notes (returns to Stage 2 or 3)
```

---

## Multi-Target Story Decomposition (BFF + Client)

When a feature requires changes to both the Backend-for-Frontend (BFF) layer and a client application, the pipeline handles this transparently. The PM produces a single feature story. The Spec Compiler decomposes it during Stage 2.

### Decomposition rules

**Trigger:** The Spec Compiler detects that the story requires (a) a new or modified BFF endpoint AND (b) a client-side change that consumes that endpoint.

**Sub-story naming:**

| Sub-story ID | Scope |
|--------------|-------|
| `{story-id}-bff` | BFF endpoint: aggregation logic, business rules, response shaping, error handling |
| `{story-id}-client` | Client UI: CMP screen or component, ViewModel, BFF client call |
| `{story-id}-backend` | Backend service changes (only if a new domain event, persistence change, or service capability is required) |

**Sequencing constraint:** The pipeline enforces this order:
1. `{story-id}-bff` must pass Gate 5 before `{story-id}-client` advances past Stage 2.
2. `{story-id}-backend` (when present) must pass Gate 5 before `{story-id}-bff` advances past Stage 2.
3. `{story-id}-client` may run through Stages 3–5 against a stub BFF response once the `{story-id}-bff` spec defines the contract, but the final Gate 5 for the client story requires the real BFF endpoint to be available.

**Contract testing:** The Test Agent for `{story-id}-client` validates that the BFF returns a response that matches the shape the client spec expects. The Test Agent for `{story-id}-bff` validates that the BFF returns the shape specified in `{story-id}-bff`'s spec. These two checks together close the contract loop.

**PM visibility:** The PM sees one story in the backlog. Sub-story progress is an engineering detail visible in `pipeline/status.json` but not surfaced to the PM unless a sub-story is blocked.

---

## Stage Transition Rules

The Pipeline Server enforces these rules mechanically via `advance_story(story_id, from, to)`.

| From Stage | To Stage | Condition |
|------------|----------|-----------|
| 1 (INTAKE) | 2 (COMPILATION) | `human_action` event of type "pm_approval" present in event log |
| 2 (COMPILATION) | 3 (IMPLEMENTATION) | Spec passes schema validation; no questions.md present |
| 2 (COMPILATION) | BLOCKED_ON_PM | questions.md present |
| BLOCKED_ON_PM | 2 (COMPILATION) | PM has responded; Coach has written updated answers to questions.md |
| 3 (IMPLEMENTATION) | 4 (TESTING) | Gate 3 checks all pass; CI build reports success |
| 4 (TESTING) | 5 (QUALITY GATE) | Gate 4 checks all pass |
| 5 (QUALITY GATE) | 6 (HUMAN REVIEW) | Verdict is GATE_PASS or GATE_REVIEW_NEEDED |
| 5 (QUALITY GATE) | 3 or 4 (retry) | Verdict is GATE_FAIL; retry count < 2 |
| 5 (QUALITY GATE) | 6 (ESCALATED) | Verdict is GATE_FAIL and retry count == 2 |
| 6 (HUMAN REVIEW) | MERGED | Tech lead approves PR |
| 6 (HUMAN REVIEW) | 2 or 3 (rework) | Tech lead requests changes with stage designation |

A story's current stage is always readable from `pipeline/status.json` and queryable via the Pipeline Server's `get_story_status(story_id)` tool.

---

## Pipeline Status Values

| Status | Meaning |
|--------|---------|
| `INTAKE` | Coach interaction in progress |
| `PENDING_PM_REVIEW` | stories-draft.md written; awaiting PM confirmation |
| `COMPILATION` | Spec Compiler running |
| `BLOCKED_ON_PM` | questions.md written; awaiting PM response |
| `IMPLEMENTATION` | Coding Agent running |
| `TESTING` | Test Agent running |
| `QUALITY_GATE` | Quality Gate Agent running |
| `PENDING_HUMAN_REVIEW` | Awaiting tech lead review |
| `MERGED` | PR approved and merged |
| `BLOCKED_ON_DEPENDENCY` | Sub-story waiting for a prerequisite sub-story to pass its gate |
| `ESCALATED` | Two gate failures; awaiting human intervention |
| `CANCELLED` | PM withdrew the story |

---

## Observability Requirements

Every stage transition must produce at least the following events in `pipeline/observability/events.jsonl`:

- `agent_start` — when an agent begins work on a story
- `artifact_write` — for every output file written
- `gate_check` — for every check run (automated gates)
- `gate_verdict` — when a gate issues its final result
- `human_action` — when a human takes an action (PM approval, tech lead approval, or rejection)

See `methodology/schemas/observability-event.schema.json` for the event field specification.

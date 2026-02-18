# Failure Handling

**Version:** 1.0
**Status:** Approved
**Audience:** All agents, tech leads, PMs, Observability Agent

---

## Overview

This document defines how the pipeline responds to failures at each stage. It covers:

- Failure types and recovery actions per stage
- Retry policy and escalation thresholds
- Escalation paths by failure type
- Blocked story handling
- Rate limiting and cost controls
- Root cause analysis activation criteria
- Post-mortem process for systemic failures

The pipeline is designed to recover automatically from transient and correctable failures. Human escalation is the last resort, not the default. Every failure must be logged to `pipeline/observability/events.jsonl` before any recovery action is taken.

---

## General Failure Response Sequence

When any gate fails:

1. Log the failure to `pipeline/observability/events.jsonl` as a `gate_check` event with `result: "FAIL"` and full context.
2. Log a `gate_verdict` event with `verdict: "GATE_FAIL"` and the failing check names.
3. Move the story to the appropriate retry status in `pipeline/status.json`.
4. Send the failure reason to the responsible agent with the full context required to retry.
5. The agent retries (up to the retry limit for that stage).
6. If the retry limit is reached, escalate to the appropriate human (see Escalation Paths).

**No agent may skip this sequence.** An agent that recovers silently — retrying without logging the failure — is creating an incomplete audit trail. Silent recovery is treated as a pipeline defect.

---

## Per-Stage Failure Types and Recovery

### Stage 1 — INTAKE Failures

| Failure type | Description | Recovery action |
|--------------|-------------|----------------|
| PM non-responsive | PM has not confirmed stories-draft.md within the SLA period | Coach sends a follow-up reminder; PM is notified via configured channel |
| Weak signal not addressed | PM confirms stories but tech lead later identifies a fundamental problem with the business case | Return story to Stage 1; Coach conducts additional inquiry with tech lead's concerns as context |
| Story cannot be written | Coach cannot produce a coherent story from the PM's input after two inquiry rounds | Escalate to tech lead and PM together; a synchronous meeting may be required |

**SLA for PM review:** 2 business days. If PM does not respond, Coach re-sends the review request once. If still no response after 4 business days, escalate to the PM's manager.

---

### Stage 2 — COMPILATION Failures

| Failure type | Description | Recovery action | Max retries |
|--------------|-------------|----------------|-------------|
| Schema validation failure | spec.md fails `validate_spec(path)` | Spec Compiler receives the validation error report and the specific sections that failed; retries | No limit (schema is deterministic) |
| Current-state model stale | Spec Compiler cannot resolve a file path because the model is out of date | Codebase Analyst runs incremental update; Spec Compiler retries after update | 1 re-analysis |
| Ambiguity cannot be resolved | Spec Compiler produces questions.md | Story is set to BLOCKED_ON_PM; no retry until PM responds | N/A — not a retry scenario |
| Decomposition disagreement | Tech lead disputes the sub-story decomposition (during calibration) | Spec Compiler receives tech lead's decomposition preference and retries | 2 retries before human re-engages |

**When the current-state model is stale:**
The Codebase Analyst's incremental update must complete before the Spec Compiler retries. The Pipeline Server sets the story to `BLOCKED_ON_ANALYSIS` during this period. If the Codebase Analyst fails to complete its update within 30 minutes, escalate to tech lead.

---

### Stage 3 — IMPLEMENTATION Failures

| Failure type | Description | Recovery action | Max retries |
|--------------|-------------|----------------|-------------|
| Build failure | CI build on `copilot/{story-id}` branch fails | Coding Agent receives the build log and error output; retries | 2 |
| Target files not modified | One or more in-scope files are absent from the diff | Coding Agent receives the list of missing targets; retries | 2 |
| Unspecified changes | Files outside "In Scope" are modified | Coding Agent reverts unspecified files, then retries | 2 |
| High-risk assumption | assumptions.md contains a High-risk entry | Story is escalated to tech lead before any retry; tech lead either resolves the assumption or updates the spec | N/A — human decision required |
| Compilation error in test code | Tests written by Coding Agent do not compile | Coding Agent receives compiler error; retries | 2 |

**Build failure recovery detail:**
The Coding Agent receives the full build log, not just the error message. It must not retry by guessing — it must read the specific compiler or linker error, locate the cause in the spec or implementation, and produce a targeted fix.

**Unspecified changes recovery detail:**
The Coding Agent must understand why it modified unspecified files. If the modification was necessary (e.g., a dependency file required updating), it must add the file to a documented note in `assumptions.md` and escalate for spec update before retrying. It must not silently revert and re-attempt if the same need will arise again.

---

### Stage 4 — TESTING Failures

| Failure type | Description | Recovery action | Max retries |
|--------------|-------------|----------------|-------------|
| Test failure | One or more tests fail | Test Agent receives the failure output; determines whether the test is wrong or the implementation is wrong; retries by fixing the test | 2 |
| Implementation defect detected | Test Agent determines the implementation does not match the spec | Story is returned to Stage 3; Coding Agent receives the Test Agent's findings | N/A — different agent retries |
| Coverage below threshold | Module coverage does not meet the threshold in test-spec.md | Test Agent adds additional tests targeting uncovered lines; retries | 2 |
| AC not covered | One or more Gherkin ACs have no passing test | Test Agent writes tests for uncovered ACs; retries | 2 |
| Flag state not tested | Feature flag is defined in spec but only one path has tests | Test Agent adds the missing flag state test; retries | 2 |
| Accessibility test failure | A UI component fails an automated accessibility check | Test Agent cannot fix implementation; story is returned to Stage 3 with the accessibility finding | N/A — Coding Agent must fix implementation |

**Implementation defect detection detail:**
The Test Agent is responsible for identifying when a test failure indicates an implementation problem rather than a test problem. If the spec clearly states the expected behavior, and the implementation produces different behavior, that is an implementation defect — the Test Agent must not work around it by writing a test that passes the wrong implementation. It must flag it and route the story back to Stage 3.

---

### Stage 5 — QUALITY GATE Failures

| Failure type | Description | Recovery action |
|--------------|-------------|----------------|
| GATE_FAIL — spec completeness | Spec missing required sections | Story returned to Stage 2 (Spec Compiler) |
| GATE_FAIL — implementation coverage | In-scope requirement not implemented | Story returned to Stage 3 (Coding Agent) |
| GATE_FAIL — test coverage | AC not covered or coverage below threshold | Story returned to Stage 4 (Test Agent) |
| GATE_FAIL — observability compliance | Required events missing from events.jsonl | Story returned to the agent that produced the artifact with missing events |
| GATE_FAIL — accessibility compliance | Accessibility test failed | Story returned to Stage 4 (Test Agent) |
| GATE_FAIL — design token compliance | Hardcoded values in UI code | Story returned to Stage 3 (Coding Agent) |
| GATE_FAIL — feature flag compliance | Flag not implemented or state not tested | Story returned to Stage 3 or 4 depending on which aspect failed |
| GATE_FAIL — traceability | ID mismatch or unresolvable reference | Story returned to stage that produced the mismatched artifact |
| GATE_REVIEW_NEEDED | All checks pass; human judgment required | Story advances to Stage 6; human reviews flagged items only |

**After two GATE_FAIL verdicts from the same stage:** The story is escalated to the tech lead. The Retry History section of `report.md` documents the escalation. The tech lead determines whether to:
- Override and advance (with documented exception)
- Modify the spec and restart from Stage 2
- Modify the implementation directly (with explanation of why the agent could not resolve it)
- Cancel the story (rare; requires PM awareness)

---

## Retry Policy

### Standard Retry Policy

| Stage | Max retries | Retry trigger |
|-------|-------------|---------------|
| Stage 2 (schema validation) | No limit | Schema is deterministic; each retry should converge |
| Stage 3 (implementation) | 2 | Any Gate 3 check failure |
| Stage 4 (testing) | 2 | Any Gate 4 check failure |
| Stage 5 (returned to Stage 3 or 4) | 2 | Any GATE_FAIL verdict |

**Retry context:** When an agent retries, it must receive:
1. The original spec (unchanged)
2. The failure reason (specific check name, what failed, and the artifact location)
3. The previous output that failed (so the agent can read what it produced before)

An agent retrying without this context is likely to produce the same failure. The Pipeline Server is responsible for constructing the retry context.

### Retry Logging

Every retry must produce a `decision` event in `events.jsonl`:

```json
{
  "timestamp": "ISO-8601",
  "agent": "coding-agent",
  "action": "retry",
  "story_id": "{story-id}",
  "retry_number": 1,
  "failure_reason": "Gate 3: Build failed. Compiler error in ResumeRepository.kt:L42.",
  "input_refs": ["pipeline/impl/{story-id}/changes.md", "pipeline/impl/{story-id}/build-failure.log"],
  "decision": "Will fix type mismatch at ResumeRepository.kt:L42 per build log."
}
```

---

## Escalation Paths

| Failure condition | Escalate to |
|-------------------|------------|
| Stage 3 max retries reached on build failure | Tech lead |
| Stage 3 high-risk assumption in assumptions.md | Tech lead |
| Stage 4 implementation defect detected by Test Agent | Tech lead (via Stage 3 return) |
| Stage 4 max retries reached on coverage | Tech lead |
| Gate 5: two GATE_FAIL verdicts from same stage | Tech lead |
| Stage 2 blocked on PM for > 4 business days | PM's manager |
| Story blocked on dependency for > 5 business days | PM and tech lead |
| Same gate check fails across 3 or more different stories | Tech lead + Methodology author (systemic failure) |
| Agent loop detected (cost control trigger) | Tech lead immediately |
| Codebase Analyst cannot update current-state model | Tech lead |

**Escalation notification:** When a story is escalated, the Pipeline Server sets the story status to `ESCALATED` and creates a notification in the configured channel (Jira comment, Slack message, or email depending on configuration). The notification must include:
- Story ID
- Which stage/check triggered the escalation
- Retry count at time of escalation
- Link to the relevant artifacts

**PM escalation vs tech lead escalation:**
- Tech lead receives escalations about technical failures (build, tests, spec correctness).
- PM receives escalations about business intent failures (stories that cannot be understood, blocked-on-PM timeouts, cancellation requests).
- Both receive escalations about blocked dependencies when the block has business impact.

---

## Blocked Story Handling

A story is "blocked" when it cannot advance because a prerequisite is not yet met. This is different from a failure — the story's own artifacts may be correct; it is waiting on something external.

### Block Types

| Block type | Status | Unblock condition |
|------------|--------|------------------|
| Blocked on PM (questions.md) | `BLOCKED_ON_PM` | PM responds via Coach; response recorded in questions.md |
| Blocked on dependency story | `BLOCKED_ON_DEPENDENCY` | Prerequisite story reaches `MERGED` status |
| Blocked on current-state model update | `BLOCKED_ON_ANALYSIS` | Codebase Analyst completes incremental update |
| Blocked on BFF story (client sub-story) | `BLOCKED_ON_DEPENDENCY` | `{story-id}-bff` passes Gate 5 |

### Unblock Process

The Pipeline Server monitors blocked stories. When an unblock condition is met:
1. Pipeline Server checks the unblock condition via `get_story_status(prerequisite_id)`.
2. When the condition is satisfied, Pipeline Server updates the blocked story's status to the appropriate stage.
3. A `decision` event is logged: `action: "unblocked"`, with `rationale: "Prerequisite {prerequisite-id} reached MERGED status."`
4. The appropriate agent is notified to continue work.

### SLA for Blocked Stories

| Block type | SLA | Action if SLA exceeded |
|------------|-----|----------------------|
| BLOCKED_ON_PM | 2 business days | Coach re-sends; 4 days: escalate to PM manager |
| BLOCKED_ON_DEPENDENCY | 5 business days | Notify PM and tech lead; consider descoping client story |
| BLOCKED_ON_ANALYSIS | 30 minutes | Escalate to tech lead |

---

## Rate Limiting and Cost Controls

### Loop Detection

An agent loop is defined as: the same agent making the same decision three or more times in a row for the same story without producing a different artifact.

**Detection method:** The Observability Server counts `artifact_write` events per agent per story. If an agent produces three consecutive identical artifacts (same file, same content hash), a loop is detected.

**Response to loop detection:**

1. The Pipeline Server immediately halts the agent's work on that story.
2. Story status is set to `ESCALATED`.
3. Tech lead is notified immediately (not on next check; immediately).
4. The Observability Agent is activated to produce a trace for the looping story.
5. No further agent invocations are permitted for that story until a human clears the escalation.

### Token Budget Controls

Each agent invocation has a maximum token budget. If an agent exceeds its budget for a single story:

| Agent | Max tokens per story invocation | Action if exceeded |
|-------|---------------------------------|-------------------|
| Coach | 50,000 | Log warning; continue if < 75,000 |
| Spec Compiler | 100,000 | Log warning; escalate to tech lead if > 150,000 |
| Codebase Analyst | 200,000 | Expected for large analysis; log for cost tracking |
| Coding Agent | 150,000 | Log warning; escalate if > 200,000 |
| Test Agent | 100,000 | Log warning; escalate if > 150,000 |
| Quality Gate | 75,000 | Log warning; escalate if > 100,000 |
| Observability Agent | 50,000 | Expected for large traces; log |

**Cost anomaly detection:** The Observability Agent checks total token spend per story against the median cost of completed stories. If any story's cost exceeds 3x the median, notify the tech lead.

### Parallel Story Limits

No more than eight stories may be in Stages 3–5 simultaneously. This limit prevents runaway parallelism from exceeding the CI system's capacity and creating unpredictable queue times.

If the pipeline attempts to advance a ninth story to Stage 3, the Pipeline Server holds it at `PENDING_IMPLEMENTATION` until one of the eight in-progress stories completes Stage 5 or is cancelled.

---

## Root Cause Analysis Activation

The Observability Agent is activated for root cause analysis (RCA) when:

| Trigger | What the Observability Agent produces |
|---------|--------------------------------------|
| Any story is escalated after two gate failures | `pipeline/observability/trace/{story-id}.md` — full backward trace from failing gate to PM intent |
| Loop detected | `pipeline/observability/trace/{story-id}.md` with emphasis on the repeating decision |
| Same check fails across 3 or more different stories | `pipeline/observability/issues/{issue-id}.md` — cross-story analysis identifying common cause |
| Tech lead requests investigation | `pipeline/observability/trace/{story-id}.md` on demand |
| Post-mortem initiated | Full RCA report (see Post-Mortem Process) |

### RCA Backward Trace Procedure

When activated, the Observability Agent traces:

1. Start at the failing gate check in `events.jsonl` (filter by `story_id` and `action: "gate_check"`).
2. Read the artifact that failed the check.
3. Follow that artifact's `input_refs` to the artifact that produced it.
4. Continue following `input_refs` until reaching the original Coach output.
5. Follow the Coach output to the PM's original input (recorded as `human_action` events).

Output: a linear narrative of exactly what each agent read, what decision it made, and what it produced — from PM intent to the failing check.

---

## Post-Mortem Process for Systemic Failures

A post-mortem is triggered when the same gate check fails in three or more different stories within a single sprint. This indicates a systemic issue in the methodology, not an isolated story-level problem.

### Post-Mortem Initiation

1. The Observability Agent detects the pattern: three or more `gate_check` events with `result: "FAIL"` and the same `check_name` across different `story_id` values.
2. Observability Agent notifies tech lead and methodology author.
3. Tech lead initiates a post-mortem within 1 business day.

### Post-Mortem Artifacts

The Observability Agent produces `pipeline/observability/issues/{issue-id}.md` with:

**Section 1: Failure Summary**
- Check name
- Affected story IDs
- Date range
- Failure rate for this check (failures / total stories in period)

**Section 2: Cross-Story Pattern Analysis**
- What do the failing stories have in common? (story type, module, complexity, author agent, model used)
- What do the passing stories have in common?
- Hypothesis about root cause

**Section 3: Artifact Comparison**
- Side-by-side comparison of the failing artifacts (spec sections, implementation sections, or test sections)
- What is structurally different about them compared to passing stories?

**Section 4: Root Cause Determination**
- Confirmed root cause (or "under investigation" if still unclear)
- Which methodology file or agent instruction is the source of the problem

**Section 5: Remediation**
- Specific change to the methodology layer (role definition, schema, gate threshold, or process file)
- Agent or implementation change if required
- Whether existing failed stories need to be re-run after the fix

### Post-Mortem Review

The tech lead and methodology author review the Observability Agent's report together. They:
1. Confirm or correct the root cause determination.
2. Approve or revise the remediation.
3. Apply the methodology change.
4. Decide whether failed stories are re-run or carried forward with manual exception.
5. Record the post-mortem outcome in `pipeline/calibration/methodology-changes.md` (using the same format as calibration changes).

### Post-Mortem SLA

| Step | Target time |
|------|------------|
| Observability Agent detects pattern | Automatic (end of each day) |
| Tech lead initiates post-mortem | Within 1 business day of notification |
| Observability Agent produces RCA report | Within 4 hours of activation |
| Tech lead and methodology author review | Within 2 business days |
| Methodology change applied | Within 1 business day of review |
| Failed stories re-evaluated | Within 1 sprint of the fix |

---

## Failure Event Reference

All failure events use the standard observability event schema (`methodology/schemas/observability-event.schema.json`). The following `action` values are defined for failure scenarios:

| Action value | When used |
|-------------|-----------|
| `gate_check` with `result: "FAIL"` | Individual check failure |
| `gate_verdict` with `verdict: "GATE_FAIL"` | Gate produces fail verdict |
| `retry` | Agent retries after failure |
| `escalated` | Story escalated to human |
| `loop_detected` | Repeated identical artifact produced |
| `budget_exceeded` | Agent exceeded token budget |
| `blocked` | Story set to a blocked status |
| `unblocked` | Story cleared from blocked status |
| `postmortem_initiated` | Systemic failure pattern detected |
| `rca_complete` | Observability Agent has produced trace or issue report |

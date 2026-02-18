# Skill: Observability Logging

## Purpose

Every agent working on a story must emit structured events to `pipeline/observability/events.jsonl`. Each line in the file is a valid JSON object conforming to the event schema. Observability compliance is Gate 5 Check 4 — missing required events cause a gate failure.

---

## Event file location

All events for all stories are appended to a single file:

```
pipeline/observability/events.jsonl
```

Each line is an independent JSON object. Lines are never modified after being written. The file is append-only.

---

## Required fields (all events)

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string (ISO-8601) | When the event occurred. Example: `"2026-02-17T14:32:00Z"` |
| `agent` | string | Identifier of the agent producing the event. Example: `"coding-agent"`, `"test-agent"`, `"gate-agent"`, `"spec-agent"` |
| `story_id` | string | Story identifier. Example: `"STORY-042"`. Must match the story ID across all artifacts for this pipeline run. |
| `event_type` | string (enum) | See the eight event types below. |

---

## The eight event types

### 1. agent_start

Emitted once when an agent begins processing a story. Must be the first event an agent writes. Do not write any other events before this one.

Additional required field:
- `input_refs` (array of strings, minimum 1): file paths or artifact identifiers the agent received as input.

```json
{
  "timestamp": "2026-02-17T14:32:00Z",
  "agent": "spec-agent",
  "story_id": "STORY-042",
  "event_type": "agent_start",
  "input_refs": [
    "pipeline/intake/stories-draft.md",
    "pipeline/state/android/project-summary.md"
  ]
}
```

### 2. decision

Emitted when an agent makes a significant choice that affects outputs — classifying a module, selecting an implementation pattern, or choosing to skip a check. Do not emit a decision event for every small choice. Emit it when the decision would affect the outcome if made differently.

Additional required fields:
- `decision` (string): concise statement of the decision made.
- `rationale` (string): reasoning, referencing specific evidence from input artifacts where possible.
- `confidence` (string enum): `"high"`, `"medium"`, or `"low"`. Low confidence must trigger either a `question` event or a human review flag.

Optional field:
- `input_refs` (array of strings): artifacts that informed this decision.

```json
{
  "timestamp": "2026-02-17T14:35:00Z",
  "agent": "spec-agent",
  "story_id": "STORY-042",
  "event_type": "decision",
  "decision": "Classified AuthModule as KMP candidate",
  "rationale": "AuthModule contains only token management and credential validation logic. It imports no platform-specific APIs. Retrofit is the only JVM-only dependency; it will be replaced with Ktor during extraction. See pipeline/state/android/module-graph.md for dependency graph.",
  "confidence": "high",
  "input_refs": ["pipeline/state/android/module-graph.md"]
}
```

### 3. artifact_write

Emitted each time an agent writes or overwrites an artifact. Emit one event per file written, not one event for a batch of files.

Additional required fields:
- `output_ref` (string): file path of the artifact written.
- `input_refs` (array of strings): artifacts read to produce this artifact.

```json
{
  "timestamp": "2026-02-17T14:40:00Z",
  "agent": "spec-agent",
  "story_id": "STORY-042",
  "event_type": "artifact_write",
  "output_ref": "pipeline/specs/STORY-042/spec.md",
  "input_refs": [
    "pipeline/intake/stories-draft.md",
    "pipeline/state/android/project-summary.md",
    "pipeline/intake/business-case.md"
  ]
}
```

### 4. artifact_read

Emitted each time an agent reads an artifact produced by another agent or external system. Do not emit for reading files that are part of the pipeline setup (reference docs, schemas). Emit for files that are outputs of other pipeline stages.

Additional required fields:
- `input_ref` (string): file path of the artifact read.
- `purpose` (string): brief statement of why this artifact was read.

```json
{
  "timestamp": "2026-02-17T14:33:00Z",
  "agent": "coding-agent",
  "story_id": "STORY-042",
  "event_type": "artifact_read",
  "input_ref": "pipeline/specs/STORY-042/spec.md",
  "purpose": "Reading spec to identify in-scope files and implementation constraints before writing code"
}
```

### 5. question

Emitted when an agent encounters ambiguity it cannot resolve autonomously. Blocking questions halt the pipeline until answered. Non-blocking questions are logged for human review but do not halt the pipeline.

Additional required fields:
- `question` (string): specific question stated precisely enough for a human or another agent to respond unambiguously.
- `blocking` (boolean): true if the pipeline cannot proceed without an answer.

Optional field:
- `context` (string): background information that helps the reviewer understand why the question arose.

```json
{
  "timestamp": "2026-02-17T15:00:00Z",
  "agent": "spec-agent",
  "story_id": "STORY-042",
  "event_type": "question",
  "question": "The stories-draft.md says 'update the borrow limit UI', but the current Android app enforces the limit in two places: BorrowRepository and BorrowViewModel. Should both be updated, or only the ViewModel? The business case does not specify.",
  "blocking": true,
  "context": "BorrowRepository enforces at the data layer. BorrowViewModel enforces at the presentation layer. Updating only one creates inconsistency."
}
```

### 6. gate_check

Emitted once per check in the Quality Gate Agent's checks table. Eight gate_check events are expected per Gate 5 run, one for each required check. The check names must match the names in the gate report exactly.

Additional required fields:
- `check_name` (string): name of the check as it appears in the gate report. Valid values: `spec_completeness`, `implementation_coverage`, `test_coverage`, `observability_compliance`, `accessibility_compliance`, `design_token_compliance`, `feature_flag_compliance`, `traceability`.
- `result` (string enum): `"PASS"` or `"FAIL"`.

Optional field:
- `details` (string): explanation of the result. Required when result is FAIL; optional when PASS.

```json
{
  "timestamp": "2026-02-17T16:10:00Z",
  "agent": "gate-agent",
  "story_id": "STORY-042",
  "event_type": "gate_check",
  "check_name": "accessibility_compliance",
  "result": "FAIL",
  "details": "TitleDetailScreen borrow button missing contentDescription. VoiceOver announces 'button' with no action label. Required: 'Borrow, button' when available; 'Return, button' when borrowed."
}
```

### 7. gate_verdict

Emitted once by the Quality Gate Agent after all gate_check events have been emitted. Must be the final event in the gate agent's run for a story.

Additional required field:
- `verdict` (string enum): `"GATE_PASS"`, `"GATE_FAIL"`, or `"GATE_REVIEW_NEEDED"`. Must match the Verdict field in the gate report document.

Optional field:
- `failing_checks` (array of strings): list of check names that resulted in FAIL. Required when verdict is `GATE_FAIL`; omit or set to empty array otherwise.

```json
{
  "timestamp": "2026-02-17T16:15:00Z",
  "agent": "gate-agent",
  "story_id": "STORY-042",
  "event_type": "gate_verdict",
  "verdict": "GATE_FAIL",
  "failing_checks": ["accessibility_compliance", "feature_flag_compliance"]
}
```

### 8. human_action

Emitted by the orchestration system when a human reviewer takes an action on a story. This event is written by the system on behalf of the human, not by the human directly.

Additional required fields:
- `reviewer` (string): identity of the human reviewer (name, username, or role — e.g., `"tech-lead"`, `"jsmith"`).
- `action` (string): the action taken. Examples: `"approved"`, `"rejected"`, `"waived-accessibility-check"`, `"resolved-question"`, `"pm_approval"`.

Optional field:
- `rationale` (string): the reviewer's stated reason. Required when action is `"rejected"` or starts with `"waived-"`.

```json
{
  "timestamp": "2026-02-17T17:00:00Z",
  "agent": "orchestrator",
  "story_id": "STORY-042",
  "event_type": "human_action",
  "reviewer": "tech-lead",
  "action": "waived-accessibility-check",
  "rationale": "Cover art accessibility fix is tracked in STORY-051. Proceeding with STORY-042 on the understanding that STORY-051 is in the same sprint."
}
```

---

## When to emit each event type

| Situation | Event to emit |
|-----------|--------------|
| Agent begins processing a story | `agent_start` (must be first) |
| Agent classifies a module | `decision` |
| Agent selects an implementation pattern | `decision` |
| Agent decides to skip a check with justification | `decision` |
| Agent writes spec.md, context.md, test-spec.md, or any artifact | `artifact_write` (one per file) |
| Agent reads another agent's output file | `artifact_read` |
| Agent cannot resolve an ambiguity | `question` |
| Quality Gate Agent evaluates a check | `gate_check` (eight per gate run) |
| Quality Gate Agent produces its verdict | `gate_verdict` (last event in gate run) |
| Human reviews and approves, rejects, or waives | `human_action` |

---

## Anti-patterns

### Emitting decisions for routine choices

Wrong: emitting a `decision` event for every variable name choice or minor implementation detail.

Correct: emit `decision` only for choices that materially affect outputs — module classification, architectural pattern selection, check skipping.

### Combining multiple files in one artifact_write

Wrong: one `artifact_write` event listing three output files.

Correct: one `artifact_write` event per file written.

### Out-of-order events

Wrong: emitting `artifact_write` events before `agent_start`.

Correct: `agent_start` is always the first event an agent writes for a story.

### Missing gate_check events

Wrong: emitting a `gate_verdict` without first emitting all eight `gate_check` events.

Correct: all eight `gate_check` events are emitted in the order the checks are defined before the `gate_verdict`.

### Using question events for answerable questions

Wrong: emitting a `question` event for something that can be resolved by reading the codebase.

Correct: read the relevant files first. Only emit a `question` event when the codebase and all available artifacts do not resolve the ambiguity.

---

## Gate 5 compliance check

Gate 5 Check 4 (Observability Compliance) passes when the events.jsonl file contains, at minimum for the story being evaluated:

- One `agent_start` event per agent that worked on the story.
- One `artifact_write` event per artifact file produced.
- One `gate_verdict` event matching the verdict in the gate report.

Missing any of these causes a GATE_FAIL verdict on the observability compliance check.

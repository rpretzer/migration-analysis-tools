# Gate Report Schema

This schema defines the structure of the report produced by the Quality Gate Agent. The Quality Gate Agent receives the spec, the Implementation Report, and the Test Report for a story, runs eight automated checks, and produces this report. Based on the verdict, the pipeline either advances the story, returns it to the failing stage for retry, or routes it to a human reviewer.

---

## Required Sections

### Story ID

The story identifier exactly as it appears in the spec, implementation report, and test report for this run.

```
Story ID: STORY-{number}
```

---

### Verdict

The Quality Gate Agent's determination. Must appear immediately after Story ID so downstream automation can parse it without reading the full report.

```
Verdict: GATE_PASS
```

Valid values:
- **GATE_PASS**: All eight checks passed. Story advances to the next pipeline stage.
- **GATE_FAIL**: One or more checks failed. Story is returned to the failing stage. After two retries from the same stage, the story is escalated to a human reviewer.
- **GATE_REVIEW_NEEDED**: All eight checks passed, but one or more items require human judgment that automation cannot provide. A human reviewer inspects only the items listed in "Human Review Required" — they do not re-review the full story.

No other verdict values are valid. Conditional or qualified verdicts (e.g., "GATE_PASS if accessibility is waived") are not permitted.

---

### Checks

A table of all eight required checks. Every check must be present. The order must match the table below exactly, as downstream automation references checks by row index.

| Check Name | Result | Details |
|------------|--------|---------|
| Spec completeness | PASS / FAIL | [Explanation if FAIL; "All required sections present and non-empty." if PASS] |
| Implementation coverage | PASS / FAIL | [Explanation if FAIL; "All spec requirements traced to implementation." if PASS] |
| Test coverage | PASS / FAIL | [Explanation if FAIL; "Coverage delta non-negative; all ACs covered." if PASS] |
| Observability compliance | PASS / FAIL | [Explanation if FAIL; "Required observability events present in events.jsonl." if PASS] |
| Accessibility compliance | PASS / FAIL | [Explanation if FAIL; "All accessibility checks passed or N/A with justification." if PASS] |
| Design token compliance | PASS / FAIL | [Explanation if FAIL; "No hardcoded values; all styled elements use design tokens." if PASS] |
| Feature flag compliance | PASS / FAIL | [Explanation if FAIL; "Flag implementation present and both states tested." if PASS] |
| Traceability | PASS / FAIL | [Explanation if FAIL; "All story IDs, file references, and AC IDs cross-reference consistently." if PASS] |

Check definitions:

**Spec completeness**: The spec file contains all required sections per the spec schema. No section is missing or contains only a placeholder value.

**Implementation coverage**: Every in-scope requirement from the spec has a row in the Spec Coverage table with status "complete." No requirement is "partial" or "blocked" without a corresponding Blocked Items entry.

**Test coverage**: All of the following are true: (a) every AC in the Gherkin AC Coverage Matrix has status "covered," (b) no coverage delta is negative, (c) the Test Report verdict is PASS.

**Observability compliance**: The `events.jsonl` file for this story contains at minimum: one `agent_start` event, one `artifact_write` event per artifact produced, and one `gate_verdict` event matching this report's verdict. Required events are validated against the observability event schema.

**Accessibility compliance**: All accessibility check rows in the Test Report show "passed," or show "N/A" with a valid justification (the story contains no UI changes as confirmed by the Files Changed table).

**Design token compliance**: The "Missing Tokens Flagged" section of the Implementation Report is empty, or every flagged item has an accompanying ticket reference for token creation.

**Feature flag compliance**: If the spec defined a feature flag, the Feature Flag Implementation section is populated and the Flag State Testing section in the Test Report contains at least one passing test for flag-on and one for flag-off. If the spec did not define a feature flag, this check is PASS automatically.

**Traceability**: Story IDs match across spec, implementation report, test report, and gate report. All file references in the implementation report exist in the repository. All AC IDs referenced in the test report exist in the spec.

---

### Human Review Required

This section is present only when Verdict is GATE_REVIEW_NEEDED. If the verdict is GATE_PASS or GATE_FAIL, omit this section entirely or write "N/A."

When present, this section contains a numbered list of items that require human judgment. The human reviewer inspects only these items — they do not re-review the full story or re-run any checks.

Format for each item:

```
1. Location: path/to/file.kt:L42-L67
   Concern: [Specific concern stated in one or two sentences.]
   Why automation is insufficient: [Explain why a rule check cannot resolve this — e.g., "Requires business domain knowledge to determine if this error message is user-appropriate," or "Two valid interpretations of the spec exist; human must select one."]
```

The list must not be empty when Verdict is GATE_REVIEW_NEEDED. A GATE_REVIEW_NEEDED verdict with an empty list is a validation failure.

---

### Retry History

This section is present only on the second or later gate attempt for a story. If this is the first gate attempt, omit this section entirely or write "N/A."

When present, provide:

**Previous Verdict**: The verdict from the most recent prior gate attempt (e.g., GATE_FAIL).

**Previous Failures**:

| Check Name | Previous Result | Previous Details |
|------------|----------------|-----------------|
| Test coverage | FAIL | AC-3 had status "not covered." |

**What Changed**: A description of what the Coding Agent or Test Agent changed between the previous attempt and this one. Reference specific file changes or test additions.

```
What Changed:
- Test Agent added testCheckoutFlowOnNetworkTimeout() to cover AC-3.
- Coverage for com.example.checkout rose from 62% to 71%.
```

---

### Trace Link

The file path or reference to the observability trace for this gate run.

```
Trace Link: analysis/events/STORY-042.events.jsonl
```

The gate_verdict event in the referenced file must match the Verdict in this report. If the file does not exist or does not contain a matching gate_verdict event, the Observability compliance check must be FAIL.

---

## Verdict Logic

The following rules determine the verdict. The Quality Gate Agent must apply these rules mechanically and must not override them based on qualitative judgment.

**GATE_PASS**: All eight checks in the Checks table have result PASS. No exceptions.

**GATE_FAIL**: Any check has result FAIL. The story is returned to the stage responsible for the failing check:
- Spec completeness FAIL → returned to Spec Agent.
- Implementation coverage FAIL → returned to Coding Agent.
- Test coverage FAIL → returned to Test Agent.
- Observability compliance FAIL → returned to the agent that produced the artifact with the missing events.
- Accessibility compliance FAIL → returned to Test Agent.
- Design token compliance FAIL → returned to Coding Agent.
- Feature flag compliance FAIL → returned to Coding Agent or Test Agent depending on which check failed.
- Traceability FAIL → returned to whichever stage produced the mismatched reference.

After two GATE_FAIL verdicts for the same story from the same stage, the story is escalated to a human reviewer regardless of the check result. The Retry History section must document this escalation path.

**GATE_REVIEW_NEEDED**: All eight checks have result PASS, but the Quality Gate Agent has identified items that require human judgment. Triggers for GATE_REVIEW_NEEDED include:
- An assumption in the Implementation Report has risk rated "high."
- A blocked item has a resolution path that requires a business decision.
- The spec and implementation diverge in a way that is technically valid but may not match stakeholder intent.
- An accessibility check passed automated tools but the component has interaction complexity that warrants manual VoiceOver/TalkBack verification.

GATE_REVIEW_NEEDED does not block the pipeline until a human acts. The human reviewer responds with either: approve (advance), reject with feedback (return to appropriate stage), or waive (advance with documented exception).

---

## Validation Rules

1. **All eight checks present**: The Checks table must contain exactly eight rows in the order specified. Missing or reordered checks cause the report to be rejected before verdicts are evaluated.

2. **Verdict matches check results**: If all checks are PASS, verdict must be GATE_PASS or GATE_REVIEW_NEEDED. If any check is FAIL, verdict must be GATE_FAIL. A GATE_PASS verdict with a failing check is a schema violation.

3. **GATE_REVIEW_NEEDED requires content**: The Human Review Required section must contain at least one item when the verdict is GATE_REVIEW_NEEDED. An empty list with this verdict is a validation failure.

4. **Retry history on subsequent attempts**: If this is the second or later gate attempt (determinable from the story's event log), the Retry History section must be populated.

5. **Trace link resolvable**: The file path in Trace Link must exist in the repository and contain a gate_verdict event matching the Verdict field.

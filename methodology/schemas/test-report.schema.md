# Test Report Schema

This schema defines the structure of the report produced by the Test Agent after executing and augmenting tests for a story. The Test Agent receives the Implementation Report and the original spec, runs the tests committed by the Coding Agent, adds its own tests where gaps exist, and produces this report. The Quality Gate Agent uses this report as the primary input for automated checks.

---

## Required Sections

### Story ID

The story identifier exactly as it appears in the corresponding specification file and implementation report.

```
Story ID: STORY-{number}
```

Must match the Story ID in the implementation report for this run.

---

### Test Execution Summary

High-level metrics for the full test suite after the Test Agent's run.

| Metric | Value |
|--------|-------|
| Total tests | N |
| Passed | N |
| Failed | N |
| Skipped | N |
| Coverage % before this story | N% |
| Coverage % after this story | N% |

"Before" and "after" coverage figures must be for the module(s) changed by the implementation, not the entire codebase. If coverage tooling is unavailable, write "unavailable — [reason]" and flag this in the Verdict.

---

### Coding Agent Tests

A table of every test committed by the Coding Agent as part of the implementation.

| Test Name | Result | Validates Stated AC |
|-----------|--------|---------------------|
| `testCheckoutFlowSucceeds()` | passed / failed / skipped | yes / no / partial |

Rules:
- Include every test that existed in the implementation branch and was added or modified for this story. Do not list pre-existing tests that were not touched.
- "Validates Stated AC" must be "yes" if the test directly exercises a Gherkin acceptance criterion from the spec, "partial" if it exercises part of one, and "no" if it tests internal behavior not captured by an AC (which is acceptable, but should be noted).
- Failed tests block the Verdict from being PASS. Document the failure reason in a sub-list under the failing row.

---

### Additional Tests Generated

Tests added by the Test Agent that were not present in the Coding Agent's implementation.

| Test Name | Rationale | Result |
|-----------|-----------|--------|
| `testCheckoutFlowOnNetworkTimeout()` | AC-3 only tested happy path; this covers the timeout error branch. | passed / failed / skipped |

Rules:
- Every additional test must have a rationale that references either a specific AC gap, an edge case identified during review, or an error branch not exercised by the Coding Agent's tests.
- The Test Agent must not add tests that duplicate Coding Agent tests. Duplication without documented reason is a validation failure.
- If no additional tests were needed, write a single-row table with: "None required" | "Coding Agent tests provided full AC coverage." | N/A.

---

### Gherkin AC Coverage Matrix

A table mapping every Gherkin acceptance criterion from the spec to the tests that cover it.

| AC ID | AC Summary | Corresponding Tests | Coverage Status |
|-------|-----------|---------------------|-----------------|
| AC-1 | Given user on checkout, When they tap Pay, Then order is confirmed | `testCheckoutFlowSucceeds()` | covered |
| AC-2 | Given network timeout, When they tap Pay, Then error message shown | `testCheckoutFlowOnNetworkTimeout()` | covered |
| AC-3 | Given flag off, When user navigates, Then old flow shown | `testLegacyFlowShownWhenFlagOff()` | covered |

Coverage status values:
- **covered**: At least one test exercises the full Given/When/Then chain.
- **partial**: At least one test exists but does not exercise the full chain (e.g., assertion is missing).
- **not covered**: No test exercises this AC.

Every AC from the spec's Gherkin section must appear in this table. Omitting an AC is a validation failure.

---

### Flag State Testing

This section is required when the spec includes a feature flag. If the spec does not include a feature flag, write "N/A — spec did not specify a feature flag."

When required, provide:

**Tests with Flag On**:

| Test Name | Result |
|-----------|--------|
| `testNewFlowRendersWhenFlagEnabled()` | passed |

**Tests with Flag Off**:

| Test Name | Result |
|-----------|--------|
| `testLegacyFlowRendersWhenFlagDisabled()` | passed |

Both flag states must have at least one test. A spec with a feature flag that has no flag-off tests is a validation failure.

---

### Accessibility Test Results

Results of automated accessibility checks run against any UI components added or modified by this story.

For each category, record the tool used, what was checked, and the result.

| Check | Tool / Method | Result | Details |
|-------|--------------|--------|---------|
| Tap targets (min 48x48dp) | Espresso / XCUITest measurement | passed / failed | [any failing elements listed] |
| Color contrast (min 4.5:1 text, 3:1 UI) | Accessibility Scanner / axe | passed / failed | [any failing elements listed] |
| Content labels (images, icons, controls) | Manual + TalkBack/VoiceOver scan | passed / failed | [any missing labels listed] |
| Screen reader traversal order | TalkBack/VoiceOver manual check | passed / failed | [any ordering issues listed] |

For stories that are code-only (no UI changes), write "N/A — this story contains no UI changes" for all rows.

The presence of "failed" in any row does not automatically cause the Verdict to be FAIL, but the Quality Gate Agent will flag it. A failed accessibility check with no remediation plan will cause GATE_FAIL.

---

### Coverage Delta

Module-by-module comparison of test coverage before and after this story's implementation.

| Module | Coverage Before | Coverage After | Delta |
|--------|----------------|----------------|-------|
| `com.example.checkout` | 62% | 71% | +9% |
| `com.example.shared.network` | 78% | 78% | 0% |

Rules:
- List only modules that were changed by the implementation.
- Delta must not be negative for any module. A coverage decrease is a validation failure unless a pre-existing test was removed with documented justification in the Additional Tests Generated section.
- If coverage tooling is unavailable for a module, write "unavailable" in the Before and After columns and document the reason.

---

### Verdict

The Test Agent's determination of whether the implementation passes testing standards.

```
Verdict: PASS
```

or

```
Verdict: FAIL

Reasons:
1. [Specific failure — test name, AC ID, or coverage module — with file and line reference where applicable]
2. [...]
```

Verdict is exactly one of PASS or FAIL. No other values are permitted.

**PASS criteria** (all must be true):
- All tests in Coding Agent Tests passed or have documented skip justifications.
- All tests in Additional Tests Generated passed.
- Every AC in the Gherkin AC Coverage Matrix has status "covered."
- No coverage delta is negative.
- Flag state testing is present and all tests passed (when applicable).
- No accessibility check failed without a remediation plan.

**FAIL criteria** (any one is sufficient):
- Any test failed without a documented justification.
- Any AC has status "not covered."
- Any coverage delta is negative without documented justification.
- Flag state testing required but absent.
- Accessibility failure with no remediation plan documented.

---

## Validation Rules

The following rules are checked by the Quality Gate Agent.

1. **AC completeness**: Every Gherkin AC from the spec has a row in the Gherkin AC Coverage Matrix. Missing ACs cause GATE_FAIL.

2. **Binary verdict**: Verdict is exactly "PASS" or "FAIL" with no qualifications, caveats, or conditional language. Verdicts such as "PASS with reservations" are not valid and cause GATE_FAIL.

3. **Flag state testing required**: If the spec defined a feature flag, the Flag State Testing section must contain at least one test for flag-on and one for flag-off.

4. **No negative coverage delta**: Any module showing a negative delta without justification causes GATE_FAIL.

5. **Failed tests explained**: Any test listed as "failed" must have a sub-note explaining the failure. A failed test without explanation causes GATE_FAIL.

6. **Accessibility N/A justified**: Marking accessibility as N/A requires the story to contain no UI changes. The Test Agent must verify this against the Files Changed table in the Implementation Report.

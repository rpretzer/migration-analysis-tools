# Implementation Report Schema

This schema defines the structure of the report produced by the Coding Agent after writing code for a story. Every implementation report must conform to this schema before being passed to the Test Agent.

---

## Required Sections

### Story ID

The story identifier exactly as it appears in the corresponding specification file.

```
Story ID: STORY-{number}
```

Must match the `id` field in the spec file that triggered this implementation run.

---

### Branch

The Git branch on which the implementation was committed.

```
Branch: copilot/{story-id}
```

Convention for GitHub Copilot Workspace runs: `copilot/{story-id}` (e.g., `copilot/STORY-042`). For manual or other automated runs, use the branch name as created. The branch must be traceable to this story.

---

### Files Changed

A table listing every file touched during the implementation.

| File Path | Action | Lines Changed | Spec Requirement Traced |
|-----------|--------|---------------|-------------------------|
| `path/to/file.kt` | created / modified / deleted | +N / -N | Requirement ID or quoted requirement text |

Rules:
- Every file that was created, modified, or deleted must appear in this table.
- The "Spec Requirement Traced" column must reference the spec requirement that justifies the change. If a file was changed for a reason not stated in the spec, that reason must appear in "Assumptions Made" with a cross-reference to this table row.
- Use the format `+N / -N` for lines added and removed. For created files, show only `+N`. For deleted files, show only `-N`.

---

### Spec Coverage

A table mapping every requirement in the specification to its implementation location.

| Spec Requirement | Addressed In (file + line range) | Status |
|-----------------|----------------------------------|--------|
| Quoted or summarized requirement text | `path/to/file.kt:L42-L87` | complete / partial / blocked |

Status values:
- **complete**: The requirement is fully implemented and testable.
- **partial**: Part of the requirement is implemented. A corresponding "Blocked Items" entry is required.
- **blocked**: The requirement could not be implemented. A corresponding "Blocked Items" entry is required.

Every requirement listed in the spec's "In Scope" and acceptance criteria sections must have a row in this table.

---

### Feature Flag Implementation

This section is required when the specification includes a feature flag. If the spec does not include a feature flag, write "N/A — spec did not specify a feature flag."

When required, provide:

**Flag Key**: The exact string key used to query the flag SDK (e.g., `feature.new_checkout_flow`).

**SDK Call Locations**:

| File | Line | SDK Method Called |
|------|------|-------------------|
| `path/to/file.kt` | 114 | `featureFlags.isEnabled("feature.new_checkout_flow")` |

**Flag-On Path**: Describe in 1–3 sentences what code path executes when the flag evaluates to `true`.

**Flag-Off Path**: Describe in 1–3 sentences what code path executes when the flag evaluates to `false`. The flag-off path must leave the existing behavior completely unchanged.

---

### Design Token Compliance

**Tokens Used**:

| Token Name | Value Applied | Usage Location |
|------------|--------------|----------------|
| `color.primary` | `#6366F1` | `ButtonPrimary` background |

**Missing Tokens Flagged**:

List any hardcoded values that should be tokens but no token exists in the design system for them. Format: `file:line — hardcoded value — recommended token name (does not yet exist)`.

If all values are properly tokenized, write "None — all styled values use design tokens."

---

### Assumptions Made

A numbered list of every assumption the Coding Agent made that was not explicitly stated in the specification. The goal is for this list to be empty. A non-empty list signals spec ambiguity that should be resolved before the next sprint.

Format for each entry:

```
1. [Assumption text — describe exactly what was assumed and why]
   Risk: high / medium / low
   Impact if wrong: [what breaks or must change]
   Traced to: Files Changed row N
```

If no assumptions were made, write: "None."

---

### Blocked Items

Items from the specification that could not be implemented in this run, with the reason for each.

Format for each entry:

```
1. Requirement: [quoted requirement text]
   Reason blocked: [specific technical or dependency reason]
   Spec Coverage status: partial / blocked
   Resolution path: [what must happen before this can be implemented]
```

If nothing was blocked, write: "None."

---

## Validation Rules

The following rules must be satisfied before the report is considered valid. The Quality Gate Agent checks these automatically.

1. **File completeness**: Every file listed in the spec's "Files in Scope" section appears in the Files Changed table. No file may be absent without a documented justification in Blocked Items.

2. **No untraced changes**: Every file in the Files Changed table has a non-empty "Spec Requirement Traced" value. If a change was made for a reason not in the spec, it must appear in Assumptions Made with a risk assessment.

3. **Full spec coverage**: Every in-scope requirement and acceptance criterion from the spec has a corresponding row in the Spec Coverage table. Omitting a requirement is a validation failure.

4. **Partial/blocked explained**: Every row in Spec Coverage with status "partial" or "blocked" must have a corresponding entry in Blocked Items. A partial or blocked status without explanation is a validation failure.

5. **Feature flag section present**: If the spec contained a feature flag definition, the Feature Flag Implementation section must be populated — "N/A" is not acceptable in that case.

6. **Branch naming**: The branch must follow the `copilot/{story-id}` convention for GitHub runs, or be documented as a named exception.

7. **No empty Assumptions**: If Assumptions Made is non-empty, each entry must include a risk level and impact statement. An assumption listed without a risk assessment is a validation failure.

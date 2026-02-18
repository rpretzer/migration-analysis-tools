# Compiled Spec Schema

## Purpose

This schema defines the structure of the compiled specification artifact produced by the Spec Compiler. The compiled spec is the machine-consumable contract between the Spec Compiler and the Coding Agent. It must be precise enough that the Coding Agent can produce correct, reviewable code without asking clarifying questions.

A spec that requires an agent to infer intent is a malformed spec. Every ambiguity resolved by the Coding Agent is a defect in the Spec Compiler's output.

---

## Schema Version

`compiled-spec.schema.md` v1.0

---

## Required Sections

### Spec ID

A unique identifier matching the originating story ID. Format: `[PROJECT]-[NUMBER]` (e.g., `HOOPLA-142`). Used for cross-referencing in implementation reports, test reports, and Jira.

### Source

Reference to the intake story that produced this spec.

- **Story path**: File path to the source user story document.
- **PM intent hash**: SHA-256 of the "I want / So that" fields at time of compilation. Used to detect spec drift when the story is revised after compilation.

Example:
```
Story path: docs/stories/HOOPLA-142-playback-resume.md
PM intent hash: a3f7c21d9e04b658...
```

### Story

The original user story carried forward verbatim. Do not paraphrase.

```
As a [user type],
I want [capability],
So that [outcome].
```

### Context / Background

A description of the current state of the system as it relates to this story. This section must name specific modules, files, classes, and patterns — not generic descriptions. An agent reading this section should be able to locate the relevant code without additional exploration.

Example of required specificity: "The resume position for audio playback is currently stored in `PlayerSessionManager.kt` (`:feature:playback` module) via a `SharedPreferences` write on `onPause`. There is no server-side persistence. The `ResumeRepository` interface exists but has no implementation."

Example of disqualifying vagueness: "The app currently has some playback state management."

### In Scope (File-Level Targets)

A table listing every file to be created, modified, or deleted. Every entry must resolve to a real path in the current-state model. Paths are relative to the repository root.

| File Path | Action | What to Change | Pattern Reference |
|-----------|--------|----------------|-------------------|
| `path/to/file.kt` | create / modify / delete | Description of the specific change | Path to an existing file whose structure this new file should follow |

Rules:
- "What to Change" must describe the specific addition, removal, or modification — not a general intent.
- "Pattern Reference" must point to an existing file. If no pattern exists, write "no existing pattern — see Context section."
- Every file listed here must appear in the implementation report's "Files Changed" section.

### Out of Scope

Explicit exclusions. Each exclusion should name a specific thing that a reasonable agent might attempt, and explain why it is excluded.

Example: "Do not migrate `LegacyPlayerService.java` to Kotlin. That refactor is tracked in HOOPLA-89 and must be completed first."

### Acceptance Criteria (Gherkin)

Given/When/Then scenarios. There must be at least one scenario per in-scope file-level target. Number each scenario for traceability (AC-1, AC-2, ...).

```gherkin
Scenario AC-1: [Descriptive name]
  Given [precondition]
  When [action]
  Then [expected outcome]
```

Each scenario must be independently verifiable. Avoid compound "Then" clauses that bundle multiple assertions; split them into separate scenarios.

### Non-Functional Requirements

#### Performance

For each performance requirement: a numeric threshold, the metric being measured, and the measurement method. No qualitative statements permitted.

Example format:
- Resume position lookup: P95 latency < 50 ms, measured via `Trace.beginSection("resume_lookup")` in `ResumeRepository.get()`.

#### Accessibility

WCAG 2.1 AA criterion IDs and platform-specific implementation notes.

Example format:
- WCAG 1.4.3 (Contrast Minimum): Playback progress bar foreground `#FFFFFF` on background `#1A1A2E` — contrast ratio 12.6:1, compliant.
- WCAG 2.1.1 (Keyboard): On Android TV, resume button must be reachable via D-pad without pointer input.

#### Observability

Log events, trace spans, and metrics that must be emitted. Field names must be specified exactly as they will appear in the logging system.

Example format:
- Log event `playback.resume.triggered`: fields `user_id` (string), `content_id` (string), `resume_position_ms` (long), `source` (enum: `server` | `local`).
- Trace span `resume_fetch`: wraps the full `ResumeRepository.get()` call, attribute `cache_hit` (boolean).

#### Testing

Coverage target (numeric percentage) and test types required. Specify per module if targets differ.

Example format:
- `:feature:playback` module: 80% line coverage minimum.
- Required test types: unit tests for `ResumeRepository`, integration test for the full resume flow with a fake server, accessibility test for the resume button tap target.

### Dependencies

A list of story IDs and module prerequisites that must be complete before this story can be implemented.

Example:
- HOOPLA-138 (ResumeRepository interface): must be merged to `main` before implementation begins.
- `:core:network` module version >= 2.4.0 required for the retry configuration API.

### Feature Flag Configuration

If this story introduces or modifies behavior behind a feature flag, this section is required. If there is no feature flag, write "N/A — [reason]" (e.g., "N/A — infrastructure-only change with no user-visible behavior").

- **Flag key**: The exact string key used in the flag SDK (e.g., `playback_server_resume_enabled`).
- **Type**: `boolean` | `multivariate` (specify variants if multivariate).
- **Default value**: The value used when the flag is unreachable or the SDK is uninitialized.
- **Targeting rules**: Who sees the flag enabled (e.g., "internal users only in v4.43+").
- **Flag-on behavior**: Precise description of what the code does when the flag evaluates to enabled.
- **Flag-off fallback**: Precise description of what the code does when the flag evaluates to disabled. Must be a complete, functional code path — not a degraded or broken state.

### Analytics Events

Events that must be emitted as a result of this story's changes.

| Event Name | Trigger Condition | Payload Fields |
|------------|-------------------|----------------|
| `playback_resumed` | User taps resume and playback begins | `content_id: string`, `resume_position_ms: long`, `source: "server" \| "local"` |

If there are no analytics events, write "None."

### CLEAN Layer Mapping

For every file-level target in "In Scope," specify which layer of the CLEAN architecture it belongs to. Flag any dependency rule violations.

CLEAN layers (in dependency order, inner to outer):
- **Entities**: Domain models and business rules. No dependencies on outer layers.
- **Use Cases**: Application business logic. Depends on Entities only.
- **Interface Adapters**: Presenters, ViewModels, repository implementations. Depends on Use Cases and Entities.
- **Frameworks / Drivers**: UI, databases, network, platform APIs. Depends on Interface Adapters.

| File Path | CLEAN Layer | Dependency Rule Violations |
|-----------|-------------|----------------------------|
| `path/to/file.kt` | Interface Adapters | None |

If a dependency rule violation is unavoidable, include an explicit remediation plan in this table. "No violations found" is an acceptable entry only after the check has been performed.

### Test Specification

A summary pointing to the full test spec. The detailed test specification lives in a separate `test-spec.md` file (path referenced here). This section provides enough detail for the Coding Agent to write tests without reading the full test spec.

- **Test spec path**: `analysis/test-specs/HOOPLA-142-test-spec.md`

#### Unit Tests

List each unit test the Coding Agent must write, with a brief description of the assertion.

- `ResumeRepositoryTest.returnsServerPositionWhenAvailable`: asserts that `get(contentId)` returns the server value when the fake server returns a valid position.
- `ResumeRepositoryTest.fallsBackToLocalWhenServerFails`: asserts that `get(contentId)` returns the local `SharedPreferences` value when the server call throws a network exception.

#### Integration Tests

List each integration test, describing the interaction being verified.

- `PlaybackResumeIntegrationTest.fullResumeFlow`: starts a fake server, navigates to a content detail screen, triggers resume, verifies that playback begins at the server-provided position.

#### Accessibility Tests

List each accessibility test.

- `ResumeButtonAccessibilityTest.meetsMinimumTapTarget`: verifies the resume button bounds are at least 48 × 48 dp.
- `ResumeButtonAccessibilityTest.hasContentDescription`: verifies the content description is non-empty and descriptive.

#### Flag State Tests

- Flag ON: [description of what is tested when the flag is enabled].
- Flag OFF: [description of what is tested when the flag is disabled / fallback path].

### Assumptions

A numbered list of assumptions made during compilation. Each assumption must include a risk level (Low / Medium / High) and a note on what breaks if the assumption is wrong.

1. (Medium) The `ResumeRepository` interface in HOOPLA-138 will not change its method signature before this story is implemented. If it does, the `Interface Adapters` file targets will require revision.
2. (Low) The flag SDK is initialized before the playback screen is displayed. No guard code is written for uninitialized SDK state.

### Effort Estimate

Fibonacci story points and the key drivers behind the estimate.

- **Points**: 5
- **Drivers**: New repository implementation (2 pts), integration test setup with fake server (2 pts), flag wiring (1 pt). No UI changes reduce the estimate. Risk from HOOPLA-138 dependency is accounted for in the dependency section, not inflated here.

---

## Validation Rules

The following rules must be satisfied before a compiled spec is considered complete. A spec that fails any rule must be revised before being handed to the Coding Agent.

1. All sections are present and non-empty.
2. Every file path in "In Scope" resolves to a real path in the current-state model (or is marked `create` with a valid parent directory path).
3. There is at least one Gherkin scenario (AC-N) per in-scope file-level target.
4. All NFR subsections (Performance, Accessibility, Observability, Testing) contain numeric thresholds. Qualitative statements such as "should be fast" or "reasonable performance" are disqualifying.
5. The Feature Flag section is either fully populated or explicitly marked "N/A" with a justification.
6. Every file-level target has a CLEAN layer assignment.
7. No CLEAN dependency rule violations appear without an explicit remediation plan in the table.
8. The PM intent hash is present and recorded at the time the story is finalized (not at the time of implementation).

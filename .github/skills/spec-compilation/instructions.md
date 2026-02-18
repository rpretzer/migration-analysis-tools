# Skill: Spec Compilation

## Purpose

The Spec Compiler transforms human-readable PM stories into machine-consumable specifications precise enough for a Coding Agent to execute without interpretation. Every ambiguity in the input must be resolved here, grounded in codebase reality, before work begins.

---

## Compilation procedure

Follow these steps in order for every story. Do not skip steps.

### Step 1: Read the current-state model

Before writing a single line of a spec, read the current-state model for the packages the story touches. The current-state model is located at `pipeline/state/`. Read:
- The module or package containing the affected code.
- The dependency graph for that module.
- The test coverage inventory for those files.

If the current-state model does not have sufficient detail, perform targeted reads of the specific source files. Do not perform exploratory analysis at this step — that is the Codebase Analyst's role.

### Step 2: Read design tokens (UI stories only)

For any story that produces a visible screen change, read the design tokens from the Design System Server before writing the spec. Write concrete values into the spec. The Coding Agent must not look up design tokens at implementation time.

Token sources:
- Spacing scale: 4px base, 16px horizontal page padding, 12px component gap, 24px section gap.
- Typography: Caption 12sp, Body Small 14sp, Body Medium 16sp, Body Large 18sp, Title Small 20sp, Title Medium 22sp. Always sp, never dp or px.
- Colors: Primary #6366F1, Error #EF4444, Success #10B981, Secondary text #6B7280, Background #F9FAFB, Surface #FFFFFF, Text primary #121212.
- Components: Material 3 style, 12px card corner radius, 8px button/input corner radius, 48dp minimum button and input height.

### Step 3: Resolve ambiguities from code

When a story is underspecified, read the codebase to determine what the current behavior is and what the minimal change achieves the stated outcome. If the codebase resolves the ambiguity, log the assumption in `spec.md` and proceed. If the codebase does not resolve it, write `questions.md` and block the story. Guessing at intent is not permitted.

### Step 4: Name specific files

A spec that says "update the authentication module" is not valid output. A spec that says "modify `AuthRepository.kt` in `feature/auth/data/` to add token refresh logic following the pattern in `ApiClient.kt` lines 84-112" is valid. Every change target must be a specific file path that exists in the current-state model or is marked `create` with a valid parent directory.

### Step 5: Assign CLEAN layer to every file

For each file in the change targets, record which CLEAN architecture layer it belongs to and confirm the change respects the dependency rule. See CLEAN layer definitions below. A change that violates the dependency rule is flagged in `spec.md` with a required remediation before implementation proceeds.

### Step 6: Self-validate before writing

Before writing `spec.md` to disk, check:
- All required sections are present and populated.
- Every Gherkin scenario has a corresponding entry in `test-spec.md`.
- Every file-level change target maps to a real path in the current-state model.
- NFR thresholds are numeric, not qualitative.
- The feature flag section is populated or explicitly marked N/A with justification.
- The `pm_intent_hash` field is recorded.

A spec that fails this check is not written. Identify and resolve missing information first.

---

## Output files

Produce one directory per story at `pipeline/specs/{story-id}/`:

### spec.md

Required sections (in this order):

1. Story ID and title
2. PM intent hash
3. Background and scope
4. Gherkin acceptance criteria (numbered AC-1, AC-2, ...)
5. In-scope file change targets (table: file path, action, CLEAN layer)
6. Out-of-scope explicit exclusions
7. Non-functional requirements (performance, accessibility, observability, testing) — all thresholds numeric
8. Feature flag section (flag key, flag-on behavior, flag-off fallback) or marked N/A with justification
9. Dependencies (story IDs or infrastructure)
10. Assumptions (numbered, explicit)
11. Effort estimate with drivers

### context.md

Extract codebase context the Coding Agent needs without searching:
- Relevant file paths and specific sections the change touches.
- Current patterns to follow (naming conventions, DI approach, error handling style, logging format).
- Dependency graph subset scoped to the files in play.
- Pointers to existing tests that must remain passing.

### test-spec.md

Standalone test plan for the Test Agent:
- Unit tests: specific assertions, input/output pairs, edge cases, error conditions.
- Integration tests: component interactions, expected state transitions.
- Accessibility tests: automated checks and manual verification steps.
- Acceptance test mapping: which Gherkin scenario maps to which test case.

### questions.md (when needed)

Written only when ambiguity cannot be resolved from the codebase or Coach artifacts. Format:

```
Story ID: {story-id}
Questions:

Q1: [Specific question stated precisely enough for a PM to answer without technical knowledge]
    Impact if unanswered: [What cannot be produced without this answer]
    Attempted resolution: [What was read to try to resolve this]
    Route to: [Coach for PM decisions / Codebase Analyst for structural questions]
```

A story does not advance while questions.md exists and is unresolved.

---

## CLEAN layer mapping

Assign every file target to one of these four layers. Layer assignment determines which imports are permitted and which are violations.

### Domain (innermost)

Contains: entities, use cases (interactors), repository interfaces, domain exceptions, business rules.

Permitted imports: Kotlin standard library, `kotlinx.coroutines` (for `Flow` and `suspend`) only.

Violation indicators: imports from `io.ktor.*`, `app.cash.sqldelight.*`, `android.*`, `androidx.*`, `platform.*`.

Example files: `Borrow.kt`, `BorrowTitle.kt`, `BorrowRepository.kt` (interface only).

### Data

Contains: repository implementations, API clients, local data sources, DTOs, mappers, caching strategies.

Permitted imports: Domain layer, Ktor, SQLDelight, kotlinx.serialization.

Violation indicators: imports from Presentation layer, Framework layer, or `@Composable` functions.

Example files: `BorrowRepositoryImpl.kt`, `HooplaBffClient.kt`, `BorrowLocalDataSource.kt`, `BorrowDto.kt`.

### Presentation

Contains: ViewModels, state holders, UI state classes, UI events, composable functions, navigation logic.

Permitted imports: Domain layer (use cases and entities). Data layer via DI only (never import repository implementations directly). No Framework layer.

Violation indicators: imports from `Context`, `MediaDrm`, `AVContentKeySession`, or any repository implementation class.

Example files: `HomeViewModel.kt`, `HomeUiState.kt`, `HomeScreen.kt`.

### Framework (outermost)

Contains: DRM implementations, platform-specific DI wiring, push notification handlers, biometric authentication, OS media controls, app entry points.

Permitted imports: any layer.

Classification rule: any file that imports `android.media.MediaDrm`, `com.google.android.exoplayer2.drm.*`, `AVContentKeySession`, or `AVAssetResourceLoader` is a Framework-layer file. Never classify these as KMP candidates.

Example files: `WidevineProviderImpl.kt`, `KoinModules.kt`, `MainActivity.kt`.

---

## Multi-target spec patterns

### KMP story (shared module change)

- List files under `commonMain/`, `androidMain/`, and `iosMain/` as separate change targets.
- Flag any `expect/actual` pairs: both sides must appear in the file targets.
- Note which Kotlin version the project uses; `expect/actual` syntax changed in Kotlin 2.0.
- Specify the iOS XCFramework build step if the shared module is consumed by an iOS app target.

### BFF story (server-side change with client sub-story)

- Decompose into two sub-stories: one BFF story and one client story.
- The BFF story must include the response shape (JSON schema) as a required section.
- The client story depends on the BFF story and must reference the BFF response schema.
- Both stories must share an `api-contract-version` label so the Quality Gate can run contract checks.

### CMP story (compose-multiplatform UI change)

- Specify which CMP targets are in scope: Android, iOS, web (Wasm), or desktop.
- Note any components that require native interop via `UIKitView` or `AndroidView` (video player surfaces, maps, WebViews).
- Include accessibility semantics requirements from the WCAG checklist for each interactive element introduced.

---

## Grounding rules

1. Read before writing. Never write a spec from memory of a pattern or assumption about the codebase. Read the relevant files first.
2. Name files, not modules. "The auth module" is not a file target. `feature/auth/data/AuthRepositoryImpl.kt` is a file target.
3. Numeric NFRs. "The screen must load quickly" is not a NFR. "The screen must display its first frame within 1,000 ms on a 3G connection (Slow 3G throttling in Chrome DevTools), measured from the BFF response received event" is a NFR.
4. Log every assumption. An assumption not logged in `spec.md` is a silent constraint that will produce a surprise during the Quality Gate.
5. Respect the dependency rule. A spec that requires a Domain layer file to import a Data layer class is a spec that introduces a CLEAN violation. Redesign the spec before writing it.

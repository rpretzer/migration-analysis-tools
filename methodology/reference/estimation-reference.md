# Effort Estimation Reference

**Audience:** Spec Compiler agent and human reviewers.
**Purpose:** Calibration guide for Fibonacci story point estimation in the migration context. Use this reference when assigning points to stories and when reviewing estimates for consistency.

---

## 1. Fibonacci scale

| Points | Size | Meaning |
|--------|------|---------|
| 1 | Trivial | Mechanical change. No uncertainty. Reviewable in minutes. |
| 2 | Small | Well-understood, straightforward implementation. Low risk. |
| 3 | Small-medium | Mostly understood, minor unknowns. Standard implementation pattern. |
| 5 | Medium | Meaningful scope. Some design decisions. Moderate uncertainty. |
| 8 | Large | Significant scope or high uncertainty. Multiple components involved. |
| 13 | Very large | High complexity or substantial uncertainty. Should be decomposed if possible. |
| 21 | Epic-sized | Too large to estimate reliably. Must be decomposed before sprint planning. |

Stories estimated at 21 points must be decomposed into smaller stories before entering the sprint.

---

## 2. Reference stories by point value

These examples are drawn from the migration domain. Use them as calibration anchors.

### 1 point — Trivial

**Example A:** Update the `@SerialName` annotation on `BorrowResponse.dueDate` to match a renamed API field (`due_date` → `expiry_date`). One file, one line change, one test update.

**Example B:** Add a missing `contentDescription` to the Borrow button's icon. One composable file, one attribute, one screenshot test update.

**Example C:** Update the Ktor client base URL from the staging BFF to the production BFF URL in the configuration file.

---

### 2 points — Small

**Example A:** Extract a pure data class (`Title`) from a mixed-concern Android DTO to the KMP shared module. No business logic involved. Add `@Serializable` annotation. Update one import site.

**Example B:** Add a `FakeDrmProvider` implementation for use in unit tests across the shared module. Interface already exists. Pure Kotlin, no platform dependencies.

**Example C:** Add `aria-live="polite"` to the borrow confirmation message on the web client so screen readers announce the outcome.

---

### 3 points — Small-medium

**Example A:** Migrate a single repository interface and its implementation from Retrofit to Ktor. Interface already defined in the Domain layer. One endpoint. Response DTO exists. Add one unit test for the new implementation.

**Example B:** Convert a UIKit `UITableViewCell` subclass to a `@Composable` function. No state management; purely presentational. Standard Material 3 components.

**Example C:** Add a LaunchDarkly feature flag gate around an existing feature. Flag key defined in spec. Implement flag-on and flag-off paths. Add tests for both states.

---

### 5 points — Medium

**Example A:** Extract the `BorrowRepository` (interface + implementation) from the Android data layer to the KMP shared module. Replace Gson with `kotlinx.serialization`. Replace Retrofit with Ktor. Update DI wiring in both `androidMain` and the Android app module. Add unit tests for the shared implementation using a `FakeHttpClient`.

**Example B:** Implement the `HomeScreen` composable in CMP from scratch based on a BFF-provided home screen response. Includes title carousel, borrow state indicators, and section headers. State comes from `HomeViewModel` (already exists in shared module). No navigation changes.

**Example C:** Implement the WCAG remediation for the search results screen. Fixes: missing content descriptions on cover art, low-contrast metadata text, insufficient touch targets on result list items. All three platforms (Android, iOS, web).

---

### 8 points — Large

**Example A:** Create a new BFF endpoint `GET /bff/v1/home` that aggregates the existing Borrows, Recommendations, and Featured APIs into a single screen-level response. Includes error handling, response caching (5-minute TTL), and integration tests against mocked downstream services.

**Example B:** Migrate the `SearchViewModel` from the Android-only presentation layer to the KMP shared module. Replace RxJava with `StateFlow` and `Flow`. Update the Android composable to use the shared ViewModel via `collectAsStateWithLifecycle`. Add shared module unit tests. Add CMP UI tests for the search screen.

**Example C:** Implement offline borrow list access using SQLDelight. Create the borrow schema, queries, and `BorrowLocalDataSource`. Implement the offline-first repository that reads from local DB and syncs with the BFF on reconnection. Unit tests for sync logic, integration tests for DB operations.

---

### 13 points — Very large

**Example A:** Replace the Android ExoPlayer integration with a new `PlatformPlayer` abstraction. Define the `PlatformPlayer` interface in the KMP domain layer. Implement `AndroidPlayer` wrapping ExoPlayer in `androidMain`. Implement `IosPlayer` wrapping AVPlayer in `iosMain`. Thread DRM license renewal through the `DrmProvider` interface. Update all playback state management in the shared `PlayerViewModel`. End-to-end integration test on both platforms with mock DRM.

**Example B:** Full CMP migration of the title detail screen. Includes: composable implementation from design spec, `TitleDetailViewModel` extraction to shared module (replaces iOS and Android ViewModels), BFF client call (`GET /bff/v1/title/{id}`), borrow/return/hold action flows with optimistic UI, error states, offline state indicator, WCAG compliance, and automated UI tests on Android and iOS.

**Example C:** Implement the web SSR preservation layer for the initial migration phase. Retain Next.js SSR for initial page load. Hydrate with React on the client. Document integration points where Compose Wasm will eventually replace React components, without disrupting SSR in the interim.

---

### 21 points — Must decompose

**Example A:** "Migrate the entire playback module to KMP." This spans DRM (native, multiple stories), `PlayerViewModel` (shared module), player surface (native interop), playback state (shared module), and download management (shared module). Decompose into at least 5 separate stories.

**Example B:** "Build the BFF layer." Three BFF services, nine backend service integrations, data contracts for all screen-level endpoints. Decompose by BFF service and by endpoint group.

---

## 3. Estimation drivers

These factors increase or decrease the base estimate. Apply them when the reference stories above do not match the story being estimated.

| Driver | Effect | Rationale |
|--------|--------|-----------|
| **Story well-understood** | Reduce by 1 point | Confidence is high; less buffer needed. |
| **Story partially understood** | No change | Default assumption. |
| **Story poorly understood** | Increase by 2-3 points | Include investigation time; uncertainty must be priced in. |
| **Cross-platform scope** | Multiply by number of platforms | A 3-point story on one platform is 9 points if it covers Android, iOS, and web equally. |
| **DRM involvement** | Add 3 points | DRM always introduces platform complexity, testing overhead, and coordination with license servers. |
| **Existing tests to update** | Add 1 point per affected test suite | Test maintenance is real work. |
| **No existing tests (for code being changed)** | Add 2 points | Must write tests that should already exist before implementing the change. |
| **Decomposition prerequisite** | Add as separate prerequisite story | If the story cannot begin until another story extracts a mixed-layer module, the prerequisite is a separate story in the backlog, not an estimate adjustment. |
| **First example of a new pattern** | Add 2 points | Team is learning the pattern. Speed improves with repetition. |
| **LaunchDarkly flag required** | Add 1 point | Flag key creation, flag-on/flag-off paths, validation in Quality Gate. |

---

## 4. BFF vs client estimation

BFF stories are typically smaller than equivalent client stories because:
- No platform variation: one implementation serves all platforms.
- Tooling is well-understood (Ktor on JVM, unit testing with MockWebServer/MockK).
- Business logic is already server-side; BFF stories aggregate and shape, not invent.

| Story type | Typical base estimate | Notes |
|-----------|----------------------|-------|
| BFF endpoint (simple aggregation, 2-3 upstream calls) | 3-5 points | Standard Ktor route, response shaping, error handling, test. |
| BFF endpoint (complex orchestration, conditional logic) | 5-8 points | Multiple paths, caching strategy, retry logic. |
| BFF endpoint + new backend service feature | 8-13 points | Backend change is a sub-story or dependency; estimate separately. |
| Client KMP extraction (one repository/use case) | 3-5 points | Well-understood pattern after first few stories. |
| Client CMP screen (new, from spec) | 5-8 points | Composable implementation, ViewModel wiring, tests. |
| Client CMP screen (migration from existing native) | 8-13 points | Port logic, verify behavior parity, update tests. |

---

## 5. Migration-specific estimation adjustments

### When source code is unavailable (APK/IPA only)

Add 2 points to every story that touches the migrated module. Decompiled code contains artifacts that make behavior analysis uncertain. The implementing engineer must verify behavior before and after the change.

Mark all such stories with the label `apk-only-analysis` so reviewers know the estimate includes discovery time.

### After the first sprint

The first sprint typically runs at 50% of steady-state velocity. This is expected: teams spend time on environment setup, pattern establishment, and calibration. Do not commit to client deadlines based on first-sprint velocity.

Calibrate velocity after 3 full sprints. Use the 3-sprint average as the planning baseline.

### Sprint velocity adjustment for team composition

| Team experience with KMP/Compose | Velocity adjustment |
|----------------------------------|----------------------|
| Experienced (2+ prior migrations) | Baseline (100%) |
| Familiar (1 prior migration or extensive Compose experience) | 80% for sprints 1-3, then 95% |
| Learning (no prior KMP experience, standard Android background) | 60% for sprints 1-3, then 80% |

---

## 6. Anti-patterns in estimation

### Padding for uncertainty

**Wrong approach:** Add 2 extra points to every story "just in case."

**Correct approach:** Use the Fibonacci scale. If uncertainty is high, pick the next Fibonacci number up. The scale itself encodes uncertainty — a 5-point story has more inherent uncertainty buffer than a 3-point story. Adding flat padding on top of a Fibonacci estimate double-counts uncertainty.

### Averaging across team members

**Wrong approach:** Average individual estimates (3, 5, 8) to get 5.3, round to 5.

**Correct approach:** Use planning poker. Discuss the outliers (the 3 and the 8). The outlier estimates usually surface either a missed complexity or a mistaken assumption. Reach consensus on a single Fibonacci number that the whole team accepts.

### Estimating tasks, not outcomes

**Wrong approach:** "This task will take 8 hours, so it is 8 points."

**Correct approach:** Points measure relative size and complexity, not time. A 1-point story for a junior developer may take 3 hours; for a senior developer, 30 minutes. The point value is the same because the story's complexity is the same. Teams convert points to time using their own calibrated velocity.

### Estimating without reading the spec

**Wrong approach:** Estimate from the story title alone.

**Correct approach:** Estimates must be made with the compiled spec (`pipeline/specs/{story-id}/spec.md`) visible. The spec includes file-level change targets, test requirements, and NFRs that significantly affect the estimate.

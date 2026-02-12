# Roadmap

Every item below is derived from a specific finding in the analysis. Cross-references point to the source document and finding number.

---

## Dependency flow

Items within a phase can run in parallel unless a dependency arrow connects them. Items in Phase 1 depend on Phase 0 foundations completing first. Items in Phase 2 depend on the corresponding Phase 1 workstream stabilising.

```
Phase 0                          Phase 1                           Phase 2
───────                          ───────                           ───────
0.1 Assessment (done) ──────►
0.2 Rotate credentials
0.3 Observability baseline ──►   1.4 Coroutines ──────────────►    2.6 Advanced observability
0.4 WCAG Critical fixes ────►    1.9 WCAG High fixes ──────────►   2.7 WCAG backlog
0.5 Hilt foundation ────────►    1.4 Coroutines ──►  1.5 Repos ─►  2.1 ViewModels wave 2
                                 1.6 ViewModels w1 ──────────────►  2.2 Compose (leaf)  ─► 2.3 Compose (core)
                                 1.7 Room (main) ────────────────►  2.5 Room (:Downloads)
                                 1.8 Nav Component ──────────────►  2.2 Compose (leaf)
0.1 Assessment (done) ──────►    1.1 KMP: bean/ ─────────────────►  2.4 KMP wave 2
                                 1.2 KMP: webservices/
                                 1.3 KMP: auth/
                                                                   2.8 Leanback / TV
                                                                   2.9 Performance
```

---

## Phase 0 – Analysis & Foundations

Assessment completion, security triage, observability baseline, and the architectural prerequisites that Phase 1 depends on.

| # | Item | Description | Success Criteria | Dependencies | Timeframe | Risk |
|---|------|-------------|-----------------|--------------|-----------|------|
| 0.1 | Assessment complete | Structure map, module classifications, WCAG audit, and MVVM architectural audit are documented and reviewed by the team. | All files in `analysis/` signed off. Assumptions in ANALYSIS_LOG Entry 1 confirmed or updated. | None | Done | — |
| 0.2 | Rotate exposed credentials | Google Maps API key, Branch.io live and test keys are embedded in the production manifest in plain text. Dev/test hostnames on `TestEbookReaderActivity` should be stripped or gated. | Keys rotated on provider side. New keys injected via build-time config, not hardcoded. Dev activity removed or restricted to debug builds. | 0.1 | Sprint 1 | Low |
| 0.3 | Observability baseline | Add structured logging to the six "native refactor / observability" modules identified in MODULE_CLASSIFICATIONS: `audio/`, `video/`, `download/`, `dash/`, `playback/`, `ebook/server/`. Cover state transitions, error events, and critical-path latency. | Every playback state change, every download lifecycle event, every DRM license request/renewal, and every ebook-server request produces a structured log entry. Crash reports (Bugsnag) include content ID and playback state as breadcrumbs. | 0.1 | Sprints 1–3 | Medium — touches six packages and two separate processes (`:AudioPlayback`, `:Downloads`) |
| 0.4 | WCAG Critical + Phase-0 High fixes | Fix the three issues prioritised as "before next release" in WCAG_AUDIT: (a) replace all 102+ `pt` font sizes with `sp`, (b) add `contentDescription` to browse-card icons and cover art, (c) fix the label/hint pattern across the 13 advanced-search fields. | (a) Zero `pt` text sizes remain in layout files. (b) TalkBack announces content type and availability on every browse card. (c) Advanced search fields retain their label announcement when the user starts typing. | 0.1 | Sprints 1–2 | Low — mechanical changes, no logic affected |
| 0.5 | Hilt DI foundation | Wire `FrameworkService` as a Hilt `@Singleton` module. Annotate `BaseActivity` and `BaseFragment` with `@AndroidEntryPoint`. Inject `FrameworkService` into both base classes, replacing the `FrameworkServiceFactory.getInstance()` calls in them. Do **not** touch individual controllers or tasks yet — that is Phase 1. | App launches and all existing screens function. `BaseActivity` and `BaseFragment` receive `FrameworkService` via `@Inject`. No call to `FrameworkServiceFactory` remains in the two base classes. | 0.1 | Sprints 1–2 | Medium — first DI change; smoke-test surface is the entire app |
| 0.6 | Test baseline | Instrument CI to measure unit and integration test coverage per package. Establish the current baseline (expected: near zero for app-owned code). Define the minimum acceptable thresholds per module that will be enforced going forward. | Coverage report generated on every PR. Baseline numbers documented. Target thresholds agreed by the team. | 0.1 | Sprint 1 | Low |

---

## Phase 1 – KMP and Modernization

Shared-module extraction, async-layer replacement, Repository and ViewModel introduction, Room migration, and the WCAG and UI fixes that require the Phase 0 foundations.

### 1A — KMP shared module (three workstreams, can run in parallel)

| # | Item | Description | Success Criteria | Dependencies | Timeframe | Risk |
|---|------|-------------|-----------------|--------------|-----------|------|
| 1.1 | KMP: bean/ data models | Extract all 132 data-model classes from `bean/` into a KMP shared module. Convert to Kotlin data classes. Replace implicit Gson contracts with explicit `@SerializedName` annotations (or kotlinx.serialization equivalents). Confirm `v4/` sub-package is the only active API version with the backend team. | Shared module compiles for JVM and iOS targets. Android app resolves all bean types from the shared module. No Gson dependency in the shared module itself. | 0.1 (v4/ confirmation) | Sprints 3–6 | Medium — Gson → kotlinx.serialization conversion may surface undocumented field mappings |
| 1.2 | KMP: webservices/ HTTP client | Extract OkHttp client setup, all manager interfaces, and the ~45 response parsers. OkHttp is already KMP-compatible. Replace Gson serialisation with kotlinx.serialization. Audit `GatewayWSManager` for dead endpoints and remove them before porting. | Shared HTTP client compiles for both targets. Android app calls all existing API endpoints through the shared module with no behaviour change. Dead endpoints removed. | 1.1 (beans must be in shared module first — parsers return bean types) | Sprints 4–7 | High — largest extraction; serialisation migration touches every parser |
| 1.3 | KMP: auth/ token management | Port `AuthenticationManagerImpl` logic to the shared module. Define a `TokenStore` interface in shared; Android provides the implementation backed by SharedPreferences. Inject the HTTP client from 1.2. | Authentication flow (token validation, refresh, account sync) works end-to-end through the shared module on Android. `TokenStore` interface is implemented and wired. | 1.2 (needs shared HTTP client) | Sprints 6–8 | Medium — token refresh is a security-sensitive flow; needs thorough regression |

### 1B — Android modernization (sequential dependencies within this group)

| # | Item | Description | Success Criteria | Dependencies | Timeframe | Risk |
|---|------|-------------|-----------------|--------------|-----------|------|
| 1.4 | AsyncTask → Coroutines | Replace `AsyncTaskManager` and `ControllerWSAsyncTask` with coroutine-based equivalents exposing the same contract. Migrate `ControllerWSAsyncTask` subclasses in the top-10 controllers to suspend functions. Leave the remaining controllers on the old path temporarily — they will migrate with their ViewModels in 1.6 / 2.1. | `task/v2/AsyncTaskManager` and `ControllerWSAsyncTask` are no longer used by the top-10 controllers. No `AsyncTask.THREAD_POOL_EXECUTOR` calls in migrated paths. Top-10 controller flows pass regression. | 0.5 (Hilt must be in place so coroutines can receive injected deps) | Sprints 3–5 | High — async migration is the widest-impact single change; regression surface is large |
| 1.5 | Repository layer (wave 1) | Introduce Repository interfaces for the five highest-traffic domains: History, Policy, Patron, Playback, Search. Each Repository owns its network calls (via shared webservices module or existing managers) and local-DB reads. Controllers / ViewModels depend only on the interface. | Five Repository interfaces exist with implementations. Top-10 controllers no longer construct `HttpRequest` objects directly. Unit tests cover each Repository with a mocked HTTP client. | 1.4 (suspend-function signatures needed), 1.2 preferred (shared HTTP client) | Sprints 5–6 | Medium |
| 1.6 | ViewModels — wave 1 | Introduce ViewModels for the four highest-traffic screens: Home, TitleDetails, Search, AudiobookPlayer. Move state fields and coroutine launches into the ViewModel. Fragments observe via `LiveData`. Delete the corresponding Controller + Callback interfaces for these four screens. | Four screens survive rotation without data loss. No `onActive` / `onInactive` calls remain for these screens. Corresponding Controller classes are removed. | 1.4, 1.5 | Sprints 6–8 | High — first full MVVM screens; establishes the pattern the rest of the app will follow |
| 1.7 | Room migration (main-process tables) | Migrate `LocalBookmarkTableHelper`, `LocalPlaybackPositionTableHelper`, and `PatronSQLiteOpenHelper` to Room entities and DAOs. Wire through the Repositories from 1.5. Keep the `:Downloads` process table on raw SQLite for now — that is Phase 2. | Three tables served by Room. Existing data survives migration (Room migration scripts in place). No synchronous `getWritableDatabase` calls remain for these tables. | 1.5 (Repositories own DB access) | Sprints 6–8 | Medium — schema migration scripts are the main risk |
| 1.8 | Navigation Component adoption | Replace the current manual fragment-transaction navigation with AndroidX Navigation Component. Define a nav graph covering all screens currently in `HomeActivity`. | All fragments reachable from the home screen are in the nav graph. Back-stack behaviour is unchanged for the user. | 0.5 | Sprints 3–5 | Medium — navigation behaviour regressions are hard to catch in automated tests |

### 1C — WCAG and legacy UI

| # | Item | Description | Success Criteria | Dependencies | Timeframe | Risk |
|---|------|-------------|-----------------|--------------|-----------|------|
| 1.9 | WCAG Phase 1 fixes | Address the eight High-severity findings in WCAG_AUDIT that were not covered in Phase 0: contrast colours, tap-target sizes, caption toggle on video player, `SimpleRatingBar` and `FavoriteButton` accessibility delegates, and highlight-colour descriptions. | All eight findings resolved. Manual TalkBack smoke-test passes on audiobook player, video player, browse cards, and ebook highlight menu. | 0.4 | Sprints 3–4 | Low |
| 1.10 | ui8/ consolidation | Audit the 10 classes in `ui8/` for reachability from the current navigation graph. Delete any that are unreachable. Migrate any live screens into the main `ui/` package. | Dead code removed. No live screen references `ui8/`. | 0.1 | Sprint 3 | Low |

---

## Phase 2 – Optimization & Advanced Architecture

Remaining screen migrations, Compose, deeper KMP extraction, advanced observability, TV, and performance.

| # | Item | Description | Success Criteria | Dependencies | Timeframe | Risk |
|---|------|-------------|-----------------|--------------|-----------|------|
| 2.1 | ViewModels — wave 2 | Extend the ViewModel + coroutines + Repository pattern established in 1.6 to the remaining 55+ screens. Run in batches of 8–10 screens per sprint, grouped by feature area. | All Controller classes and Callback interfaces are deleted. Zero `onActive` / `onInactive` calls remain in the codebase. `FrameworkServiceFactory` has zero call sites. | 1.6 | Sprints 9–14 | Medium — volume is large but the pattern is proven |
| 2.2 | Jetpack Compose — leaf screens | Migrate leaf screens (Settings, Help, Registration, AcceptPolicy) to Compose. These screens have simple state and few navigation edges — good candidates to validate the Compose + ViewModel integration before touching high-traffic screens. | Four screens rendered in Compose. No legacy Fragment/View code remains for these screens. | 1.6, 1.8 | Sprints 9–11 | Medium — first Compose screens; establishes design-system tokens and theming |
| 2.3 | Jetpack Compose — core screens | Migrate Home, Browse, TitleDetails, and Search to Compose. These are the highest-traffic screens and the ones users interact with most. | Core content screens rendered in Compose. Performance regression test (frame rate, startup) passes. | 2.2 (Compose patterns proven), 2.1 (ViewModels for these screens stable) | Sprints 12–17 | High — user-facing; design must match current experience exactly |
| 2.4 | KMP wave 2 | After coroutines are in place across the app (2.1), re-evaluate the pure-logic subset of `controller/` for KMP extraction. Also extract `util/` validators (email, domain, regex) and date utilities. | Identified logic is running in the shared module on Android. Unit-test coverage ≥ 80 % for extracted code. | 1.1–1.3 (shared module exists), 2.1 (controllers are coroutine-native) | Sprints 12–14 | Medium — requires careful boundary-drawing to avoid re-coupling |
| 2.5 | Room migration — `:Downloads` process | Migrate the download-queue and renew tables currently in `DownloadSQLiteHelper` and `RenewService`. Room's multi-process invalidation is limited; evaluate whether a single shared database file with explicit locking or a file-based queue is the right approach. | Downloads and renewals read/write through Room (or an agreed alternative). No data loss on upgrade. Integration tests cover the download lifecycle end-to-end. | 1.7 (Room migration pattern proven) | Sprints 11–12 | High — multi-process DB access; race conditions are likely during development |
| 2.6 | Advanced observability | Build on the structured logging from 0.3. Add distributed trace spans for the full pre-playback sequence (geo-check → license fetch → player init → first audio/frame). Define an error-category taxonomy (network, DRM, timeout, auth) and tag every crash report. Produce a metrics dashboard (buffering rate, download failure rate, seek latency). | Trace spans are visible in the observability backend for every playback start. Error categories are attached to every Bugsnag report. Dashboard exists with at least five key metrics. | 0.3 | Sprints 10–12 | Medium — depends on observability-backend tooling available to the team |
| 2.7 | WCAG Phase 2 fixes | Address the four Medium-severity findings deferred from the WCAG audit: explicit focus ordering on forms, `touch_interceptor` focus fix, SeekBar value announcements, and the `strings.xml` error-message audit. Also verify ebook page-turn gesture alternatives (2.5.1). | All Medium findings resolved. Full TalkBack walkthrough of advanced search, audiobook player, and ebook reader passes. | 1.9 | Sprints 10–11 | Low |
| 2.8 | Leanback / TV modernization | The app ships a full Leanback TV experience (8 activities, custom presenters, TV-specific controllers). This is a distinct UI paradigm and should be scoped as its own workstream. Evaluate whether Compose TV or continued Leanback is the target. | TV experience is feature-complete on the chosen framework. At least the home, search, and playback screens are migrated. | 2.1 (TV-screen ViewModels stable) | Sprints 12–15 | High — TV testing requires dedicated hardware or emulators; limited regression coverage |
| 2.9 | Performance optimisation | Profile APK size (currently 12 MB), app startup time, and memory usage. Address the top findings (likely: unused native libs in four architectures, bundled-but-unused Dagger, Compose-era asset optimisation). | APK size reduced by a measurable amount. Cold-start time measured and a target established. No OOM crashes in playback stress tests. | 2.3 (Compose migration changes asset pipeline) | Sprints 16–17 | Low — profiling-driven; scope adjusts to findings |

---

## Cross-cutting constraints

- **Dagger is bundled but wired to nothing.** Do not resurrect it. Hilt (which wraps Dagger 2 but with zero boilerplate) is the chosen DI framework for 0.5 onward.
- **Kotlin coroutines runtime is already on the classpath.** No new dependency is needed for 1.4 — just the usage.
- **The `:AudioPlayback` and `:Downloads` processes share no in-memory state with the main process.** Any refactor that moves data access into Repositories must account for this boundary. Room's multi-process invalidation does not cover it automatically.
- **The ebook reader (WebView + local Jetty server + JS bridge) is the most complex single subsystem (~80 files).** It is deliberately excluded from the Compose and ViewModel migrations until Phase 2 is well underway. Treat it as a standalone investigation if and when the team has capacity.

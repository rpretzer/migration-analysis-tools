# Jira Import

Stories, tasks, and bugs generated from the analysis, formatted for Jira CSV import or manual copy-paste.

## Format Key

| Field | Values |
|-------|--------|
| Issue Type | Epic, Story, Task, Bug |
| Phase | 0, 1, 2 |
| Labels | kmp, accessibility, refactor, observability, testing, architecture, modernization, compose, room, navigation, performance, security |

---

## Epic index

| Epic Key | Epic Name | Labels | Phase(s) |
|----------|-----------|--------|----------|
| E-A | KMP Shared Module | kmp | 1, 2 |
| E-B | Android Modernization | modernization, architecture | 1, 2 |
| E-C | Observability and Refactoring | observability, refactor | 0, 2 |
| E-D | Accessibility | accessibility | 0, 1, 2 |
| E-E | Test and Architecture Foundations | testing, architecture, security | 0 |

---

## Epic entries

---

**Issue Type:** Epic
**Summary:** KMP Shared Module
**Description:** Extract data models, HTTP client, auth, and selected business logic into a Kotlin Multiplatform shared module for Android and iOS reuse. Covers roadmap items 1.1, 1.2, 1.3, and 2.4.
**Story Points:** 34
**Labels:** kmp
**Component / Module:** shared-module
**Phase:** 1, 2
**Supporting Docs:** analysis/MODULE_CLASSIFICATIONS.md, docs/ROADMAP.md §Phase 1A, docs/CRITICAL_PATH_ANALYSIS.md §1

---

**Issue Type:** Epic
**Summary:** Android Modernization
**Description:** Replace AsyncTask with coroutines, introduce Repositories and ViewModels across all screens, migrate to Room and Navigation Component, adopt Jetpack Compose, modernize the TV experience, and optimise performance. Covers roadmap items 1.4–1.8, 1.10, 2.1–2.3, 2.5, 2.8, 2.9.
**Story Points:** 148
**Labels:** modernization, architecture
**Component / Module:** app
**Phase:** 1, 2
**Supporting Docs:** analysis/ARCHITECTURE_AUDIT.md, docs/ROADMAP.md §Phase 1B and §Phase 2, docs/CRITICAL_PATH_ANALYSIS.md §1

---

**Issue Type:** Epic
**Summary:** Observability and Refactoring
**Description:** Establish structured logging across six modules and two processes, then add distributed tracing, error taxonomy, and a metrics dashboard. Covers roadmap items 0.3 and 2.6.
**Story Points:** 16
**Labels:** observability, refactor
**Component / Module:** audio, video, download, dash, playback, ebook/server
**Phase:** 0, 2
**Supporting Docs:** analysis/MODULE_CLASSIFICATIONS.md, docs/ROADMAP.md §0.3 and §2.6

---

**Issue Type:** Epic
**Summary:** Accessibility
**Description:** Remediate all WCAG 2.1 AA findings across three priority tiers: Critical (Phase 0), High (Phase 1), and Medium (Phase 2). Covers roadmap items 0.4, 1.9, and 2.7.
**Story Points:** 15
**Labels:** accessibility
**Component / Module:** ui, ui/widget, layout resources
**Phase:** 0, 1, 2
**Supporting Docs:** analysis/WCAG_AUDIT.md, docs/ROADMAP.md §0.4, §1.9, §2.7

---

**Issue Type:** Epic
**Summary:** Test and Architecture Foundations
**Description:** Rotate exposed credentials, wire Hilt DI into the app's base classes, and establish CI test-coverage measurement and enforcement. Covers roadmap items 0.2, 0.5, and 0.6.
**Story Points:** 10
**Labels:** testing, architecture, security
**Component / Module:** app, ci
**Phase:** 0
**Supporting Docs:** analysis/ARCHITECTURE_AUDIT.md §Finding 1, docs/ROADMAP.md §Phase 0, analysis/PROJECT_STRUCTURE.md §Security

---

## Story entries — Epic E-E: Test and Architecture Foundations (Phase 0)

---

**Issue Type:** Story
**Summary:** Rotate exposed credentials and harden manifest
**Epic Link:** E-E — Test and Architecture Foundations
**Description:** Google Maps API key, Branch.io live and test keys are hardcoded in AndroidManifest.xml. TestEbookReaderActivity exposes dev hostnames in production. Remove all keys from the manifest, inject via build-time config, rotate on the provider side, and gate the test activity to debug builds. See stories/E-1_Rotate_Credentials.md for full acceptance criteria.
**Story Points:** 2
**Labels:** security, architecture
**Component / Module:** app, manifest
**Phase:** 0
**Supporting Docs:** analysis/PROJECT_STRUCTURE.md §Security observations

---

**Issue Type:** Story
**Summary:** Wire Hilt DI foundation into BaseActivity and BaseFragment
**Epic Link:** E-E — Test and Architecture Foundations
**Description:** Replace FrameworkServiceFactory.getInstance() calls in BaseActivity and BaseFragment with Hilt @Inject fields. Declare FrameworkService as a @Singleton Hilt module. Do not touch individual controllers — that is Phase 1. See stories/E-2_Hilt_DI_Foundation.md for full acceptance criteria.
**Story Points:** 5
**Labels:** architecture
**Component / Module:** app, service/factory, ui/activity, ui/fragment
**Phase:** 0
**Supporting Docs:** analysis/ARCHITECTURE_AUDIT.md §Finding 1

---

**Issue Type:** Story
**Summary:** Establish CI test-coverage baseline and define per-module thresholds
**Epic Link:** E-E — Test and Architecture Foundations
**Description:** Instrument CI to measure unit and integration test coverage per package. Document the baseline (expected near-zero for app code). Define per-module minimum thresholds. Configure CI to fail on threshold violations. Verify coverage works on the KMP shared module. See stories/E-3_Test_Coverage_Baseline.md for full acceptance criteria.
**Story Points:** 3
**Labels:** testing
**Component / Module:** ci, app
**Phase:** 0
**Supporting Docs:** docs/ROADMAP.md §0.6

---

## Story entries — Epic E-C: Observability and Refactoring (Phase 0 + Phase 2)

---

**Issue Type:** Story
**Summary:** Establish structured logging baseline across six modules
**Epic Link:** E-C — Observability and Refactoring
**Description:** Add structured log entries for playback state transitions, download lifecycle events, DRM license events, and ebook-server requests across audio/, video/, download/, dash/, playback/, and ebook/server/. Wire Bugsnag breadcrumbs with content ID and playback state. Ensure logs from all three processes (Main, :AudioPlayback, :Downloads) are aggregated. See stories/C-1_Observability_Baseline.md for full acceptance criteria.
**Story Points:** 8
**Labels:** observability, refactor
**Component / Module:** audio, video, download, dash, playback, ebook/server
**Phase:** 0
**Supporting Docs:** analysis/MODULE_CLASSIFICATIONS.md §Native refactor / observability

---

**Issue Type:** Story
**Summary:** Advanced observability: trace spans, error taxonomy, and metrics dashboard
**Epic Link:** E-C — Observability and Refactoring
**Description:** Add distributed trace spans for the pre-playback sequence (geo-check → license fetch → player init → first frame). Define an error-category taxonomy (network, DRM, timeout, auth) and tag every Bugsnag report. Create a metrics dashboard with buffering rate, download failure rate, seek latency, DRM renewal success rate, and playback-start p95 latency. See stories/C-2_Advanced_Observability.md for full acceptance criteria.
**Story Points:** 8
**Labels:** observability
**Component / Module:** audio, video, dash, playback
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.6, stories/C-1_Observability_Baseline.md (prerequisite)

---

## Story entries — Epic E-D: Accessibility (Phase 0, 1, 2)

---

**Issue Type:** Story
**Summary:** WCAG Critical fixes: font scaling, browse-card descriptions, advanced-search labels
**Epic Link:** E-D — Accessibility
**Description:** Replace 102+ hardcoded pt font sizes with sp-based dimen resources and create a typography style sheet. Add dynamic contentDescription to browse-card icons and cover art. Fix the label/hint pattern on all 13 advanced-search fields. See stories/D-1_WCAG_Critical_Fixes.md for full acceptance criteria.
**Story Points:** 5
**Labels:** accessibility
**Component / Module:** layout resources, ui/fragment
**Phase:** 0
**Supporting Docs:** analysis/WCAG_AUDIT.md §1, §2, §5

---

**Issue Type:** Story
**Summary:** WCAG Phase 1 fixes: contrast, tap targets, captions, custom-view accessibility, highlight colours
**Epic Link:** E-D — Accessibility
**Description:** Replace semi-transparent text colours with opaque theme tokens meeting WCAG contrast ratios. Increase tap targets on audiobook controls and bookmark delete to 48x48 dp. Add a caption-toggle button to the video player. Implement accessibility on SimpleRatingBar and FavoriteButton. Replace highlight-colour generic descriptions with colour names. See stories/D-2_WCAG_Phase1_Fixes.md for full acceptance criteria.
**Story Points:** 5
**Labels:** accessibility
**Component / Module:** ui/widget, layout resources, audiobook_player, video_player
**Phase:** 1
**Supporting Docs:** analysis/WCAG_AUDIT.md §3, §4, §6, §7, §8

---

**Issue Type:** Story
**Summary:** WCAG Phase 2 fixes: focus ordering, SeekBar announcements, error messages, gesture alternatives
**Epic Link:** E-D — Accessibility
**Description:** Add explicit focus ordering to multi-element forms. Fix touch_interceptor focus consumption. Add dynamic value announcements to audiobook and ebook SeekBars. Audit strings.xml for generic error messages and replace with specific, actionable messages. Verify ebook page-turn gesture alternatives. See stories/D-3_WCAG_Phase2_Fixes.md for full acceptance criteria.
**Story Points:** 5
**Labels:** accessibility
**Component / Module:** layout resources, ui/fragment, task/v2
**Phase:** 2
**Supporting Docs:** analysis/WCAG_AUDIT.md §9, §10, §11, §12

---

## Story entries — Epic E-A: KMP Shared Module (Phase 1 + Phase 2)

---

**Issue Type:** Story
**Summary:** Extract bean/ data models into KMP shared module
**Epic Link:** E-A — KMP Shared Module
**Description:** Convert all 132 data-model classes in bean/ to Kotlin data classes in a KMP shared module. Replace implicit Gson contracts with explicit kotlinx.serialization annotations. Confirm v4/ is the only active API version. Verify compilation for JVM and iOS targets. See stories/A-1_KMP_Extract_Bean_Models.md for full acceptance criteria.
**Story Points:** 8
**Labels:** kmp
**Component / Module:** bean
**Phase:** 1
**Supporting Docs:** analysis/MODULE_CLASSIFICATIONS.md §KMP candidates — bean/, docs/ROADMAP.md §1.1

---

**Issue Type:** Story
**Summary:** Extract webservices/ HTTP client and parsers into KMP shared module
**Epic Link:** E-A — KMP Shared Module
**Description:** Extract OkHttp client setup, all manager interfaces, and ~45 response parsers into the shared module. Audit GatewayWSManager for dead endpoints and remove them. Replace Gson with kotlinx.serialization. Verify compilation for both targets. See stories/A-2_KMP_Extract_Webservices.md for full acceptance criteria.
**Story Points:** 13
**Labels:** kmp
**Component / Module:** webservices
**Phase:** 1
**Supporting Docs:** analysis/MODULE_CLASSIFICATIONS.md §KMP candidates — webservices/, docs/ROADMAP.md §1.2, docs/CRITICAL_PATH_ANALYSIS.md §6 Risk 1

---

**Issue Type:** Story
**Summary:** Port auth/ token management into KMP shared module
**Epic Link:** E-A — KMP Shared Module
**Description:** Port AuthenticationManagerImpl logic to the shared module. Define a TokenStore interface; provide the Android SharedPreferences-backed implementation. Wire the shared HTTP client. Verify token validation, refresh, and account sync end-to-end. See stories/A-3_KMP_Extract_Auth.md for full acceptance criteria.
**Story Points:** 5
**Labels:** kmp, security
**Component / Module:** auth
**Phase:** 1
**Supporting Docs:** analysis/MODULE_CLASSIFICATIONS.md §KMP candidates — auth/, docs/ROADMAP.md §1.3

---

**Issue Type:** Story
**Summary:** KMP wave 2: extract controller logic and util/ validators
**Epic Link:** E-A — KMP Shared Module
**Description:** After all controllers are coroutine-native (wave-2 ViewModels stable), identify and extract the pure-logic subset into the shared module. Extract util/ validators (email, domain, regex, date). Achieve 80 % unit-test coverage. Publish a boundary document. See stories/A-4_KMP_Wave2_Extract_Logic.md for full acceptance criteria.
**Story Points:** 8
**Labels:** kmp
**Component / Module:** controller, util
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.4, analysis/MODULE_CLASSIFICATIONS.md §KMP candidates

---

## Story entries — Epic E-B: Android Modernization (Phase 1 + Phase 2)

---

**Issue Type:** Story
**Summary:** Replace AsyncTask with coroutines in top-10 controllers
**Epic Link:** E-B — Android Modernization
**Description:** Replace AsyncTaskManager and ControllerWSAsyncTask usage in the top-10 controllers with coroutine-based equivalents. Convert network calls to suspend functions. Write a coroutine-pattern document. Verify all flows pass regression. See stories/B-1_Coroutines_Top10_Controllers.md for full acceptance criteria.
**Story Points:** 13
**Labels:** modernization, architecture
**Component / Module:** controller, task/v2
**Phase:** 1
**Supporting Docs:** analysis/ARCHITECTURE_AUDIT.md §Finding 4, docs/ROADMAP.md §1.4, docs/CRITICAL_PATH_ANALYSIS.md §1 (critical path)

---

**Issue Type:** Story
**Summary:** Introduce Repository layer for five domains
**Epic Link:** E-B — Android Modernization
**Description:** Define Repository interfaces for History, Policy, Patron, Playback, and Search. Implement each, routing calls through the shared HTTP client or the existing manager layer. Update top-10 controllers to use Repositories. Write unit tests per Repository. See stories/B-2_Repository_Layer.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization, architecture
**Component / Module:** controller, webservices, sqlite
**Phase:** 1
**Supporting Docs:** analysis/ARCHITECTURE_AUDIT.md §Finding 5, docs/ROADMAP.md §1.5, docs/CRITICAL_PATH_ANALYSIS.md §1 (critical path)

---

**Issue Type:** Story
**Summary:** Introduce ViewModels for wave-1 screens (Home, TitleDetails, Search, AudiobookPlayer)
**Epic Link:** E-B — Android Modernization
**Description:** Introduce ViewModels for the four highest-traffic screens. Move state and coroutine launches into ViewModels. Expose state via LiveData/StateFlow. Define sealed UiState classes. Delete the four corresponding Controller and Callback classes. See stories/B-3_ViewModels_Wave1.md for full acceptance criteria.
**Story Points:** 13
**Labels:** modernization, architecture
**Component / Module:** controller, ui/activity, ui/fragment
**Phase:** 1
**Supporting Docs:** analysis/ARCHITECTURE_AUDIT.md §Finding 2, docs/ROADMAP.md §1.6, docs/CRITICAL_PATH_ANALYSIS.md §1 (critical path)

---

**Issue Type:** Story
**Summary:** Migrate main-process SQLite tables to Room
**Epic Link:** E-B — Android Modernization
**Description:** Create Room entities and DAOs for bookmarks, playback positions, and patron data. Write migration scripts to preserve existing data. Wire through Repositories. Remove all synchronous getWritableDatabase() calls for the three tables. See stories/B-4_Room_Migration_Main.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization, room
**Component / Module:** sqlite, dao
**Phase:** 1
**Supporting Docs:** analysis/ARCHITECTURE_AUDIT.md §Finding 6, docs/ROADMAP.md §1.7

---

**Issue Type:** Story
**Summary:** Adopt Navigation Component for HomeActivity fragment graph
**Epic Link:** E-B — Android Modernization
**Description:** Define a nav graph covering all fragments reachable from HomeActivity. Replace manual fragment transactions. Verify back-stack behaviour and deep-link resolution. See stories/B-5_Navigation_Component.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization, navigation
**Component / Module:** ui/activity, ui/fragment
**Phase:** 1
**Supporting Docs:** docs/ROADMAP.md §1.8

---

**Issue Type:** Story
**Summary:** Audit and consolidate ui8/ legacy package
**Epic Link:** E-B — Android Modernization
**Description:** Audit all 10 classes in ui8/ for reachability. Delete unreachable classes. Migrate reachable screens into ui/. Verify no references to ui8/ remain. See stories/B-6_UI8_Consolidation.md for full acceptance criteria.
**Story Points:** 3
**Labels:** modernization, refactor
**Component / Module:** ui8
**Phase:** 1
**Supporting Docs:** analysis/MODULE_CLASSIFICATIONS.md §Native modernize — ui8/, docs/ROADMAP.md §1.10

---

**Issue Type:** Story
**Summary:** ViewModels wave 2: planning and batch orchestration
**Epic Link:** E-B — Android Modernization
**Description:** Assign all 55+ remaining screens to six batches grouped by feature area. Get architect approval on sequencing. Confirm the pattern document from wave 1 is sufficient. Set up a completion tracker. See stories/B-7_ViewModels_Wave2_Parent.md for full acceptance criteria.
**Story Points:** 3
**Labels:** modernization, architecture
**Component / Module:** controller, ui
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.1, stories/B-3_ViewModels_Wave1.md (pattern source)

---

**Issue Type:** Story
**Summary:** ViewModels wave 2: batch 1
**Epic Link:** E-B — Android Modernization
**Description:** Introduce ViewModels for the ~9 screens in batch 1 (defined in B-7). Delete corresponding Controllers and Callbacks. Verify rotation survival and regression. See stories/B-8_ViewModels_Wave2_Batch1.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization
**Component / Module:** controller, ui
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.1, stories/B-7_ViewModels_Wave2_Parent.md

---

**Issue Type:** Story
**Summary:** ViewModels wave 2: batch 2
**Epic Link:** E-B — Android Modernization
**Description:** Introduce ViewModels for the ~9 screens in batch 2 (defined in B-7). Delete corresponding Controllers and Callbacks. Verify rotation survival and regression. See stories/B-9_ViewModels_Wave2_Batch2.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization
**Component / Module:** controller, ui
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.1, stories/B-7_ViewModels_Wave2_Parent.md

---

**Issue Type:** Story
**Summary:** ViewModels wave 2: batch 3
**Epic Link:** E-B — Android Modernization
**Description:** Introduce ViewModels for the ~9 screens in batch 3 (defined in B-7). Delete corresponding Controllers and Callbacks. Verify rotation survival and regression. See stories/B-10_ViewModels_Wave2_Batch3.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization
**Component / Module:** controller, ui
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.1, stories/B-7_ViewModels_Wave2_Parent.md

---

**Issue Type:** Story
**Summary:** ViewModels wave 2: batch 4
**Epic Link:** E-B — Android Modernization
**Description:** Introduce ViewModels for the ~9 screens in batch 4 (defined in B-7). Delete corresponding Controllers and Callbacks. Verify rotation survival and regression. See stories/B-11_ViewModels_Wave2_Batch4.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization
**Component / Module:** controller, ui
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.1, stories/B-7_ViewModels_Wave2_Parent.md

---

**Issue Type:** Story
**Summary:** ViewModels wave 2: batch 5
**Epic Link:** E-B — Android Modernization
**Description:** Introduce ViewModels for the ~9 screens in batch 5 (defined in B-7). Delete corresponding Controllers and Callbacks. Verify rotation survival and regression. See stories/B-12_ViewModels_Wave2_Batch5.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization
**Component / Module:** controller, ui
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.1, stories/B-7_ViewModels_Wave2_Parent.md

---

**Issue Type:** Story
**Summary:** ViewModels wave 2: batch 6
**Epic Link:** E-B — Android Modernization
**Description:** Introduce ViewModels for the ~9 screens in batch 6 (defined in B-7). Delete corresponding Controllers and Callbacks. Verify rotation survival and regression. Verify zero Controller/Callback classes remain codebase-wide after this batch. See stories/B-13_ViewModels_Wave2_Batch6.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization
**Component / Module:** controller, ui
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.1, stories/B-7_ViewModels_Wave2_Parent.md

---

**Issue Type:** Story
**Summary:** Migrate leaf screens to Jetpack Compose
**Epic Link:** E-B — Android Modernization
**Description:** Migrate Settings, Help, Registration, and AcceptPolicy to Compose. Define design-system tokens (colours, typography, spacing). Implement light/dark theming. Wire Navigation Component. Remove all legacy Fragment/View code for these screens. See stories/B-14_Compose_Leaf_Screens.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization, compose
**Component / Module:** ui/activity, ui/fragment
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.2, docs/CRITICAL_PATH_ANALYSIS.md §1 (critical path)

---

**Issue Type:** Story
**Summary:** Migrate core screens to Jetpack Compose
**Epic Link:** E-B — Android Modernization
**Description:** Migrate Home, Browse, TitleDetails, and Search to Compose. Use design-system tokens from the leaf-screen migration. Run frame-rate and cold-start regression tests. Verify visual fidelity against approved screenshots. See stories/B-15_Compose_Core_Screens.md for full acceptance criteria.
**Story Points:** 13
**Labels:** modernization, compose
**Component / Module:** ui/activity, ui/fragment
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.3, docs/CRITICAL_PATH_ANALYSIS.md §1 (critical path, end item)

---

**Issue Type:** Story
**Summary:** Migrate Room to the Downloads process
**Epic Link:** E-B — Android Modernization
**Description:** Evaluate Room multi-process support, shared-file-with-locking, and file-based-queue approaches. Document the decision as an ADR. Implement the chosen approach for download-queue and renew tables. Write migration scripts and integration tests covering the full download lifecycle. See stories/B-16_Room_Downloads_Process.md for full acceptance criteria.
**Story Points:** 8
**Labels:** modernization, room
**Component / Module:** download, sqlite
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.5, stories/B-4_Room_Migration_Main.md (pattern source)

---

**Issue Type:** Story
**Summary:** Leanback / TV modernization
**Epic Link:** E-B — Android Modernization
**Description:** Evaluate Compose TV vs. continued Leanback and document as an ADR. Migrate Home, Search, and Playback TV screens on the chosen framework. Account for all 8 TV activities. Verify D-pad navigation. Regression-test on a physical TV device or emulator. See stories/B-17_Leanback_TV.md for full acceptance criteria.
**Story Points:** 13
**Labels:** modernization
**Component / Module:** ui (TV activities)
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.8

---

**Issue Type:** Story
**Summary:** Performance optimisation
**Epic Link:** E-B — Android Modernization
**Description:** Profile APK size (currently 12 MB), cold-start time, and memory usage. Remove unused native libs, dead Dagger classes, and other artifacts surfaced by profiling. Establish and meet cold-start and memory targets. See stories/B-18_Performance_Optimisation.md for full acceptance criteria.
**Story Points:** 5
**Labels:** performance, refactor
**Component / Module:** app
**Phase:** 2
**Supporting Docs:** docs/ROADMAP.md §2.9

---

## Summary totals

| Epic | Stories | Total Story Points | Phase(s) |
|------|---------|-------------------|----------|
| E-A: KMP Shared Module | 4 | 34 | 1, 2 |
| E-B: Android Modernization | 18 | 148 | 1, 2 |
| E-C: Observability and Refactoring | 2 | 16 | 0, 2 |
| E-D: Accessibility | 3 | 15 | 0, 1, 2 |
| E-E: Test and Architecture Foundations | 3 | 10 | 0 |
| **Grand total** | **30** | **223** | |

---

## CSV export note

To import into Jira via CSV, map the fields above as follows:

| Jira CSV column | Source field |
|-----------------|-------------|
| Issue Type | Issue Type |
| Summary | Summary |
| Description | Description |
| Story Points | Story Points |
| Labels | Labels (comma-separated) |
| Component | Component / Module |
| Epic Link | Epic Link (set to the Epic's key after epics are created) |

Steps:
1. Create the 5 Epics first.
2. Note each Epic's auto-generated Jira key.
3. Replace the Epic Link values in the story rows with the actual Jira keys.
4. Export as CSV (or paste each entry into a Jira issue manually).

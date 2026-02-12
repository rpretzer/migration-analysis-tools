# Module Classifications

KMP candidate / Native modernize / Native refactor+observability — one entry per module.

---

### bean/
**Path:** `com.hoopladigital.android.bean` (+ ebook/, graphql/, leanback/, v4/)
**Classification:** KMP candidate
**Rationale:** 132 pure data-model classes. Zero Android API imports. All implement Serializable. These are the core domain objects used everywhere in the app — content, titles, users, bookmarks, playback state, search results. Highest-value, lowest-risk extraction.
**Risks / Unknowns:**
- Some classes may have implicit Gson serialization contracts that break if field names change during Kotlin data-class conversion.
- The `v4/` sub-package suggests a versioned API response shape — confirm whether older versions are still in use.
**Suggested Next Steps:**
- Convert to Kotlin data classes in a shared KMP module.
- Add explicit `@SerializedName` annotations to lock JSON contracts.
- Confirm `v4/` vs current response schemas with backend team.

---

### auth/
**Path:** `com.hoopladigital.android.auth`
**Classification:** KMP candidate
**Rationale:** Two classes (interface + implementation) that manage OAuth token validation and account sync. No Android API dependencies. Token refresh and session maintenance are high-value shared logic — identical flow will be needed on iOS.
**Risks / Unknowns:**
- Implementation uses `FrameworkService` (service locator) to reach web-service managers. The KMP version will need an injected HTTP client instead.
- Token storage (where tokens are persisted) is in `dao/` — that coupling needs to be surfaced and replaced with a KMP-compatible store.
**Suggested Next Steps:**
- Define a `TokenStore` interface in the shared module.
- Port `AuthenticationManagerImpl` logic to Kotlin, injecting `TokenStore` and an HTTP client.

---

### webservices/
**Path:** `com.hoopladigital.android.webservices` (+ client/, manager/, responseparser/)
**Classification:** KMP candidate
**Rationale:** 89 classes covering the entire HTTP layer: OkHttp client setup, REST + GraphQL managers, and ~45 response parsers. Only `LocaleChangedBroadcastReceiver` touches Android APIs. OkHttp is already KMP-compatible. This is the backend client — sharing it eliminates duplicate API surface on iOS.
**Risks / Unknowns:**
- Gson is Android/JVM-only; will need a KMP-compatible serialiser (kotlinx.serialization or Moshi with KMP support).
- `GatewayWSManager` is a large interface — confirm which endpoints are actually called vs. legacy/dead.
- GraphQL `QueryBuilder` uses string concatenation; move to typed queries if possible.
**Suggested Next Steps:**
- Replace Gson with kotlinx.serialization across all parsers.
- Audit `GatewayWSManager` for dead endpoints.
- Port OkHttp client factory and all manager interfaces to shared module.

---

### hls/
**Path:** `com.hoopladigital.android.hls`
**Classification:** KMP candidate
**Rationale:** Three empty service interfaces (`BookmarkDataService`, `ComicDataService`, `PlaybackPositionDataService`). These define contracts for data access and have no implementation or platform dependency here. Define them in the shared module; each platform provides its own implementation.
**Risks / Unknowns:**
- Implementations are elsewhere — locate them before moving contracts.
**Suggested Next Steps:**
- Find implementing classes. Place interfaces in shared KMP module once confirmed.

---

### controller/
**Path:** `com.hoopladigital.android.controller` (+ leanback/, registration/, tabs/, titledetails/)
**Classification:** Native modernize
**Rationale:** ~271 classes that act as presenters — they hold business logic and mediate between UI and services. The logic itself is largely Android-agnostic, but the classes are tightly bound to AsyncTask and the FrameworkService locator, and many expose Android-specific callback types. Full extraction to KMP requires replacing the async model first; modernising in place to MVVM + coroutines is the right first step.
**Risks / Unknowns:**
- Many controllers have hundreds of lines; splitting them during modernisation will be complex.
- Leanback sub-package controllers are TV-specific and should stay native.
**Suggested Next Steps:**
- Introduce ViewModel wrappers around the highest-traffic controllers (TitleDetails, Search, Home).
- Replace AsyncTask usage with coroutines.
- Once stable, re-evaluate the pure-logic subset for KMP extraction in a later phase.

---

### task/
**Path:** `com.hoopladigital.android.task` (+ v2/, v2/datafetcher/)
**Classification:** Native modernize
**Rationale:** 34 classes of AsyncTask subclasses and a hand-rolled task manager. AsyncTask is deprecated since API 30 and is the primary async mechanism in the app. Replacing this with coroutines + WorkManager removes a major source of lifecycle bugs and unlocks modern patterns everywhere that calls into tasks.
**Risks / Unknowns:**
- `AsyncTaskManager` is used by many controllers — a single interface change will ripple broadly.
- Some tasks (e.g., `BlurImageTask`) do trivial work and can simply be inlined.
**Suggested Next Steps:**
- Replace `AsyncTaskManager` with a coroutine-based equivalent exposing the same contract.
- Migrate `ControllerWSAsyncTask` subclasses to suspend functions.
- Delete `task/v2/` once migration is complete.

---

### ui/
**Path:** `com.hoopladigital.android.ui` (+ activity/, appwidget/, animation/, bottomsheet/, ebook/, fragment/, leanback/, listener/, recyclerview/, registration/, tab/, util/, widget/)
**Classification:** Native modernize
**Rationale:** 449 classes — the largest package. Activities and Fragments use classic Views with no ViewModel layer. The ebook reader sub-package alone is ~80 files. This is the surface that users see and the surface that needs to move toward Jetpack Compose and MVVM. Extraction to KMP is not appropriate; modernisation of the UI stack is.
**Risks / Unknowns:**
- The ebook reader is exceptionally complex (WebView + local server + bidirectional JS bridge). Migrate last or keep as-is.
- Leanback UI is a separate paradigm — TV screens should be treated as a distinct workstream.
- Fragment-based navigation makes incremental Compose migration tricky; Navigation Component should be adopted first.
**Suggested Next Steps:**
- Adopt Navigation Component for fragment graph.
- Introduce ViewModels for HomeActivity, TitleDetailsActivity, search screens.
- Begin Compose migration on leaf screens (settings, help, registration) before core content screens.
- Scope the ebook reader as a standalone investigation.

---

### ui8/
**Path:** `com.hoopladigital.android.ui8`
**Classification:** Native modernize
**Rationale:** 10 classes that appear to be legacy UI from an older version (comic reader, upgrade prompt, auth error). The comic reader activity here likely predates the one in `ui/`. These should be consolidated or removed as part of the Compose migration.
**Risks / Unknowns:**
- Confirm which screens are still reachable from the navigation graph before deleting.
**Suggested Next Steps:**
- Audit reachability. Dead code → delete. Live code → migrate into main `ui/` package and modernise.

---

### sqlite/
**Path:** `com.hoopladigital.android.sqlite` (+ impl/)
**Classification:** Native modernize
**Rationale:** 16 classes of hand-written SQLiteOpenHelper subclasses — one per data domain. AndroidX Room is already declared as a service in the manifest, suggesting the team intended to migrate but has not. Room provides type safety, migration support, and testability that raw SQLite does not.
**Risks / Unknowns:**
- Multiple helpers likely share no schema versioning strategy — migration scripts will be needed.
- `DownloadSQLiteHelper` runs in the `:Downloads` process; Room's multi-process support is limited.
**Suggested Next Steps:**
- Introduce Room entities and DAOs for the highest-traffic tables (downloads, playback position, bookmarks).
- Handle the `:Downloads` process table separately — consider a single shared database file with careful locking.

---

### audio/
**Path:** `com.hoopladigital.android.audio` (+ exoplayer/)
**Classification:** Native refactor / observability
**Rationale:** 23 classes including `AudioService` (MediaBrowserServiceCompat) running in a separate process. This is core app functionality — it must remain native and Android-specific. However, it uses Handler-based callbacks and has no structured logging or metrics around playback state transitions, seek events, or error recovery. Observability here directly impacts user experience debugging.
**Risks / Unknowns:**
- Separate process means shared state is serialised via Intents/MediaController — bugs here are hard to reproduce.
- ExoPlayer version is not pinned in decompiled output; confirm compatibility with current ExoPlayer releases.
**Suggested Next Steps:**
- Add structured logging at every playback state transition (playing, paused, buffering, error, completed).
- Add metrics for buffering duration, seek latency, and error frequency.
- Add trace spans around MediaController calls for end-to-end playback debugging.

---

### video/
**Path:** `com.hoopladigital.android.video` (+ leanback/)
**Classification:** Native refactor / observability
**Rationale:** 6 classes wrapping ExoPlayer for video. DASH + Widevine DRM. Platform-specific and must stay native. Same observability gaps as `audio/` — playback errors and DRM failures are high-impact and currently poorly instrumented.
**Risks / Unknowns:**
- Widevine license renewal race conditions are a known pain point in DASH playback.
**Suggested Next Steps:**
- Log DRM license acquisition and renewal events with timestamps.
- Surface playback error codes and ExoPlayer error detail into crash reports (Bugsnag).

---

### download/
**Path:** `com.hoopladigital.android.download`
**Classification:** Native refactor / observability
**Rationale:** 15 classes managing offline downloads in a separate process. Uses deprecated `IntentService`. Download queue, validators, and broadcast receivers are all platform-specific. The download flow is critical for the offline experience and is currently instrumented only at the broadcast level.
**Risks / Unknowns:**
- `IntentService` is deprecated API 30+; should move to a foreground Service or WorkManager.
- SD-card unmount handling (`StorageUnmountedBroadcastReceiver`) is fragile on newer Android versions.
**Suggested Next Steps:**
- Replace `IntentService` with a standard `Service` + coroutines, or WorkManager periodic workers.
- Add structured logging for every download lifecycle event (queued, started, progress, completed, failed, retried).
- Add metrics for download duration, failure rate by content type, and storage utilisation.

---

### dash/
**Path:** `com.hoopladigital.android.dash`
**Classification:** Native refactor / observability
**Rationale:** 11 classes handling DASH manifest parsing, Widevine license management, and offline license renewal. Heavily platform-coupled (ExoPlayer, Widevine). DRM license failures are among the most user-visible errors in streaming apps and are currently under-logged.
**Risks / Unknowns:**
- `CastlabsWidevineDrmCallback` is a third-party integration — confirm support contract.
- Offline license expiry logic is a known source of silent failures.
**Suggested Next Steps:**
- Log every license request, renewal, and expiry with content ID and timestamp.
- Add error-category tagging (network failure vs. license rejection vs. timeout) to crash reports.

---

### playback/
**Path:** `com.hoopladigital.android.playback`
**Classification:** Native refactor / observability
**Rationale:** 6 classes orchestrating playback across audio, video, and ebook formats. `DefaultPlaybackManager` performs geo-checks and license retrieval before playback starts — this is a critical path that users feel directly. Currently uses AsyncTask with no tracing.
**Risks / Unknowns:**
- Geo-check failures may silently block playback with a generic error.
**Suggested Next Steps:**
- Add trace spans for the full pre-playback sequence: geo-check → license fetch → player init → first frame/audio.
- Surface geo-check failure reasons into analytics and error messages.

---

### service/
**Path:** `com.hoopladigital.android.service` (+ branchio/, braze/, comic/, factory/, platform/, playback/, widget/)
**Classification:** Native refactor / observability
**Rationale:** 17 classes anchored by the `FrameworkService` service-locator singleton. This is the wiring hub of the app — every manager, data store, and analytics service is accessed through it. The pattern itself is the issue: it makes the dependency graph invisible, untestable, and hard to refactor. Replacing it with proper DI (Hilt) is the single highest-leverage architectural change available.
**Risks / Unknowns:**
- `FrameworkServiceFactory.getInstance()` is called from ~every package. Migration will touch most of the codebase.
- Lazy initialisation inside `DefaultFrameworkService` masks startup ordering bugs.
**Suggested Next Steps:**
- Introduce Hilt modules for each service group (auth, networking, analytics, storage).
- Replace `FrameworkServiceFactory.getInstance().getX()` call sites with `@Inject` one package at a time, starting with `controller/` and `task/`.
- Remove `FrameworkService` once all call sites are migrated.

---

### dao/
**Path:** `com.hoopladigital.android.dao`
**Classification:** Native refactor / observability
**Rationale:** 12 thin SharedPreferences wrappers. Platform-specific by nature. The pattern is fine but there is no logging when preferences are read or written, making it difficult to trace state changes (e.g., why did the app think the user already accepted terms?).
**Risks / Unknowns:**
- Some prefs keys may collide or be orphaned from removed features.
**Suggested Next Steps:**
- Audit for orphaned keys and remove them.
- Add debug-level logging on preference writes for key app-state preferences (auth, terms, onboarding).

---

### google/
**Path:** `com.hoopladigital.android.google` (+ video/chromecast/)
**Classification:** Native refactor / observability
**Rationale:** 6 classes for Google Cast. Entirely platform-specific (Google Play Services). Cast session lifecycle events (connected, disconnected, playback errors) are not surfaced to app analytics.
**Risks / Unknowns:**
- Cast Framework version pinning — confirm compatibility.
**Suggested Next Steps:**
- Log Cast session lifecycle events and playback errors into analytics.

---

### ebook/
**Path:** `com.hoopladigital.android.ebook` (+ server/)
**Classification:** Native refactor / observability
**Rationale:** 10 classes including an embedded Jetty HTTP server that serves ebook content to a WebView. The server approach is architecturally sound for cross-origin ebook rendering but adds a local network layer that is currently unmonitored.
**Risks / Unknowns:**
- Jetty startup/shutdown lifecycle in a mobile context — confirm it does not leak on activity destruction.
- WebSocket bridge errors are likely swallowed silently.
**Suggested Next Steps:**
- Log server start/stop, request latency, and WebSocket connection errors.
- Add reading-progress metrics (pages per session, time per page) for product analytics.

---

### analytics/
**Path:** `com.hoopladigital.android.analytics`
**Classification:** Native refactor / observability
**Rationale:** 3 classes that log to Firebase Analytics, currently scoped only to DRM/device-revocation events. The app's analytics footprint is narrow — key user flows (search, browse, borrow, playback start) are not instrumented here.
**Risks / Unknowns:**
- Braze analytics (`service/braze/`) is a separate path — confirm which events go where and whether there is duplication.
**Suggested Next Steps:**
- Define a unified event taxonomy covering all critical flows.
- Route all events through a single analytics facade; backends (Firebase, Braze) become implementation details.

---

### links/
**Path:** `com.hoopladigital.android.links`
**Classification:** Native refactor / observability
**Rationale:** 9 classes handling deep-link parsing and routing. Branch.io integration is platform-specific. Deep-link failures (malformed URLs, unrecognised paths) are a common source of silent app crashes or blank screens.
**Risks / Unknowns:**
- The manifest exposes 17+ path prefixes; confirm the router handles all of them and has fallbacks for unknown paths.
**Suggested Next Steps:**
- Log every deep-link arrival with the raw URL and the resolved route (or failure reason).
- Add a catch-all fallback that logs unhandled deep-link patterns.

---

### crashreporting/
**Path:** `com.hoopladigital.android.crashreporting`
**Classification:** Native refactor / observability
**Rationale:** 3 classes wrapping Bugsnag. The integration exists but breadcrumb coverage is likely thin — key state (current content, playback status, network state) should be attached to every crash report.
**Risks / Unknowns:**
- Confirm Bugsnag SDK version and whether it supports the current target SDK.
**Suggested Next Steps:**
- Register breadcrumb callbacks that attach current content ID, playback state, and network status on every crash.
- Confirm error severity classification (fatal vs. handled) is correct across the app.

---

### notification/, app/, activity/, adapter/, suggestion/, dictionary/, util/
**Classification:** Native refactor / observability (minor)
**Rationale:** These are small, platform-specific packages with limited extraction value. `util/` contains a mix of helpers — crypto, validation, and date utilities could theoretically move to KMP in a later phase, but they are low-priority given the higher-value targets above.
**Risks / Unknowns:**
- `AESCryptoUtil` — confirm algorithm and key management are secure before any changes.
- `util/` validators (email, domain, regex) are good KMP candidates for Phase 2.
**Suggested Next Steps:**
- No action in Phase 0–1. Revisit validators and crypto utils in Phase 2 once the shared module is established.

# Architectural Audit — MVVM Migration Review

Target pattern: MVVM (Model–View–ViewModel) with Hilt DI, Kotlin coroutines, Room, and LiveData / StateFlow.
Current pattern: Controller / Presenter + Service Locator + AsyncTask.

All findings are grounded in specific source files under `decompiled/jadx/sources/com/hoopladigital/android/`. File paths are abbreviated to the package root for readability.

---

## Finding 1 — Service Locator is the single point of coupling

**Severity:** Critical
**Current pattern:** A static singleton (`FrameworkServiceFactory.getInstance()`) hands out every manager, data store, and analytics service in the app. `DefaultFrameworkService` implements 121 getter methods. Every controller, activity, fragment, and async task calls this factory at least once — many call it in constructors or field initialisers, before the Android lifecycle has even started.

**Key locations:**
- `service/factory/v4/FrameworkServiceFactory.java` — static `getInstance()` singleton
- `service/DefaultFrameworkService.java` — 121-method implementation; creates new `SQLiteOpenHelper` instances on every getter call (no caching)
- `ui/activity/BaseActivity.java` line 29 — `frameworkService = FrameworkServiceFactory.getInstance()`
- `ui/fragment/BaseFragment.java` lines 34–40 — service locator called in the **Fragment constructor**, before `onCreate`
- `task/v2/WSAsyncTask.java` — `service` field initialised inline: `FrameworkServiceFactory.getInstance()`
- `task/v2/ControllerWSAsyncTask.java` lines 136–138 — same pattern

**Why this blocks MVVM:**
- Dependencies cannot be injected — mocking is impossible without reflection.
- Every class is coupled to the same global object; the dependency graph is invisible.
- Lazy initialisation inside `DefaultFrameworkService` hides startup-ordering bugs.

**Target:** Replace with Hilt. Each service group (auth, networking, analytics, storage) becomes a Hilt module. Call sites become `@Inject` fields or constructor parameters. `FrameworkServiceFactory` is deleted.

---

## Finding 2 — Zero ViewModels; state is lost on configuration change

**Severity:** Critical
**Current pattern:** Controllers are instantiated as plain fields on Activities / Fragments (`val controller = SomeControllerImpl()`). They hold no state that survives rotation. Activities save a subset of state via `onSaveInstanceState` / Bundle — manually, incompletely, and brittly.

**Key locations:**
- `ui/activity/AcceptPolicyActivity.java` — `fetchDocId` Boolean is a plain field; not saved in Bundle. Lost on rotation.
- `ui/fragment/AdvancedSearchFragment.java` — 50+ state fields (filter indices, label lists, date ranges). `onSaveInstanceState` saves only 6 integer indices. The rest reset to defaults on rotation.
- `ui/activity/HomeActivity.java` — Bundle saves only the selected bottom-nav tab ID; deep-link state and in-flight requests are lost.

**Why this blocks MVVM:**
- ViewModel is the MVVM mechanism for surviving configuration changes. There are none.
- Every screen that holds UI state today is vulnerable to data loss on rotation.

**Target:** Introduce a ViewModel per screen. Move all state fields into the ViewModel. Expose state as `LiveData<T>` or `StateFlow<T>`. Fragments / Activities observe — they never hold state directly.

---

## Finding 3 — Controllers hold UI references via callbacks; memory-leak risk

**Severity:** High
**Current pattern:** Every controller exposes an `onActive(Callback)` / `onInactive()` lifecycle pair. The `Callback` interface is implemented by the Activity or Fragment itself. The controller stores the reference as a plain field:

```java
// AuthenticationControllerImpl.java line 24
public AuthenticationController.Callback callback;

public void onActive(AuthenticationController.Callback callback) {
    this.callback = callback;   // holds Activity reference
}
public void onInactive() {
    this.callback = null;       // only called in onPause
}
```

`onInactive` is called in `onPause`, which fires **before** the Activity is destroyed on a configuration change. Between `onPause` and destruction the reference is nulled — but a new Activity is already being created and will call `onActive` again. If any in-flight `AsyncTask` posts a result between these two calls it targets a destroyed Activity.

`WSAsyncTask` uses a `SoftReference` to the callback, which mitigates the leak for GC but does not prevent the null-callback crash window.

**Key locations:**
- `controller/AcceptPolicyControllerImpl.java` line 29
- `controller/AuthenticationControllerImpl.java` line 24
- `controller/HistoryControllerImpl.java` — same pattern
- `controller/ManagePatronsControllerImpl.java` — inner `LoadPatronsTask` holds callback + service locator in constructor

**Target:** ViewModels never hold UI references. Results are posted to `LiveData` / `StateFlow`. Fragments observe with `viewLifecycleOwner` — automatic null safety.

---

## Finding 4 — AsyncTask is the entire async layer

**Severity:** High
**Current pattern:** All background work runs on `AsyncTask`, managed by a hand-rolled `AsyncTaskManager` (an `ArrayList` of tasks with a brute-force `cancel` loop). The base class for network calls is `ControllerWSAsyncTask`, which wraps a single lambda and fans out to `onSuccess` / `onFailure` callbacks.

**Key locations:**
- `task/v2/AsyncTaskManager.java` — `ArrayList<AsyncTask>`, `addAndExecute`, `cancelAndClearAllTasks`
- `task/v2/WSAsyncTask.java` — abstract base; `SoftReference` callback; service-locator field; hard-coded error routing (401 → version error, 4xx → failure)
- `task/v2/ControllerWSAsyncTask.java` — concrete task used by 10+ controllers
- `controller/HistoryControllerImpl.java` line 77 — `executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR)` bypasses the manager entirely; task is untracked

**Problems:**
- `AsyncTask` is deprecated since API 30. Android 12+ does not guarantee behaviour.
- Tasks are not lifecycle-aware — a result can arrive after the Activity is destroyed.
- `THREAD_POOL_EXECUTOR` is a shared pool; long-running tasks starve short ones.
- Exceptions in `doInBackground` are silently swallowed (no propagation).

**Target:** Replace with Kotlin coroutines. Network calls become `suspend` functions. Controllers become ViewModels; async work runs in `viewModelScope.launch`. `AsyncTaskManager` and all `WSAsyncTask` subclasses are deleted.

---

## Finding 5 — No Repository pattern; controllers build HTTP requests inline

**Severity:** Medium–High
**Current pattern:** Controllers reach through the service locator to grab a web-service manager, then construct `HttpRequest` objects themselves — setting method, URL template, auth token, and body — and call `execute` directly.

**Key location — `controller/HistoryControllerImpl.java` lines 98–106:**
```java
HttpRequest httpRequest = new HttpRequest(null);
httpRequest.method = Method.PUT;
httpRequest.relativeUrl = "/v2/borrowed/history/{circId}/hide".replace("{circId}", str);
httpRequest.jsonBody = "{}";
httpRequest.authToken = restWSManagerImpl.user.authToken;
return ((OkHttpClient) httpClient).execute(httpRequest);
```

This pattern is repeated across dozens of controllers. The HTTP layer, auth token injection, URL construction, and error handling are all duplicated.

**Why this blocks MVVM:**
- ViewModels should depend on Repositories, not on raw HTTP clients.
- Without a Repository, there is no place to add caching, retry logic, or offline fallback.
- Unit-testing a controller that builds HTTP requests requires a real or mocked HTTP stack.

**Target:** Introduce a Repository interface per domain (History, Policy, Patron, Playback, etc.). Each Repository owns its network calls and local-DB reads. ViewModels depend only on the Repository interface.

---

## Finding 6 — Database access is synchronous and uncached

**Severity:** Medium–High
**Current pattern:** `SQLiteOpenHelper` subclasses call `getWritableDatabase()` synchronously on whatever thread invokes them. `DefaultFrameworkService` creates a **new** helper instance on every getter call — no connection pooling, no caching.

**Key locations:**
- `sqlite/impl/LocalBookmarkTableHelper.java` lines 53–94 — `store()` calls `getWritableDatabase()`, inserts a row, then closes the database handle. Exception path leaks the handle.
- `service/DefaultFrameworkService.java` line 77 — `new PatronSQLiteOpenHelper(App.instance).getActivePatron()` — fresh instance, synchronous read, silent exception swallow (returns `-1L`).
- `sqlite/impl/OfflinePlaybackTableHelper.java` — raw `CREATE TABLE` SQL; no migration strategy visible.

**Target:** Migrate to Room. One `Database` class, multiple `@Dao` interfaces. Queries return `LiveData<T>` or `Flow<T>` for automatic UI updates. `suspend` functions for writes. The `:Downloads` process table is a special case — investigate Room's multi-process support or keep it as a single shared SQLite file with explicit locking.

---

## Finding 7 — Manual lifecycle management is fragile and incomplete

**Severity:** High
**Current pattern:** Every Activity / Fragment must call `controller.onActive(this)` in `onResume` and `controller.onInactive()` in `onPause`. Missing either call leaks resources or crashes.

**Key locations:**
- `ui/activity/AcceptPolicyActivity.java` lines 162–169 — `onResume` / `onPause` pair
- `ui/fragment/BaseFragment.java` — no default implementation; each subclass must remember

**Problems:**
- `onPause` fires on configuration change before the new instance calls `onActive`. In-flight async results target a dead callback.
- No compile-time guarantee that every Activity / Fragment implements the pair.
- 75+ UI classes must all follow this convention manually.

**Target:** ViewModels are lifecycle-aware by design. `viewModelScope` is cancelled automatically when the ViewModel is cleared. Fragments observe via `viewLifecycleOwner`. No manual lifecycle wiring required.

---

## Finding 8 — 200+ callback methods; no reactive state

**Severity:** Medium
**Current pattern:** Each controller defines a `Callback` interface with 2–8 methods. The Activity / Fragment implements every method. There is no single "state" object — each possible outcome is a separate callback.

**Example — `HomeController.Callback`** has 8 methods:
`onAppVersionError`, `onAuthenticationError`, `onDataLoaded`, `onLibraryName`, `onPromptForAppStoreReview`, `onPromptToAcceptTermsAndConditions`, `onPromptToEnablePushNotifications`, `onSyncError`.

The Activity must implement all 8, most as empty stubs.

**Target:** Replace with a sealed `UiState` class per screen. The ViewModel exposes a single `LiveData<UiState>`. The Fragment has one `observe` block that `when`-matches on the state. Eliminates the callback explosion and makes the set of possible states explicit and exhaustive at compile time.

---

## Gap summary table

| Aspect | Current | Target | Severity |
|--------|---------|--------|----------|
| Dependency wiring | Service Locator (static singleton) | Hilt constructor injection | Critical |
| State survival across rotation | Manual Bundle (incomplete) | ViewModel + LiveData / StateFlow | Critical |
| UI ↔ business-logic coupling | Callback references to Activity / Fragment | ViewModel posts to LiveData; no UI references | High |
| Async mechanism | AsyncTask (deprecated API 30+) | Kotlin coroutines, `viewModelScope` | High |
| Data access abstraction | None — controllers call HTTP and SQLite directly | Repository pattern | Medium–High |
| Database layer | Raw SQLiteOpenHelper, synchronous, uncached | Room with suspend / Flow DAOs | Medium–High |
| Lifecycle management | Manual `onActive` / `onInactive` in every UI class | Automatic via ViewModel + `viewLifecycleOwner` | High |
| UI state model | Per-callback methods (200+ total) | Sealed `UiState` class per screen | Medium |

---

## Recommended migration sequence

The findings are ordered so that each step unblocks the next.

1. **Hilt DI** — wire `FrameworkService` as a singleton module. Add `@AndroidEntryPoint` to `BaseActivity` and `BaseFragment`. This is the prerequisite for everything else.
2. **AsyncTask → coroutines** — replace `AsyncTaskManager` and `ControllerWSAsyncTask` with suspend functions. No ViewModels needed yet; coroutines can run from Activities / Fragments temporarily.
3. **Repository layer** — extract HTTP and SQLite access out of controllers into Repository interfaces. Controllers / Activities now depend on Repositories, not on raw clients.
4. **ViewModels (top screens first)** — Home, TitleDetails, Search, AudiobookPlayer. Move state and coroutine launch into ViewModels. Fragments observe via LiveData. Delete the corresponding Controller + Callback.
5. **Room migration** — replace SQLiteOpenHelper classes with Room entities and DAOs. Wire through Repositories.
6. **Remaining screens** — repeat step 4 for the remaining 55+ controllers.
7. **Cleanup** — delete `FrameworkServiceFactory`, all `*ControllerImpl` classes, all `*Controller.Callback` interfaces, and `task/v2/`.

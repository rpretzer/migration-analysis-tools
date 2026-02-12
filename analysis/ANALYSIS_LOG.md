# Analysis Log

Chain-of-thought record of module inspections, tradeoffs, and assumptions.

---

## Entry 1 — Initial Decompilation and Structure Mapping

**Date:** 2026-02-03
**Module / Screen:** Entire application — top-down structure pass

**Questions asked:**
- Q: What is the actual language composition of the app — Java or Kotlin?
  A: ~75% of the 1,204 app classes are Kotlin-compiled (identifiable via Kotlin compiler artifacts in the decompiled output). However, the Kotlin stdlib and coroutines runtime are bundled but coroutines are not used by app code. The app behaves as a Java app in terms of its concurrency model.

- Q: Is Dagger (DI) actually wired in?
  A: Dagger classes are present in the APK (`dagger/`, `dagger/internal/`), but no `@Inject` or `@Module` usage was found in `com.hoopladigital.android` code. The app relies entirely on the `FrameworkServiceFactory` service locator. Dagger is bundled but effectively dead weight.

- Q: Are coroutines used anywhere?
  A: No. `kotlinx.coroutines` is on the classpath but app code uses `AsyncTask` and `Handler`/`Runnable` for all async work. This is the largest single modernisation opportunity.

- Q: Why are there two UI packages (`ui/` and `ui8/`)?
  A: `ui8/` contains 10 classes that appear to be survivors from an older app version (a comic reader activity, a custom ViewPager, zoom image view). The main comic reader and all modern screens live in `ui/`. `ui8/` is likely dead or nearly dead code.

- Q: Are there multiple processes and why?
  A: Yes — `:AudioPlayback` and `:Downloads`. Both host foreground services that must survive when the app is in the background. This is a standard Android pattern for media and download apps. It does complicate shared state (no direct object access across processes).

**Tradeoffs considered:**
- KMP extraction vs. in-place modernisation for `controller/`: Controllers are the closest thing to platform-agnostic business logic, but they are coupled to `AsyncTask` and the service locator. Extracting them now would require simultaneously replacing both dependencies. The better path is to modernise in place first (coroutines + Hilt), then re-evaluate for KMP in Phase 2. This avoids a large, risky parallel rewrite.

- Room vs. raw SQLite migration: Room is already declared in the manifest (AndroidX Room `MultiInstanceInvalidationService`), suggesting intent to migrate. However, the `:Downloads` process complicates Room adoption because Room's multi-process invalidation is limited. Decision: migrate the main-process tables to Room first; handle the downloads table as a separate investigation.

- Unified analytics facade vs. keeping Firebase + Braze separate: The app currently logs to Firebase for DRM events and Braze for marketing. These are different products with different consumers. However, the lack of a shared event taxonomy means the same user action may be logged inconsistently or not at all. Recommendation: introduce a single analytics interface that fans out to both backends, ensuring consistent event naming.

**Uncertainties / Assumptions:**
- Assumed `v4/` bean sub-package represents the current API response version. If older versions are still active, the bean extraction will need to carry multiple schemas.
- Assumed `ui8/` is legacy. If any screen in it is actively used, it changes the modernisation priority.
- The Google Maps API key and Branch.io keys in the manifest are a security concern flagged in PROJECT_STRUCTURE.md. These should be rotated if they are not already scoped/restricted on the provider side. This analysis does not have visibility into that.
- APKTool was non-functional in this environment (0-byte jar, no working mirror reachable). JADX covered sources and decoded resources fully. Smali bytecode is not available — this does not affect the analysis but would be needed for low-level bytecode-level security auditing.

---

<!-- Append new entries above this line -->

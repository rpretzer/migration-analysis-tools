# Performance optimisation

**Title:** Performance optimisation

**Story:**
As a user of the app, I want the APK to be as small as possible and the app to start and run quickly so that I spend less time waiting and more time using the library.

**Context / Background:**
The APK is currently 12 MB and ships native libraries for four architectures, bundled-but-unused Dagger classes, and other artifacts that may no longer be needed after the Compose migration. This story profiles APK size, app startup time, and memory usage, then addresses the top findings. Scope adjusts to what profiling surfaces.

**In scope:**
- [ ] Profile APK size and identify the largest contributors (native libs, dead code, assets)
- [ ] Profile app cold-start time and identify bottlenecks
- [ ] Profile memory usage during playback (audio and video) and identify OOM risks
- [ ] Remove unused native libs, dead Dagger classes, and any other artifacts identified by profiling
- [ ] Establish cold-start and memory targets and verify they are met

**Out of scope:**
- [ ] Network performance (covered by observability stories C-1 and C-2)
- [ ] Playback streaming performance (covered by ExoPlayer configuration, which is out of scope for this project)
- [ ] Changes to ViewModel, Repository, or controller logic

**Acceptance Criteria:**

```
Given APK size has been profiled before and after optimisation
When the results are compared
Then APK size has decreased by a measurable amount and the specific artifacts removed are documented
```

```
Given cold-start time has been profiled before and after optimisation
When the results are compared
Then a target has been established and the post-optimisation cold-start meets or beats that target
```

```
Given a playback stress test is run (audio playback + simultaneous download, video playback + simultaneous download)
When the test runs for 30 minutes
Then zero OOM crashes occur
```

```
Given unused native libs and dead Dagger classes have been identified
When the optimised APK is built
Then the identified artifacts are absent from the APK (or their presence is documented with a justification)
```

**Non-functional requirements:**
- Performance: This story is entirely a performance deliverable. All metrics must be measured before and after, with the measurement methodology documented.
- Accessibility: Optimisation must not remove or alter any accessibility-related resource or attribute.
- Observability: Not applicable to this story.
- Testing: Profiling results and before/after comparisons must be documented. The OOM stress test must be reproducible in CI or on a dedicated device.

**Dependencies:**
- Story B-15 (Compose core screens) must be complete. The Compose migration changes the asset pipeline and may affect APK size and startup time; optimisation should run after those changes are stable.

**Assumptions:**
- The four-architecture native lib set (arm64-v8a, armeabi-v7a, x86, x86_64) is required by at least one third-party SDK. If all four are genuinely unused, they are all candidates for removal. The profiling step confirms this.
- Dagger is confirmed dead (no @Inject or @Module in app code). Its classes are safe to exclude from the APK via ProGuard or R8 rules.

**Effort estimate:** 5
**Estimation drivers:** Profiling-driven; scope adjusts to findings; depends on B-15; APK is currently 12 MB with known dead weight.

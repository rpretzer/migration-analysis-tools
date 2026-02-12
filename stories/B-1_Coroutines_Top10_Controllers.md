# Replace AsyncTask with coroutines in top-10 controllers

**Title:** Replace AsyncTask with coroutines in top-10 controllers

**Story:**
As a developer maintaining the app, I want the top-10 controllers migrated from AsyncTask to Kotlin coroutines so that background work is lifecycle-aware, cancellable, and free of the deprecated AsyncTask API.

**Context / Background:**
AsyncTask is the entire async layer of the app and has been deprecated since API 30. The top-10 controllers — those driving the most user-visible flows — are the first migration targets. This is a critical-path item: the coroutine pattern established here is the template that the remaining 50+ controllers will follow in wave 2. Hilt (story E-2) must be in place first so that coroutines can receive injected dependencies.

**In scope:**
- [ ] Replace AsyncTaskManager and ControllerWSAsyncTask usage in the top-10 controllers with coroutine-based equivalents exposing the same contract
- [ ] Convert the top-10 controllers' network calls to suspend functions
- [ ] Write a coroutine-pattern document defining scope, cancellation, and error-handling conventions
- [ ] Verify all top-10 controller flows pass regression (happy path and error path)

**Out of scope:**
- [ ] The remaining 50+ controllers (they migrate with their ViewModels in stories B-3 and B-7 through B-13)
- [ ] Deletion of AsyncTaskManager or ControllerWSAsyncTask (other controllers still use them)
- [ ] ViewModel introduction (that is story B-3)

**Acceptance Criteria:**

```
Given the top-10 controllers have been migrated
When a code search is run for AsyncTaskManager and ControllerWSAsyncTask
Then zero call sites remain in any of the top-10 controllers
```

```
Given the migrated controllers are running
When a code search is run for AsyncTask.THREAD_POOL_EXECUTOR
Then zero results appear in any migrated code path
```

```
Given each of the top-10 controller flows is exercised (happy path and primary error path)
When regression tests complete
Then all flows pass with no crashes, no null-callback errors, and no data loss
```

```
Given the coroutine-pattern document has been written
When it is reviewed by the second developer on the team
Then the reviewer confirms they can implement the pattern without architect hand-holding
```

```
Given the app is rotated (configuration change) while a coroutine-launched network call is in flight in a top-10 controller
When the new instance resumes
Then the in-flight call completes correctly or is cancelled cleanly; no crash occurs
```

**Non-functional requirements:**
- Performance: Network calls must not block the main thread. Coroutine dispatchers must be appropriate for each call type (IO for network, Main for UI updates).
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story directly; structured logging for these flows is covered by story C-1.
- Testing: Each of the top-10 controllers must have at least one unit test per flow (happy path, error path) using a mocked HTTP client and runBlocking or a test coroutine scope.

**Dependencies:**
- Story E-2 (Hilt DI foundation) must be complete. Coroutines in controllers need injected dependencies.
- Kotlin coroutines runtime is already on the classpath; no new dependency is needed.

**Assumptions:**
- The "top-10 controllers" are those identified during the architecture audit as driving the highest-traffic flows. The exact list is confirmed at sprint start.
- The coroutine-pattern document becomes the implementation guide for all subsequent controller migrations; it is a deliverable of this story, not a separate task.

**Effort estimate:** 13
**Estimation drivers:** Critical-path item; High risk per roadmap; widest single-change regression surface; sets the pattern the rest of the app follows; depends on E-2.

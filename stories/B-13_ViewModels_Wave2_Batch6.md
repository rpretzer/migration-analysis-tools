# ViewModels wave 2: batch 6

**Title:** ViewModels wave 2: batch 6

**Story:**
As a user of the app, I want the sixth and final batch of screens migrated to ViewModels so that the app achieves full MVVM coverage and the legacy Controller and Callback layer is eliminated.

**Context / Background:**
This is the sixth and final batch in the wave-2 ViewModel migration. After this batch completes, all Controller classes and Callback interfaces in the app will have been deleted, and FrameworkServiceFactory will have zero call sites. The same pattern and acceptance criteria as previous batches apply. This batch also carries a codebase-wide cleanup gate: after it ships, the global cleanup (AsyncTaskManager deletion, FrameworkServiceFactory deletion) can proceed.

**In scope:**
- [ ] Introduce ViewModels for all screens assigned to batch 6 (screen list defined in story B-7)
- [ ] Move state and coroutine launches into the ViewModels
- [ ] Delete the corresponding Controller classes and Callback interfaces
- [ ] Verify all screens in this batch pass regression
- [ ] Verify that, after this batch, zero Controller classes and zero Callback interfaces remain in the codebase

**Out of scope:**
- [ ] Screens assigned to other batches
- [ ] Compose migration
- [ ] The global cleanup deletions themselves (AsyncTaskManager, FrameworkServiceFactory) — those are tracked separately but are unblocked by this story's completion

**Acceptance Criteria:**

```
Given all screens in batch 6 have been migrated
When each screen is rotated
Then no data loss occurs on any screen
```

```
Given batch 6 migration is complete
When a code search is run for onActive and onInactive
Then zero results remain anywhere in the app
```

```
Given batch 6 migration is complete
When a code search is run for Controller classes and Callback interfaces
Then zero app-owned Controller classes and zero app-owned Callback interfaces remain
```

```
Given batch 6 migration is complete
When a code search is run for FrameworkServiceFactory.getInstance()
Then zero call sites remain in the app (the factory class itself may still exist; its deletion is the cleanup step)
```

```
Given each screen in batch 6 is exercised
When regression testing completes
Then all screens pass on a representative device
```

**Non-functional requirements:**
- Performance: No network calls on rotation for any screen in this batch.
- Accessibility: TalkBack must continue to function on all screens in this batch; no contentDescriptions or accessibility attributes may be lost.
- Observability: Not applicable to this story.
- Testing: Each ViewModel in this batch must have unit tests covering initial state, successful load, and error state. A codebase-wide grep for Controller and Callback remnants is a sign-off gate.

**Dependencies:**
- Story B-7 (wave 2 planning) must be complete.
- Story B-3 (ViewModels wave 1) must be complete.
- Story B-12 (batch 5) should be stable before batch 6 begins.

**Assumptions:**
- After batch 6, the codebase is ready for the global cleanup step. If any Controller or Callback survives (e.g., in the ebook reader, which is excluded), it is documented as a known exception.

**Effort estimate:** 8
**Estimation drivers:** ~9 screens; pattern is proven; volume is the primary driver; codebase-wide cleanup gate adds a verification step.

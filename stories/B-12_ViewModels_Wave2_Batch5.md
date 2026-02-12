# ViewModels wave 2: batch 5

**Title:** ViewModels wave 2: batch 5

**Story:**
As a user of the app, I want the fifth batch of screens migrated to ViewModels so that those screens survive rotation without data loss and the codebase continues toward full MVVM coverage.

**Context / Background:**
This is the fifth of six batches in the wave-2 ViewModel migration. The pattern was established in story B-3 and the batch plan was defined in story B-7. The same structure and acceptance criteria as previous batches apply here.

**In scope:**
- [ ] Introduce ViewModels for all screens assigned to batch 5 (screen list defined in story B-7)
- [ ] Move state and coroutine launches into the ViewModels
- [ ] Delete the corresponding Controller classes and Callback interfaces
- [ ] Verify all screens in this batch pass regression

**Out of scope:**
- [ ] Screens assigned to other batches
- [ ] Compose migration
- [ ] Deletion of AsyncTaskManager or FrameworkServiceFactory

**Acceptance Criteria:**

```
Given all screens in batch 5 have been migrated
When each screen is rotated
Then no data loss occurs on any screen
```

```
Given batch 5 migration is complete
When a code search is run for onActive and onInactive
Then zero results remain for any screen in batch 5
```

```
Given batch 5 migration is complete
When a code search is run for the Controller classes corresponding to batch 5 screens
Then those classes do not exist; they have been deleted
```

```
Given each screen in batch 5 is exercised
When regression testing completes
Then all screens pass on a representative device
```

**Non-functional requirements:**
- Performance: No network calls on rotation for any screen in this batch.
- Accessibility: TalkBack must continue to function on all screens in this batch; no contentDescriptions or accessibility attributes may be lost.
- Observability: Not applicable to this story.
- Testing: Each ViewModel in this batch must have unit tests covering initial state, successful load, and error state.

**Dependencies:**
- Story B-7 (wave 2 planning) must be complete.
- Story B-3 (ViewModels wave 1) must be complete.
- Story B-11 (batch 4) should be stable before batch 5 begins.

**Assumptions:**
- The pattern document from B-3 is sufficient for all screens in this batch.

**Effort estimate:** 8
**Estimation drivers:** ~9 screens; pattern is proven; volume is the primary driver.

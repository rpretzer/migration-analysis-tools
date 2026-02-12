# KMP wave 2: extract controller logic and util/ validators into shared module

**Title:** KMP wave 2: extract controller logic and util/ validators into shared module

**Story:**
As a mobile platform engineer, I want the pure-logic subset of controller/ and the util/ validators extracted into the KMP shared module so that business rules and input validation run from a single shared implementation.

**Context / Background:**
After all controllers have been converted to coroutine-native ViewModels (story B-7 and batches B-8 through B-13), a subset of their logic is platform-agnostic: validation, state machines, and domain calculations. The util/ package also contains validators (email, domain, regex) that are trivially shareable. This story re-evaluates the boundary drawn in Phase 1 and extracts what is safe to share.

**In scope:**
- [ ] Identify the pure-logic subset of controller/ that has no Android-API dependency after the coroutines migration
- [ ] Extract identified logic into the shared module
- [ ] Extract util/ validators (email, domain, regex, date utilities) into the shared module
- [ ] Achieve unit-test coverage of 80 % or higher on all extracted code
- [ ] Publish a boundary document: what was extracted, what was left, and why

**Out of scope:**
- [ ] Any logic that depends on Android APIs (Context, lifecycle, UI state)
- [ ] iOS app integration beyond compilation verification
- [ ] UI or navigation changes

**Acceptance Criteria:**

```
Given the pure-logic subset of controller/ has been identified and extracted
When the extracted code runs on Android through the shared module
Then behavior is identical to the pre-extraction in-app version for all covered test scenarios
```

```
Given util/ validators are in the shared module
When the validators are called with the same inputs as before
Then all validation results are identical and all existing tests pass
```

```
Given the shared module is built for both JVM and iOS targets
When the build completes
Then extracted code compiles with zero errors on both targets
```

```
Given all extracted code has been instrumented for coverage
When the test suite runs
Then unit-test coverage meets or exceeds 80 % across all extracted classes
```

```
Given the extraction is complete
When the boundary document is reviewed
Then it clearly states for every controller and util class whether it was extracted, left in the app module, or deferred, with a one-sentence rationale for each decision
```

**Non-functional requirements:**
- Performance: No measurable regression on validation or business-logic execution paths.
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story.
- Testing: 80 % unit-test coverage is a hard gate. Tests must use inputs derived from production traffic patterns where possible.

**Dependencies:**
- Stories A-1, A-2, and A-3 must be complete (shared module exists and is proven).
- Stories B-7 through B-13 (ViewModels wave 2) must be stable. Controllers must be coroutine-native before their logic can be safely extracted.

**Assumptions:**
- After the coroutines migration, a meaningful subset of controller logic is free of Android-API coupling. If the migration left more coupling than expected, this story's scope shrinks and the boundary document reflects that.
- The backend team can provide integration-test fixtures for validators that currently rely on server-side validation rules.

**Effort estimate:** 8
**Estimation drivers:** Requires wave-2 ViewModels to be stable before boundaries can be drawn; careful boundary-drawing is the main risk; util/ validators are low-risk but controller-logic extraction is medium; 80 % coverage target adds verification work.

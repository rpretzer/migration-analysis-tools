# Introduce ViewModels for wave-1 screens

**Title:** Introduce ViewModels for wave-1 screens

**Story:**
As a user of the app, I want the four highest-traffic screens to survive rotation without losing data so that I never have to re-do a search or wait for content to reload after turning my phone sideways.

**Context / Background:**
The app has zero ViewModels. State is held in Activities and Fragments and is lost on configuration change. The four wave-1 screens — Home, TitleDetails, Search, and AudiobookPlayer — are the highest-traffic screens and the best candidates to establish the ViewModel pattern. This is a critical-path item: the pattern set here is the template for the 55+ screens in wave 2.

**In scope:**
- [ ] Introduce a ViewModel for each of the four wave-1 screens: Home, TitleDetails, Search, AudiobookPlayer
- [ ] Move all state fields and coroutine launches into the ViewModel
- [ ] Expose state as LiveData or StateFlow; Fragments observe via viewLifecycleOwner
- [ ] Define a sealed UiState class per screen; replace the callback-based UI update with a single when-match observer
- [ ] Delete the corresponding Controller classes and Callback interfaces for these four screens

**Out of scope:**
- [ ] The remaining 55+ screens (that is stories B-7 through B-13)
- [ ] Compose migration (these screens remain Fragment-based in this story)
- [ ] Room migration or Repository changes (Repositories from B-2 are used as-is)

**Acceptance Criteria:**

```
Given the user is on any of the four wave-1 screens and rotates the device
When the new instance is created
Then all visible state (list data, search query, playback position, selected title) is preserved without a network call
```

```
Given the four wave-1 screens have been migrated
When a code search is run for onActive and onInactive
Then zero results remain in the four migrated screens or their corresponding controllers
```

```
Given the four wave-1 screens have been migrated
When a code search is run for the four Controller classes
Then the classes do not exist; they have been deleted
```

```
Given each wave-1 screen has a sealed UiState class
When the Fragment's observer fires
Then the when-match is exhaustive (compiler-enforced); every possible state is handled
```

```
Given the ViewModel pattern document has been written (as part of this story)
When it is reviewed by the second developer
Then the reviewer confirms they can implement the pattern for a new screen without architect guidance
```

**Non-functional requirements:**
- Performance: Screen rotation must not trigger a network call for any of the four screens. ViewModel creation overhead must be negligible.
- Accessibility: TalkBack must continue to function on all four screens after migration. No contentDescriptions or accessibility attributes must be lost during the refactor.
- Observability: Not applicable to this story directly.
- Testing: Each ViewModel must have unit tests covering: initial state, state after successful data load, state after error, and state survival across a simulated configuration change (using a test ViewModel scope).

**Dependencies:**
- Story B-1 (coroutines) must be complete.
- Story B-2 (Repository layer) must be complete. ViewModels call Repositories, not HTTP clients.

**Assumptions:**
- LiveData is the chosen state holder for Fragment observation. If the team prefers StateFlow, the pattern document reflects that choice but the story scope does not change.
- The sealed UiState class replaces all callback methods for a given screen. No callback interfaces survive for the four migrated screens.

**Effort estimate:** 13
**Estimation drivers:** Critical-path item; High risk; pattern-setting story; four screens with different state complexity; depends on B-1 and B-2.

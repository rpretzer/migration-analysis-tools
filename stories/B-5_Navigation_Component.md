# Adopt Navigation Component for HomeActivity fragment graph

**Title:** Adopt Navigation Component for HomeActivity fragment graph

**Story:**
As a developer maintaining the app's navigation, I want all fragments reachable from HomeActivity declared in a Navigation Component nav graph so that fragment transactions are managed declaratively and back-stack behaviour is consistent.

**Context / Background:**
HomeActivity currently manages fragment navigation via manual fragment transactions. Navigation Component is the AndroidX standard for declarative navigation and is required by Jetpack Compose navigation in Phase 2. Adopting it now, alongside the coroutines and Hilt work, keeps the app's foundation modern before Compose screens are added.

**In scope:**
- [ ] Define a nav graph covering all fragments currently reachable from HomeActivity
- [ ] Replace all manual fragment transactions in HomeActivity with Navigation Component destinations
- [ ] Verify back-stack behaviour is identical to the current experience for every reachable destination
- [ ] Verify deep-link entry points that land on HomeActivity fragments resolve correctly through the nav graph

**Out of scope:**
- [ ] Fragments in other Activities (only HomeActivity is in scope)
- [ ] Compose navigation (that is stories B-14 and B-15)
- [ ] Changes to controller, ViewModel, or Repository logic

**Acceptance Criteria:**

```
Given the nav graph is defined
When every fragment reachable from HomeActivity is listed
Then all of them appear as destinations in the nav graph; none are missing
```

```
Given the user navigates through the app using HomeActivity
When the back button is pressed at any point
Then the back-stack behaviour matches the pre-migration experience exactly
```

```
Given a deep link is triggered that targets a fragment inside HomeActivity
When the app opens
Then the correct fragment is displayed and the back-stack is set up so that pressing back exits the app (or returns to the previous activity, matching the current behaviour)
```

```
Given HomeActivity is running
When a code search is run for FragmentTransaction in HomeActivity
Then zero manual fragment transactions remain
```

**Non-functional requirements:**
- Performance: Navigation Component destination transitions must not be perceptibly slower than the previous manual transactions.
- Accessibility: TalkBack must continue to function on all navigated fragments. No contentDescriptions or focus behaviour must change.
- Observability: Not applicable to this story.
- Testing: Manual testing of every navigation path from HomeActivity is required (automated nav tests are brittle on Android). Back-stack behaviour must be verified on a physical device or high-fidelity emulator.

**Dependencies:**
- Story E-2 (Hilt DI foundation) must be complete. Navigation Component works best with Hilt-injected fragments.

**Assumptions:**
- All fragments reachable from HomeActivity are already annotated with @AndroidEntryPoint (or will be as part of story E-2's base-class annotation). If not, this story includes that annotation for HomeActivity's fragments.
- The nav graph is a single graph. If HomeActivity has sub-graphs (e.g., a tab-based structure), they are nested graphs within the single root.

**Effort estimate:** 8
**Estimation drivers:** Navigation behaviour regressions are hard to catch automatically; the nav graph must cover all HomeActivity fragments; depends on E-2; back-stack fidelity is the acceptance gate.

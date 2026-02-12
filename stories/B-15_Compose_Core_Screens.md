# Migrate core screens to Jetpack Compose

**Title:** Migrate core screens to Jetpack Compose

**Story:**
As a user of the app, I want the four most-used screens rendered in Compose so that the app's core experience is on the modern UI framework and the team can leverage Compose's performance and developer-experience benefits going forward.

**Context / Background:**
Home, Browse, TitleDetails, and Search are the highest-traffic screens. Their visual appearance must match the current experience exactly — any regression here is immediately visible to users. Story B-14 proved the Compose patterns on low-risk leaf screens; this story applies those patterns at scale. Frame-rate and startup-time regression tests are hard gates.

**In scope:**
- [ ] Migrate Home, Browse, TitleDetails, and Search to Jetpack Compose
- [ ] Use the design-system tokens and theming established in story B-14
- [ ] Wire Compose navigation for these screens through the Navigation Component
- [ ] Run frame-rate regression tests (Compose frame metrics) and app cold-start regression tests
- [ ] Verify visual fidelity against approved screenshots at all supported breakpoints

**Out of scope:**
- [ ] Leaf screens (already migrated in story B-14)
- [ ] Performance optimisation beyond what is needed to pass the regression gates (that is story B-18)
- [ ] Changes to ViewModel, Repository, or controller logic

**Acceptance Criteria:**

```
Given the four core screens have been migrated to Compose
When each screen is rendered
Then no legacy Fragment or View code remains for any of them
```

```
Given Compose frame metrics are captured during a representative usage session on each core screen
When the metrics are compared to the pre-migration baseline
Then frame rate does not regress on any core screen
```

```
Given a cold-start time measurement is taken with the migrated screens
When it is compared to the pre-migration baseline
Then cold-start time does not regress
```

```
Given approved design screenshots exist for each core screen at each supported breakpoint
When the migrated Compose screens are screenshotted
Then every screenshot matches the approved version within the agreed tolerance
```

```
Given TalkBack is enabled and the user navigates each core screen
When the walkthrough is complete
Then no accessibility regressions are observed compared to the pre-migration behaviour
```

**Non-functional requirements:**
- Performance: Frame rate must meet or exceed the pre-migration baseline. Cold-start time must not regress. These are measured automatically in CI.
- Accessibility: Full TalkBack walkthrough is a sign-off gate. Compose semantics must be verified for all interactive elements.
- Observability: Not applicable to this story.
- Testing: Visual regression screenshots are required at all breakpoints. Frame-rate and cold-start benchmarks are required. Compose UI tests covering the primary interaction on each screen are required.

**Dependencies:**
- Story B-14 (Compose leaf screens) must be complete. Patterns and design-system tokens are established there.
- The wave-2 ViewModels for Home, Browse, TitleDetails, and Search must be stable (from B-7 through B-13).

**Assumptions:**
- Pre-migration baseline measurements (frame rate, cold-start) are taken before Compose work begins and stored as the reference.
- Approved design screenshots are provided by the design team before implementation starts.

**Effort estimate:** 13
**Estimation drivers:** High risk per roadmap; four highest-traffic screens; visual fidelity must match exactly; performance regression tests are hard gates; depends on B-14 and wave-2 ViewModels.

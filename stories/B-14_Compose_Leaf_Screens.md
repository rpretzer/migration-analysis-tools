# Migrate leaf screens to Jetpack Compose

**Title:** Migrate leaf screens to Jetpack Compose

**Story:**
As a developer on the modernization roadmap, I want the four simplest screens migrated to Jetpack Compose so that the team establishes the Compose-plus-ViewModel integration pattern, design-system tokens, and theming before touching high-traffic screens.

**Context / Background:**
Settings, Help, Registration, and AcceptPolicy are leaf screens: they have simple state, few navigation edges, and low traffic. They are ideal candidates to validate Compose integration without the risk of a regression on a high-traffic flow. The design-system tokens (colours, typography, spacing) and theming (light/dark) established here become the shared foundation for the core-screen migration in story B-15.

**In scope:**
- [ ] Migrate Settings, Help, Registration, and AcceptPolicy to Jetpack Compose
- [ ] Define design-system tokens (colours, typography, spacing) and use them consistently across all four screens
- [ ] Implement light and dark theming on all four screens
- [ ] Wire navigation into and out of each screen through the Navigation Component
- [ ] Remove all legacy Fragment and View code for these four screens

**Out of scope:**
- [ ] Core screens (Home, Browse, TitleDetails, Search) — that is story B-15
- [ ] Design-system token changes driven by other screens
- [ ] Changes to ViewModel, Repository, or controller logic

**Acceptance Criteria:**

```
Given the four leaf screens have been migrated
When each screen is rendered
Then no legacy Fragment or View code remains for any of them
```

```
Given the design-system tokens are defined
When all four screens are inspected
Then colours, typography, and spacing values reference the shared tokens; no hard-coded values remain
```

```
Given the app is in dark mode
When any of the four leaf screens is displayed
Then the theming is correct and all text and icons are legible
```

```
Given the user navigates to and from each leaf screen
When the navigation transitions complete
Then back-stack behaviour is correct and no crashes occur
```

```
Given Compose UI tests exist for each screen
When the test suite runs
Then the primary user interaction on each screen (e.g., toggle a setting, submit registration) passes
```

**Non-functional requirements:**
- Performance: Compose screen composition must complete within one frame (16 ms) on a mid-range device for all four screens.
- Accessibility: TalkBack must function on all four Compose screens. Compose semantics must be verified (content descriptions, roles, state announcements).
- Observability: Not applicable to this story.
- Testing: Compose UI tests (using Compose testing APIs) must cover at least the primary interaction on each screen. Screenshot tests at light/dark are recommended.

**Dependencies:**
- Story B-3 (ViewModels wave 1) must be complete. Compose screens observe ViewModels via the same pattern.
- Story B-5 (Navigation Component) must be complete. Compose screens integrate with the existing nav graph.

**Assumptions:**
- Jetpack Compose is already on the classpath or will be added as a dependency in this story.
- The four leaf screens have ViewModels from either wave 1 or wave 2. If AcceptPolicy's ViewModel is not yet complete, this story waits or the screen is swapped with another leaf screen.

**Effort estimate:** 8
**Estimation drivers:** First Compose screens in the app; design-system token and theming setup is the real scope beyond the four screens themselves; depends on B-3 and B-5.

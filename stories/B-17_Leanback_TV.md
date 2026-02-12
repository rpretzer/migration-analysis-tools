# Leanback / TV modernization

**Title:** Leanback / TV modernization

**Story:**
As a user watching Hoopla on Android TV, I want the TV experience to be feature-complete on a modern framework so that I can browse, search, and play content from my couch without a phone.

**Context / Background:**
The app ships a full Leanback TV experience with 8 activities, custom presenters, and TV-specific controllers. TV is a distinct UI paradigm: D-pad navigation, 10-foot viewing distance, and limited input devices. The team must first decide whether to continue with Leanback or migrate to Compose TV, then implement the chosen approach for at least the home, search, and playback screens. TV testing requires dedicated hardware or emulators.

**In scope:**
- [ ] Evaluate Compose TV vs. continued Leanback and document the decision as an ADR
- [ ] Migrate Home, Search, and Playback TV screens on the chosen framework
- [ ] Account for all 8 TV activities: migrated, deferred with justification, or removed
- [ ] Verify D-pad navigation works correctly on all migrated screens
- [ ] Regression test on at least one physical TV device or Android TV emulator

**Out of scope:**
- [ ] Phone and tablet UI (separate stories)
- [ ] TV screens beyond the three prioritised (Home, Search, Playback) unless they are trivial to include
- [ ] Changes to ViewModel or Repository logic beyond what is needed to wire TV screens

**Acceptance Criteria:**

```
Given the ADR has been written
When the framework decision is reviewed
Then the choice (Compose TV or Leanback continuation) is documented with the rationale for rejecting the alternative
```

```
Given the Home, Search, and Playback TV screens have been migrated
When each screen is navigated using a D-pad (or D-pad emulator)
Then all interactive elements are focusable, the focus order is logical, and the primary action on each screen completes successfully
```

```
Given all 8 TV activities have been reviewed
When the migration is complete
Then each activity is classified as migrated, deferred (with a justification and a follow-up ticket), or removed
```

```
Given a physical Android TV device or emulator is available
When regression testing runs on the migrated screens
Then all three screens (Home, Search, Playback) function correctly with no crashes
```

**Non-functional requirements:**
- Performance: TV screens must render within one frame (16 ms) at the TV's native resolution. No visible lag on D-pad navigation.
- Accessibility: Android TV accessibility services must function on all migrated screens. Focus indicators must be visible at 10-foot viewing distance.
- Observability: Not applicable to this story.
- Testing: D-pad navigation must be verified manually on a physical device or high-fidelity emulator. Automated UI tests are recommended but manual verification is the hard gate.

**Dependencies:**
- The wave-2 ViewModels for TV screens must be stable (from B-7 through B-13). TV screens follow the same ViewModel pattern as phone screens.

**Assumptions:**
- At least one Android TV device or a high-fidelity emulator is available to the team for testing. If not, this story's timeline includes acquiring one.
- The existing TV-specific controllers and presenters can be replaced without affecting the phone/tablet experience.

**Effort estimate:** 13
**Estimation drivers:** High risk per roadmap; 8 TV activities; TV testing requires dedicated hardware; distinct UI paradigm; framework choice is a decision that gates implementation.

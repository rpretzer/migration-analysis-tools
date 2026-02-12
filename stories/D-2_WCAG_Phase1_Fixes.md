# WCAG Phase 1 Fixes: contrast, tap targets, captions, custom-view accessibility, highlight colours

**Title:** WCAG Phase 1 Fixes: contrast, tap targets, captions, custom-view accessibility, highlight colours

**Story:**
As a user who relies on sufficient colour contrast, adequately sized touch targets, or a screen reader, I want all eight High-severity WCAG findings addressed so that the audiobook player, video player, browse cards, and ebook highlights are fully usable.

**Context / Background:**
Eight High-severity findings were deferred from Phase 0 to Phase 1 because they require the observability and DI foundations to be stable first. The findings span contrast colours, tap-target sizes, caption discoverability, custom-view accessibility delegates, and highlight-colour descriptions. Each fix is independent; they are grouped into one story because they share the same severity tier and the same sign-off gate (manual TalkBack walkthrough).

**In scope:**
- [ ] Replace semi-transparent text colours (#afffffff, #8fffffff, textColorSecondary) with opaque theme tokens that meet WCAG 4.5:1 (normal text) or 3:1 (large text) contrast in both light and dark themes
- [ ] Increase audiobook-player transport-control tap targets (rewind, rewind-30, fast-forward, fast-forward-30) and the bookmark-delete button to 48x48 dp minimum
- [ ] Evaluate and update browse-card icon tap targets if they are interactive
- [ ] Add a caption-toggle button to the video player control bar
- [ ] Implement onInitializeAccessibilityNodeInfo and announceForAccessibility on SimpleRatingBar
- [ ] Implement announceForAccessibility on FavoriteButton for state-change events
- [ ] Replace generic highlight-colour content descriptions with descriptive colour names

**Out of scope:**
- [ ] Focus-ordering fixes (covered in story D-3)
- [ ] SeekBar value announcements (covered in story D-3)
- [ ] Ebook reader changes (deliberately excluded until late Phase 2)
- [ ] Changes to controller, ViewModel, or navigation logic

**Acceptance Criteria:**

```
Given both light and dark themes are active
When contrast-ratio analysis is run on all previously semi-transparent text elements
Then every element meets 4.5:1 for normal text or 3:1 for large text
```

```
Given the audiobook player is displayed
When the tap-target dimensions are measured for all transport controls and the bookmark-delete button
Then every target is at least 48x48 dp
```

```
Given the user is watching a video
When the player controls are visible
Then a caption-toggle button is present in the control bar (not buried in a menu) and has a clear contentDescription
```

```
Given the user has TalkBack enabled and interacts with a rating bar
When the rating value changes
Then TalkBack announces the new rating as "Rating: X of Y"
```

```
Given the user has TalkBack enabled and taps the favourite button
When the favourite state toggles
Then TalkBack announces "Added to favourites" or "Removed from favourites"
```

```
Given the user has TalkBack enabled and navigates to the ebook highlight-colour picker
When TalkBack reads each colour button
Then it announces the colour name (e.g., "Yellow highlight"), not a generic index
```

**Non-functional requirements:**
- Performance: Tap-target size increases must not cause visual overlap on the audiobook player at any supported screen size. Layout must be verified on a 360 dp and a 480 dp wide device.
- Accessibility: Manual TalkBack walkthrough is a required sign-off gate covering: audiobook player, video player, browse cards, and ebook highlight menu.
- Observability: Not applicable to this story.
- Testing: Contrast ratios must be verified programmatically (accessibility linting tool or manual measurement and documented). Tap-target sizes must be verified via layout inspection. TalkBack announcements must be verified manually on a device.

**Dependencies:**
- Story D-1 must be complete (Phase 0 critical fixes are the prerequisite for Phase 1 accessibility work per the WCAG remediation priority order).

**Assumptions:**
- The video player caption-toggle button can be added to the existing ExoPlayer control layout without a full player UI redesign.
- SimpleRatingBar and FavoriteButton are custom views owned by the app, not third-party libraries, and can be modified directly.

**Effort estimate:** 5
**Estimation drivers:** Eight distinct findings, each with a different fix type (colour tokens, layout dimensions, new UI element, accessibility-delegate overrides, string resource changes); depends on D-1; manual TalkBack smoke-test is a required gate.

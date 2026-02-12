# WCAG Phase 2 Fixes: focus ordering, SeekBar announcements, error messages, gesture alternatives

**Title:** WCAG Phase 2 Fixes: focus ordering, SeekBar announcements, error messages, gesture alternatives

**Story:**
As a user who navigates with a keyboard, switch access, or a screen reader, I want forms to have a logical focus order, controls to announce their values, and error messages to be specific and actionable so that I can complete every task in the app without ambiguity.

**Context / Background:**
Four Medium-severity WCAG findings were deferred to Phase 2: explicit focus ordering on multi-element forms and toolbars, the touch_interceptor focus bug in the ebook reader, SeekBar value announcements on the audiobook and ebook players, and a strings.xml audit for generic error messages. A gesture-alternative verification for ebook page turning is also included.

**In scope:**
- [ ] Add explicit focus ordering (nextFocusDown, nextFocusForward) to all multi-element forms: advanced search, ebook highlight menu, ebook reader toolbar
- [ ] Set touch_interceptor to focusable=false and importantForAccessibility=no so keyboard focus reaches ebook reader controls
- [ ] Add dynamic value announcements to the audiobook SeekBar (current position and total duration)
- [ ] Add dynamic value announcements to the ebook progress SeekBar
- [ ] Audit strings.xml for generic error messages and replace them with specific, actionable messages mapped to HTTP status codes
- [ ] Verify that ebook page turning has a non-gesture alternative (tap zones or explicit buttons); add buttons if absent

**Out of scope:**
- [ ] Deprecated widget migration (RelativeLayout, ImageButton — low severity, separate cleanup)
- [ ] Changes to controller, ViewModel, or navigation logic beyond what is required for the SeekBar announcements

**Acceptance Criteria:**

```
Given the user navigates the advanced-search form using keyboard or switch access
When the user presses the forward-focus key from any field
Then focus moves to the next field in logical reading order
```

```
Given the user navigates the ebook reader toolbar using keyboard
When focus is moved through the toolbar
Then the touch_interceptor does not consume focus and all controls are reachable
```

```
Given the user is listening to an audiobook and has TalkBack enabled
When the playback position changes
Then TalkBack announces the current position in the format "Playback progress: X min Y s of Z min" without interrupting playback
```

```
Given the user is reading an ebook and has TalkBack enabled
When the reading position changes
Then TalkBack announces the current page or progress in a human-readable format
```

```
Given the app encounters an HTTP error (e.g., 401, 403, 404, 500, timeout)
When the error is displayed to the user
Then the message is specific and actionable (e.g., "Session expired — please sign in again" for 401), not a generic "An error occurred"
```

```
Given the user is reading an ebook on a touch device
When the user needs to turn a page
Then a non-gesture alternative exists (tap zone or explicit button) and is documented in onboarding or a help screen
```

**Non-functional requirements:**
- Performance: SeekBar value announcements must use ACCESSIBILITY_LIVE_REGION_POLITE and must not block UI updates or cause audio/visual stuttering.
- Accessibility: Full TalkBack walkthrough of advanced search, audiobook player, and ebook reader is a required sign-off gate. Switch-access testing on forms is also required.
- Observability: Not applicable to this story.
- Testing: Focus order must be verified with both keyboard and switch access on a device. SeekBar announcements must be verified with TalkBack. Error messages must be verified against a mock server that returns each mapped status code.

**Dependencies:**
- Story D-2 must be complete (Phase 1 High-severity fixes precede Phase 2 Medium-severity fixes).

**Assumptions:**
- The ebook reader's page-turn mechanism can be verified from the existing layout and JS bridge without a full ebook-reader code audit. If the audit reveals that the mechanism is entirely in the WebView's JS, a follow-up task is created.
- The strings.xml audit will identify 10–20 generic error strings. If the count is significantly higher, the story may need to be split.

**Effort estimate:** 5
**Estimation drivers:** Four medium-severity findings plus a gesture-alternative verification; depends on D-2; the strings.xml audit adds discovery scope; focus-order changes require manual switch-access testing.

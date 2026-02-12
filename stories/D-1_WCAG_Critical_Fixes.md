# WCAG Critical Fixes: font scaling, browse-card descriptions, advanced-search labels

**Title:** WCAG Critical Fixes: font scaling, browse-card descriptions, advanced-search labels

**Story:**
As a user who relies on system font-size settings or a screen reader, I want the app to honour my accessibility preferences and announce all content correctly so that I can browse and use the library without information loss.

**Context / Background:**
The WCAG audit identified three Critical or High findings that must ship before the next release: 102+ hardcoded pt font sizes that ignore system scaling, missing content descriptions on browse-card icons and cover art, and a label/hint pattern in advanced search that causes TalkBack users to lose field context mid-input. These are the highest-leverage accessibility fixes in the codebase.

**In scope:**
- [ ] Replace all hardcoded pt text sizes in layout files with sp-based dimension resources
- [ ] Create a typography style sheet (dimen resources) and reference it from all replaced sizes
- [ ] Add dynamic contentDescription to browse-card license_icon, kind_icon, and thumbnail ImageViews
- [ ] Add dynamic contentDescription to the audiobook-player cover_art ImageView
- [ ] Fix the label/hint pattern on all 13 advanced-search fields so that labels remain announced when the user begins typing

**Out of scope:**
- [ ] Contrast-colour fixes (covered in story D-2)
- [ ] Tap-target size fixes (covered in story D-2)
- [ ] Any changes to the ebook reader (deliberately excluded from Phase 0)
- [ ] Changes to controller, ViewModel, or navigation logic

**Acceptance Criteria:**

```
Given the app is built from the updated layouts
When an automated lint check runs against all layout files
Then zero pt text sizes remain; every text size references a dimen resource in sp
```

```
Given the user has TalkBack enabled and navigates to any browse card
When TalkBack reads the card
Then it announces the content type (audiobook, ebook, video, music) and the borrow status (available, already borrowed)
```

```
Given the user has TalkBack enabled and navigates to the audiobook player
When TalkBack reads the cover art
Then it announces the currently playing title
```

```
Given the user has TalkBack enabled and navigates to the advanced-search form
When the user begins typing in any of the 13 input fields
Then TalkBack continues to announce the field label (it does not disappear or fall silent)
```

```
Given the system font scale is set to 200 %
When the user opens any screen in the app
Then no text is clipped, overlapping, or invisible; all content remains readable
```

**Non-functional requirements:**
- Performance: No measurable impact on layout inflation time. sp-based sizes are resolved at the same cost as pt sizes.
- Accessibility: This story is entirely an accessibility deliverable. All changes must be verified with TalkBack on a physical device or a high-fidelity emulator.
- Observability: Not applicable to this story.
- Testing: Automated lint rule for pt sizes must be added to CI. Manual TalkBack smoke-test on browse cards, audiobook player, and advanced search is a required sign-off gate. Screenshot regression tests at 100 %, 125 %, 150 %, and 200 % font scale.

**Dependencies:**
- Roadmap item 0.1 (assessment) is complete.

**Assumptions:**
- The typography style sheet will define approximately 5–8 size tokens (caption, body, subtitle, title, display, etc.). The exact set is a design decision made during implementation.
- The advanced-search fix uses TextInputLayout (preferred) rather than manual labelFor wiring. If TextInputLayout introduces layout regressions, the fallback is importantForAccessibility removal plus labelFor.

**Effort estimate:** 5
**Estimation drivers:** Mechanical changes (find-and-replace on 102+ sizes plus two smaller targeted fixes); low risk; typography style-sheet creation adds some design work; validation at multiple font-scale percentages adds test scope.

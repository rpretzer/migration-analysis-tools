# WCAG 2.1 AA Audit

Screen-by-screen accessibility findings for the Hoopla Android app. All findings derived from layout XML, theme/style resources, and Activity/Fragment source code via JADX decompile.

**Audit date:** 2026-02-03
**Source root:** `decompiled/jadx/`
**Compliance estimate:** ~42% AA (significant gaps across all four pillars)

---

## Summary of findings by severity

| Severity | Count | Top categories |
|----------|-------|----------------|
| Critical | 1 | Font scaling (app-wide) |
| High | 10 | Contrast, content descriptions, tap targets, labels, custom-view accessibility, captions |
| Medium | 4 | Focus order, SeekBar announcements, gesture alternatives, error messages |
| Low | 2 | Deprecated layout/widget usage |

---

## 1. All screens — Hardcoded pt font sizes

**Platform:** Android
**WCAG Criterion:** 1.4.4 Resize Text, 1.4.12 Text Spacing
**Severity:** Critical

| Issue | Locations | Remediation |
|-------|-----------|-------------|
| Text sizes specified in `pt` (fixed points) instead of `sp` (scale-independent pixels). `pt` does not honour system font-size settings. 102+ instances across layouts. | `activity_ebook_reader.xml` — chapter title 7pt, location labels 6pt, settings "Aa" button 9pt. `advanced_search.xml` — all 13 label TextViews at 7pt. `ebook_highlight.xml` — all text elements at 7pt. `audiobook_player_widget.xml` — title 18dp, body 16dp (should be sp). `deleted_title_details.xml` — message 7pt. | Replace every `android:textSize="Xpt"` with an `sp`-based dimension resource (e.g. `@dimen/text_body = 14sp`). Create a typography style sheet. Validate at 125 %, 150 %, 200 % system scaling. |

---

## 2. Browse cards — Missing content descriptions on icons and cover art

**Screen / Flow:** Browse / search results — every content card
**Platform:** Android
**WCAG Criterion:** 1.1.1 Non-text Content
**Severity:** High

| Issue | Location | Remediation |
|-------|----------|-------------|
| `license_icon` ImageView (15 dp) has no `contentDescription`. Conveys licensed/available status — semantically critical. | `browse_card.xml` line 23 | Set `contentDescription` dynamically: "Available for borrow" / "Already borrowed". |
| `kind_icon` ImageView (15 dp) has no `contentDescription`. Conveys content type (audiobook, ebook, video, music). | `browse_card.xml` line 56 | Set `contentDescription` dynamically: "Book type: audiobook". |
| `thumbnail` (ThumbnailImageView) has no `contentDescription`. Covers are the primary browse target. | `browse_card.xml` line 47 | Bind title name: "Cover art for \[title\]". Mark as decorative (`importantForAccessibility="no"`) only if an adjacent label already names the title. |
| `cover_art` (ObservableImageView) in the audiobook player has no `contentDescription`. | `audiobook_player.xml` line 43 | Bind currently playing title name. |

---

## 3. General UI — Semi-transparent text fails contrast

**Screen / Flow:** Audiobook player, video player, ebook reader progress labels
**Platform:** Android
**WCAG Criterion:** 1.4.3 Contrast (Minimum) — 4.5 : 1 normal text, 3 : 1 large text
**Severity:** High

| Issue | Location | Remediation |
|-------|----------|-------------|
| Labels use `#afffffff` (67 % opacity white). Against medium-gray backgrounds the effective contrast ratio falls below 4.5 : 1. | `audiobook_player.xml` lines 70, 84, 108 | Replace with opaque theme tokens (`textColorPrimary` / `textColorOnDark`) and verify contrast in both light and dark themes. |
| Position / duration text uses `#8fffffff` (~56 % opacity white) over live video frames — contrast is unpredictable and frequently fails. | `exo_video_player_controls.xml` lines 49, 60 | Use a solid white or light color with a drop-shadow or semi-opaque dark scrim behind the text. Verify 4.5 : 1 against the scrim, not the video. |
| `?android:attr/textColorSecondary` on reader location labels. On light themes the default value (`#8a000000`, 54 % black) is borderline. | `activity_ebook_reader.xml` lines 59, 67 | Override `textColorSecondary` in the ebook reader theme to a value that passes against the reader background in both light and dark modes. |

---

## 4. Audiobook player / bookmark list — Tap targets below 48 × 48 dp

**Screen / Flow:** Audiobook player controls, bookmark list item delete button
**Platform:** Android
**WCAG Criterion:** 2.5.8 Target Size (Minimum) — 24 × 24 dp visual, 44 × 44 dp touch (WCAG 2.2); 48 × 48 dp is the Android guideline baseline
**Severity:** High

| Issue | Location | Remediation |
|-------|----------|-------------|
| Rewind-30 s button: 45 × 35 dp. | `audiobook_player.xml` line 137 (`@dimen/rewind_30_width` / `height`) | Increase to 48 × 48 dp minimum. Use internal padding to keep the icon visually centred if the icon drawable is smaller. |
| Rewind button: 35 × 35 dp. | `audiobook_player.xml` line 148 | Same approach. |
| Fast-forward / fast-forward-30 s buttons: likely matching rewind dimensions. | `audiobook_player.xml` lines 171, 181 | Audit dimen values; apply 48 dp floor. |
| Bookmark delete button: 42 × 42 dp. | `bookmark_list_item.xml` line 20 | Increase to 48 × 48 dp. |
| `license_icon` and `kind_icon`: 15 × 15 dp each. | `browse_card.xml` lines 23, 56 | If these are tappable (e.g. filter toggle), wrap in a 48 dp touch target. If decorative-only, mark `importantForAccessibility="no"`. |

---

## 5. Advanced search — Labels hidden, hints used as labels

**Screen / Flow:** Advanced search form (13 input fields)
**Platform:** Android
**WCAG Criterion:** 3.3.2 Labels or Instructions
**Severity:** High

| Issue | Location | Remediation |
|-------|----------|-------------|
| Every label `BoldTextView` is set to `importantForAccessibility="no"`, making it invisible to TalkBack. The associated `EditText` relies solely on `android:hint`, which disappears once the user starts typing. TalkBack users lose field context mid-input. Pattern repeated for title, people, keyword, availability, format, borrow type, release date, date added, language, series, publisher, ISBN, and genre fields. | `advanced_search.xml` — label/input pairs throughout | Option A: Remove `importantForAccessibility="no"` from labels and add `android:labelFor="@+id/fieldId"` to associate them. Option B (preferred): Wrap each pair in a `TextInputLayout`, which handles label announcement and floating-label behaviour natively. |

---

## 6. Video player — Caption toggle buried in options menu

**Screen / Flow:** Video playback
**Platform:** Android
**WCAG Criterion:** 1.2.2 Captions (Pre-recorded)
**Severity:** High

| Issue | Location | Remediation |
|-------|----------|-------------|
| Subtitle / caption selection exists (`subtitlesMenuItem` in `VideoPlayerActivity`) but is only reachable via the options menu — not visible in the main player controls. Users who need captions have an extra navigation step and may not discover the feature. | `VideoPlayerActivity.java` line 58; `exo_video_player_controls.xml` (no caption button) | Add a persistent caption-toggle button to the player control bar alongside play / pause / seek. Give it a clear `contentDescription` ("Toggle captions"). |

---

## 7. Custom views — SimpleRatingBar and FavoriteButton lack accessibility

**Screen / Flow:** Any screen with a rating bar or favourite toggle
**Platform:** Android
**WCAG Criterion:** 4.1.2 Name, Role, Value
**Severity:** High

| Issue | Location | Remediation |
|-------|----------|-------------|
| `SimpleRatingBar` is entirely touch-driven. No `onInitializeAccessibilityNodeInfo` override, no role declaration, no value announcement after a rating change. Screen-reader users cannot perceive or interact with it. | `ui/widget/SimpleRatingBar.java` | Override `onInitializeAccessibilityNodeInfo`: set class name to `RatingBar`, set content description to "Rating: X of Y". Call `announceForAccessibility()` after each value change. |
| `FavoriteButton` toggles visual state on click but never announces the new state. Screen-reader users have no confirmation that the action succeeded. | Custom view (referenced in browse cards) | Call `announceForAccessibility("Added to favourites")` / `"Removed from favourites"` on state toggle. |

---

## 8. Highlight colour picker — Colours distinguished only by index

**Screen / Flow:** Ebook reader — highlight style selection
**Platform:** Android
**WCAG Criterion:** 1.1.1 Non-text Content, 1.4.1 Use of Colour
**Severity:** High

| Issue | Location | Remediation |
|-------|----------|-------------|
| Six highlight-colour buttons use generic content descriptions (`ebook_highlight_style_1_content_description` etc.). Users cannot tell which colour each button represents without seeing it. | `ebook_highlight.xml` lines 54–119 | Replace with descriptive names: "Yellow highlight", "Blue highlight", etc. |

---

## 9. Forms — No explicit focus ordering

**Screen / Flow:** Advanced search, ebook highlight menu, ebook reader toolbar
**Platform:** Android
**WCAG Criterion:** 2.4.3 Focus Order
**Severity:** Medium

| Issue | Location | Remediation |
|-------|----------|-------------|
| Multi-field forms and toolbars rely entirely on default layout order for keyboard / switch-access navigation. No `nextFocusDown`, `nextFocusUp`, or `nextFocusForward` attributes are set. On complex layouts (e.g. the 13-field advanced search) the default order may not match the logical reading flow. | `advanced_search.xml`, `ebook_highlight.xml`, `activity_ebook_reader.xml` toolbar | Add explicit `android:nextFocusDown` / `android:nextFocusForward` chains to all multi-element forms. Test with keyboard and switch-access input. |
| `touch_interceptor` View in the ebook reader is both `focusable` and `clickable`. It may consume keyboard focus and prevent it from reaching reader controls. | `activity_ebook_reader.xml` line 74 | Set `importantForAccessibility="no"` and `focusable="false"` on the interceptor; handle its click in code only. |

---

## 10. Audiobook player — SeekBar lacks value announcements

**Screen / Flow:** Audiobook playback
**Platform:** Android
**WCAG Criterion:** 4.1.2 Name, Role, Value
**Severity:** Medium

| Issue | Location | Remediation |
|-------|----------|-------------|
| `seek_bar` has no `contentDescription` and does not announce its current value or range to assistive technology. The ebook reader's `book_progress` SeekBar does have a `contentDescription` (`pagination_seekbar_content_description`) but still lacks dynamic value reporting. | `audiobook_player.xml` line 95; `activity_ebook_reader.xml` line 155 | Set `contentDescription` on the audiobook SeekBar. In code, update it dynamically on progress change: "Playback progress: 2 min 15 s of 45 min". Use `setAccessibilityLiveRegion(ACCESSIBILITY_LIVE_REGION_POLITE)` for value changes. |

---

## 11. Ebook reader / audiobook — Gesture-only page navigation unclear

**Screen / Flow:** Ebook reader page turning
**Platform:** Android
**WCAG Criterion:** 2.5.1 Pointer Gestures
**Severity:** Medium

| Issue | Location | Remediation |
|-------|----------|-------------|
| `touch_interceptor` View suggests swipe-based page turning. Whether button-based (tap left / right zone or explicit next / previous buttons) alternatives exist cannot be fully confirmed from layout alone. If page turning is swipe-only, it violates 2.5.1. | `activity_ebook_reader.xml` line 74 | Confirm that the reader exposes next / previous page controls accessible without gestures (tap zones count). If not, add explicit navigation buttons. Document the alternative in onboarding. |

---

## 12. Error messages — Likely generic (needs string-resource audit)

**Screen / Flow:** All error states
**Platform:** Android
**WCAG Criterion:** 3.3.1 Error Identification
**Severity:** Medium

| Issue | Location | Remediation |
|-------|----------|-------------|
| Error handling in `WSAsyncTask` falls back to `R.string.generic_error` for any non-version HTTP failure. The actual content of that string is unknown without a full `strings.xml` audit, but the fallback path strongly suggests a single generic message. | `task/v2/WSAsyncTask.java` — `onPostExecute` error branch | Audit `strings.xml`. Replace any generic error strings with specific, actionable messages (e.g. "Network error — check your connection and try again" rather than "An error occurred"). Map HTTP status codes to user-facing explanations. |

---

## 13. Deprecated layout and widget usage

**Screen / Flow:** Audiobook home-screen widget
**Platform:** Android
**WCAG Criterion:** 4.1.3 Status Messages (tangential — deprecated components may behave unexpectedly with assistive tech)
**Severity:** Low

| Issue | Location | Remediation |
|-------|----------|-------------|
| `RelativeLayout` used as container. Deprecated in favour of `ConstraintLayout`; some accessibility tools have historical quirks with it. | `audiobook_player_widget.xml` line 15 | Migrate to `ConstraintLayout`. |
| `ImageButton` widget used for widget controls. Deprecated; should be `MaterialButton` or an `ImageView` with explicit click handling. | `audiobook_player_widget.xml` lines 67, 77 | Replace with `MaterialButton` (icon mode) or an accessible `ImageView` + `OnClickListener`. |

---

## Remediation priority order

### Phase 0 — before next release
1. Replace all `pt` font sizes with `sp` (Critical — affects every screen)
2. Add `contentDescription` to browse-card icons and cover art (High — every content listing)
3. Fix label / hint pattern in advanced search (High — 13 fields)

### Phase 1 — next sprint after Phase 0
4. Fix contrast colours (audiobook player, video controls, ebook reader labels)
5. Increase tap targets to 48 dp (audiobook controls, bookmark delete)
6. Add caption toggle to video player controls
7. Implement accessibility on `SimpleRatingBar` and `FavoriteButton`
8. Replace highlight-colour generic descriptions with colour names

### Phase 2 — ongoing / backlog
9. Add explicit focus ordering to forms
10. Fix `touch_interceptor` focus behaviour
11. Add SeekBar value announcements
12. Audit `strings.xml` for generic error messages
13. Migrate deprecated widgets

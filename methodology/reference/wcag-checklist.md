# WCAG 2.1 AA Checklist — Mobile and Web

**Audience:** Codebase Analyst agent.
**Purpose:** Structured checklist for auditing mobile (Android, iOS) and web applications against WCAG 2.1 Level AA. Each criterion includes what to check, common failure patterns, and severity classification.

**Severity definitions:**
- **Critical:** The criterion failure prevents a user with a disability from completing a key task. The feature is effectively unusable for that user group.
- **High:** The criterion failure creates a significant barrier. A determined user may find a workaround, but it requires substantial additional effort.
- **Medium:** The criterion failure creates inconvenience or confusion. Core functionality is accessible but the experience is degraded.
- **Low:** The criterion failure violates best practice. The impact is minor and limited to edge cases.

---

## Principle 1: Perceivable

Information and user interface components must be presentable to users in ways they can perceive.

---

### 1.1 Text Alternatives

**1.1.1 Non-text Content (Level A)**

| Check | What to verify |
|-------|---------------|
| Images | Every `ImageView` (Android), `UIImageView` (iOS), or `<img>` (web) that conveys information has a non-empty content description / accessibility label / `alt` attribute. |
| Decorative images | Images that are purely decorative have an empty content description (`contentDescription=""` on Android, `isAccessibilityElement = false` on iOS, `alt=""` on web) so screen readers skip them. |
| Icons | Icon-only buttons (e.g., play, bookmark, share) have a content description that conveys the action, not the icon's visual name. Example: "Play" not "triangle pointing right." |
| Cover art | Book/movie cover images have labels that include the title and media type. Example: "Dune, ebook cover." |
| Charts and graphs | Any data visualization has a text alternative that conveys the same information as the visual. |

**Common mobile failures:** Cover art with null content description. Icon buttons with generic labels ("button" or "image"). Rating stars with no numeric equivalent.

**Common web failures:** Missing `alt` on cover images. Icon fonts (`<i class="fa fa-play">`) with no `aria-label`. SVG without `<title>` or `aria-label`.

**Severity if failed:** Critical (for interactive controls), High (for informational images).

---

### 1.2 Time-based Media

**1.2.1 Audio-only and Video-only, Prerecorded (Level A)**

| Check | What to verify |
|-------|---------------|
| Audio-only content | Podcasts, audiobook previews, or audio-only media have a transcript available. |
| Video-only content | Silent video (e.g., tutorial animations) has either a text description or audio description. |

**1.2.2 Captions, Prerecorded (Level A)**

| Check | What to verify |
|-------|---------------|
| Captions on video | All prerecorded video content (movies, TV shows, documentary clips) has synchronized captions. |
| Caption accuracy | Captions are accurate, not auto-generated without review, and synchronized within 2 seconds of audio. |

**1.2.4 Captions, Live (Level AA)**

| Check | What to verify |
|-------|---------------|
| Live captions | Live streaming content (if applicable) provides real-time captions. |

**1.2.5 Audio Description, Prerecorded (Level AA)**

| Check | What to verify |
|-------|---------------|
| Audio descriptions | Video content where significant visual information is not conveyed through the soundtrack has an audio description track available. |

**Common failures:** Movies with caption files that are present but not exposed through the player UI. No audio description track option in the player settings.

**Severity if failed:** Critical (captions for deaf/hard-of-hearing users), High (audio descriptions for blind users).

---

### 1.3 Adaptable

**1.3.1 Info and Relationships (Level A)**

| Check | What to verify |
|-------|---------------|
| Semantic structure | Headings, lists, and labels are implemented with semantic structure, not just visual styling. |
| Android | Use `accessibilityHeading = true` for heading-level elements. Group related controls with `ViewGroup` and descriptive content descriptions. |
| iOS | Set `accessibilityTraits = .header` for heading-level elements. Use `accessibilityElements` to order elements correctly. |
| Web | Use `<h1>`–`<h6>` for headings. Use `<ul>/<ol>/<li>` for lists. Use `<label>` for form inputs. Use ARIA landmark roles (`main`, `nav`, `region`) where semantic HTML is insufficient. |
| Compose Multiplatform | Use `semantics { heading() }` for headings. Use `semantics { contentDescription = "..." }`. Use `Modifier.semantics { isTraversalGroup = true }` for grouping. |

**1.3.4 Orientation (Level AA)**

| Check | What to verify |
|-------|---------------|
| Orientation locking | The application does not lock to portrait or landscape unless essential to the content (e.g., a piano keyboard). |
| Responsive layout | The layout adapts correctly when the device orientation changes without data loss. |

**1.3.5 Identify Input Purpose (Level AA)**

| Check | What to verify |
|-------|---------------|
| Autofill hints | Text inputs for personal data (email, name, password, phone) include autofill hints so the system can auto-complete. Android: `android:autofillHints`. iOS: `textContentType`. Web: `autocomplete` attribute. |

**Severity if failed:** High.

---

### 1.4 Distinguishable

**1.4.1 Use of Color (Level A)**

| Check | What to verify |
|-------|---------------|
| Color as sole indicator | Color is not the only visual means of conveying information. Examples: error states use both a red color AND an icon or text label. Borrowed vs available titles are distinguished by more than color. |
| Charts | Chart data series are distinguishable by pattern or label, not only by color. |

**Severity if failed:** High (affects color-blind users, roughly 8% of males).

**1.4.3 Contrast (Minimum) (Level AA)**

| Check | What to verify |
|-------|---------------|
| Normal text | Text smaller than 18pt (or 14pt bold) must have a contrast ratio of at least 4.5:1 against the background. |
| Large text | Text 18pt or larger (or 14pt bold or larger) must have a contrast ratio of at least 3:1 against the background. |
| UI components | Interactive component boundaries (button borders, input field outlines, focus indicators) must have a contrast ratio of at least 3:1 against adjacent colors. |
| Icons | Informational icons must meet 3:1 contrast against background. |

**Measurement tools:** Android: Accessibility Scanner. iOS: Xcode Accessibility Inspector. Web: browser DevTools > Accessibility panel, or axe DevTools.

**Common failures:** Placeholder text in search and form fields (typically low contrast). Secondary text and metadata labels (author, date). Disabled button states that are too faint to read but not truly disabled (should meet 3:1 if the button is operable).

**Severity if failed:** Critical (for primary content), High (for secondary content and controls).

**1.4.4 Resize Text (Level AA)**

| Check | What to verify |
|-------|---------------|
| Dynamic type (iOS) | Text responds to the system large text setting. Set Dynamic Type to "Accessibility XL" and verify that text is readable and the layout does not break. |
| Font scale (Android) | Text responds to the system font scale setting. Set font scale to 1.3x and verify layout integrity. Text must not be clipped or overflow. |
| Web text resize | The page is usable when the browser default font size is increased to 200% without loss of content or functionality. Use relative units (rem, em) not fixed px for font sizes. |

**Severity if failed:** High.

**1.4.5 Images of Text (Level AA)**

| Check | What to verify |
|-------|---------------|
| Text rendered as images | Text is rendered as actual text, not as images of text (except for logos or where a specific visual presentation is essential). |

**Severity if failed:** Medium.

**1.4.10 Reflow (Level AA)**

| Check | What to verify |
|-------|---------------|
| Horizontal scrolling | At 320 CSS pixels viewport width (equivalent to 400% zoom on a 1280px-wide screen), content reflows to a single column without requiring horizontal scrolling, except for content that requires two-dimensional layout (e.g., tables, maps). |

**Severity if failed:** High (critical for low-vision users who zoom).

**1.4.11 Non-text Contrast (Level AA)**

| Check | What to verify |
|-------|---------------|
| Input borders | Form field outlines, checkbox borders, and radio button borders meet 3:1 contrast against the background. |
| Focus indicators | The visible focus indicator (keyboard or switch access focus ring) meets 3:1 contrast. |
| Icons | Icons that convey information (not purely decorative) meet 3:1 contrast. |

**Severity if failed:** High.

**1.4.12 Text Spacing (Level AA)**

| Check | What to verify |
|-------|---------------|
| Text spacing override | When all of these are applied simultaneously, no content or functionality is lost: line height 1.5x font size, letter spacing 0.12x font size, word spacing 0.16x font size, spacing after paragraphs 2x font size. |

**Severity if failed:** Medium.

---

## Principle 2: Operable

User interface components and navigation must be operable.

---

### 2.1 Keyboard Accessible

**2.1.1 Keyboard (Level A) — Web**

| Check | What to verify |
|-------|---------------|
| All functionality | Every function available by mouse is also available by keyboard alone (Tab, Enter, Space, arrow keys, Escape). |
| No keyboard trap | The patron can always move focus away from any component using only the keyboard. Modal dialogs are exempt if they trap focus correctly (focus must return on close). |

**Severity if failed:** Critical (blocks keyboard-only and switch access users).

**2.1.2 No Keyboard Trap (Level A)**

| Check | What to verify |
|-------|---------------|
| Focus escape | If keyboard focus can be moved to a component, it can be moved away using standard keys. |

**Severity if failed:** Critical.

---

### 2.2 Enough Time

**2.2.1 Timing Adjustable (Level A)**

| Check | What to verify |
|-------|---------------|
| Session timeout | If the application times out a session, the patron is warned at least 20 seconds before the timeout and can extend it. |
| Auto-advancing content | Carousels or auto-advancing content can be paused or stopped by the patron. |

**Severity if failed:** High.

---

### 2.3 Seizures and Physical Reactions

**2.3.1 Three Flashes or Below Threshold (Level A)**

| Check | What to verify |
|-------|---------------|
| Flashing content | No content flashes more than 3 times per second, or the flashing area is below the general flash threshold (less than 25% of any 341x256 pixel area). |

**Severity if failed:** Critical (risk of seizures for photosensitive users).

---

### 2.4 Navigable

**2.4.1 Bypass Blocks (Level A) — Web**

| Check | What to verify |
|-------|---------------|
| Skip link | A "Skip to main content" link is the first focusable element on every page. It is visually hidden by default but visible when focused. |

**Severity if failed:** High.

**2.4.3 Focus Order (Level A)**

| Check | What to verify |
|-------|---------------|
| Logical focus sequence | Focus moves in a meaningful order that preserves meaning and operation. Typically top-to-bottom, left-to-right. |
| Android | Verify TalkBack navigation order using `android:accessibilityTraversalAfter/Before` where needed. |
| iOS | Verify VoiceOver focus order; use `accessibilityElements` array on container views where the default order is wrong. |
| Web | Verify Tab order follows DOM order; no positive `tabindex` values that override natural order. |
| Compose | Use `Modifier.semantics { traversalIndex = n }` to override order only when DOM/composition order is insufficient. |

**Severity if failed:** High.

**2.4.4 Link Purpose (Level A)**

| Check | What to verify |
|-------|---------------|
| Descriptive links | Every link or button label conveys its purpose from the label alone or from the surrounding context. "Read more" and "Click here" are failures unless paired with a screen-reader-only label. |

**Severity if failed:** High.

**2.4.6 Headings and Labels (Level AA)**

| Check | What to verify |
|-------|---------------|
| Descriptive headings | Section headings describe the topic or purpose of the section. |
| Form labels | Every form input has a visible label. |

**Severity if failed:** Medium.

**2.4.7 Focus Visible (Level AA)**

| Check | What to verify |
|-------|---------------|
| Focus indicator | Any keyboard-operable interface has a visible focus indicator. The focused element must be visually distinguishable from the unfocused state. |
| Web | Default browser focus outlines must not be removed with `outline: none` unless replaced with a custom indicator that meets 3:1 contrast. |

**Severity if failed:** Critical (keyboard users cannot navigate without visible focus).

---

### 2.5 Input Modalities

**2.5.1 Pointer Gestures (Level A)**

| Check | What to verify |
|-------|---------------|
| Gesture alternatives | Functions that use multipoint or path-based gestures (e.g., swipe to delete, pinch to zoom) have a single-pointer alternative. |

**Severity if failed:** High (affects motor-impaired users using switch access or single tap).

**2.5.3 Label in Name (Level A)**

| Check | What to verify |
|-------|---------------|
| Label matches name | For buttons and links with visible text labels, the accessible name (content description / accessibility label / aria-label) starts with or matches the visible label text. Speech recognition users speak the visible label to activate the control. |

**Severity if failed:** High (blocks speech recognition users such as Dragon users).

**2.5.4 Motion Actuation (Level A)**

| Check | What to verify |
|-------|---------------|
| Shake/tilt alternatives | Functions activated by device motion (e.g., shake to undo) have a UI alternative. Device motion actuation can be disabled. |

**Severity if failed:** Medium.

---

## Principle 3: Understandable

Information and the operation of the user interface must be understandable.

---

### 3.1 Readable

**3.1.1 Language of Page (Level A) — Web**

| Check | What to verify |
|-------|---------------|
| HTML language attribute | The `<html>` element has a `lang` attribute set to the primary language of the page (e.g., `lang="en"`). |

**Severity if failed:** Medium (affects screen reader pronunciation).

---

### 3.2 Predictable

**3.2.1 On Focus (Level A)**

| Check | What to verify |
|-------|---------------|
| No context change on focus | Moving focus to a component does not cause a context change (e.g., page navigation, dialog opening). |

**3.2.2 On Input (Level A)**

| Check | What to verify |
|-------|---------------|
| No context change on input | Changing a control's value (e.g., a select menu or checkbox) does not automatically submit a form or navigate. Changes are confirmed by an explicit action (button press). |

**3.2.3 Consistent Navigation (Level AA)**

| Check | What to verify |
|-------|---------------|
| Consistent nav placement | Navigation elements that repeat across screens appear in the same relative order on each screen. |

**Severity for 3.2.x:** Medium to High depending on frequency of the pattern.

---

### 3.3 Input Assistance

**3.3.1 Error Identification (Level A)**

| Check | What to verify |
|-------|---------------|
| Error labeling | When a form error occurs, the field in error is identified, and the error is described in text. Color alone is not sufficient (red border without a text error message is a failure). |

**3.3.2 Labels or Instructions (Level A)**

| Check | What to verify |
|-------|---------------|
| Form instructions | Instructions required to complete a form field are provided before the field (not only in placeholder text, which disappears on input). |

**3.3.3 Error Suggestion (Level AA)**

| Check | What to verify |
|-------|---------------|
| Corrective suggestions | When an error is detected and suggestions for correction are known, the suggestion is provided (e.g., "Password must be at least 8 characters"). |

**3.3.4 Error Prevention (Level AA) — Forms with legal or financial consequences**

| Check | What to verify |
|-------|---------------|
| Reversible actions | Submissions that cause significant consequences (purchases, account deletion) are reversible, verifiable before submission, or include a confirmation step. |

**Severity for 3.3.x:** High for primary flows (login, borrow), Medium for secondary flows.

---

## Principle 4: Robust

Content must be robust enough that it can be interpreted by a wide variety of user agents, including assistive technologies.

---

### 4.1 Compatible

**4.1.2 Name, Role, Value (Level A)**

| Check | What to verify |
|-------|---------------|
| Custom components — Android | Custom `View` subclasses implement `AccessibilityDelegate` or use `ViewCompat.setAccessibilityDelegate`. Role, state, and value are announced. |
| Custom components — iOS | Custom `UIView` subclasses override `accessibilityLabel`, `accessibilityValue`, `accessibilityTraits`, and `accessibilityHint` as appropriate. |
| Custom components — Web | Custom interactive elements built from `<div>` or `<span>` use ARIA `role`, `aria-label`, `aria-expanded`, `aria-checked`, etc. to expose their semantics to assistive technology. |
| Compose | Custom composables use `Modifier.semantics { role = Role.Button; contentDescription = "..." }` and `stateDescription` for dynamic state. |
| Toggle states | Checkboxes, toggles, and expandable sections announce their current state (checked/unchecked, expanded/collapsed). |

**Severity if failed:** Critical for custom interactive components.

**4.1.3 Status Messages (Level AA)**

| Check | What to verify |
|-------|---------------|
| Non-focused status | Status messages (e.g., "Borrow succeeded," "Download complete," "3 results found") are announced by screen readers without moving focus to the message. |
| Android | Use `ViewCompat.announceForAccessibility(view, message)` or `AccessibilityEvent.TYPE_ANNOUNCEMENT`. |
| iOS | `UIAccessibility.post(notification: .announcement, argument: "Borrow succeeded")`. |
| Web | Status messages use ARIA live regions: `aria-live="polite"` for non-urgent, `aria-live="assertive"` for urgent. |
| Compose | Use `LocalAccessibilityManager.current?.sendStateChangeEvent` or `announceForAccessibility`. |

**Severity if failed:** High (screen reader users miss feedback that sighted users see visually).

---

## Mobile-specific considerations

### Touch target size

All interactive elements must be at least 48x48 density-independent pixels. This applies to buttons, list items, icons, checkboxes, and any tappable surface.

- Android: Set minimum size in layout XML or with `minHeight`/`minWidth`, or use `ViewCompat.setMinimumTouchDelegateSize`.
- iOS: Use `UIEdgeInsets` to expand the touch target beyond the visual bounds. Minimum 44x44 points.
- Compose: Use `Modifier.minimumInteractiveComponentSize()` (Compose 1.3+) or `Modifier.size(48.dp)`.
- CMP / compose-ios: Same as Compose — 48.dp minimum.

### Switch Access (Android) and Switch Control (iOS)

Verify that all interactive elements are reachable by switch access. Elements that are only reachable by gesture (e.g., swipe-to-dismiss) must have a switch-accessible alternative.

### Reduced motion

If the application includes animations, respect the system "reduce motion" preference.
- Android: `Settings.Global.TRANSITION_ANIMATION_SCALE` or `AnimatorDurationScale`.
- iOS: `UIAccessibility.isReduceMotionEnabled`.
- Web: `@media (prefers-reduced-motion: reduce)` CSS media query.

---

## Compose Multiplatform accessibility

### Semantics API

```kotlin
// Heading
Text("My Borrows", modifier = Modifier.semantics { heading() })

// Button with custom description
Icon(
    imageVector = Icons.Default.PlayArrow,
    contentDescription = null,
    modifier = Modifier.semantics { contentDescription = "Play Dune audiobook" }
)

// Toggle state
Switch(
    checked = isDownloaded,
    onCheckedChange = { ... },
    modifier = Modifier.semantics {
        stateDescription = if (isDownloaded) "Downloaded" else "Not downloaded"
        contentDescription = "Download for offline access"
    }
)

// Grouping related elements
Column(
    modifier = Modifier.semantics(mergeDescendants = true) { }
) {
    Text("Dune")
    Text("Frank Herbert")
    Text("Audiobook")
}
```

### Test tags

Use `Modifier.testTag("borrow-button")` for all interactive elements. The Test Agent relies on stable test tags for compose-test automation.

### Known CMP accessibility gaps

- `compose-ios` accessibility support is improving with each release. Some complex semantics (multi-select, custom roles) may require native `UIAccessibility` overrides via the interop layer.
- `compose-web` (wasm) accessibility is at an earlier maturity level than Android Compose. Audit carefully for ARIA role mapping.
- Always test on device, not only in the emulator. Screen readers behave differently on physical devices.

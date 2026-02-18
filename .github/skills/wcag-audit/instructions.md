# Skill: WCAG Audit

## Purpose

This skill provides the structured checklist for auditing mobile (Android, iOS) and web applications against WCAG 2.1 Level AA. Use it when producing accessibility findings and when writing acceptance criteria for remediation stories.

---

## Severity definitions

- **Critical:** The failure prevents a user with a disability from completing a key task. The feature is effectively unusable for that user group.
- **High:** The failure creates a significant barrier. A determined user may find a workaround but must exert substantial additional effort.
- **Medium:** The failure creates inconvenience or confusion. Core functionality remains accessible but the experience is degraded.
- **Low:** The failure violates best practice. The impact is minor and limited to edge cases.

---

## Output format per finding

```
Screen / flow name:
Platform(s):
WCAG criterion: [criterion name + 2.1 AA identifier, e.g., "Non-text Content 1.1.1"]
Issue description: [what is wrong, observed on which element]
Severity: [Critical / High / Medium / Low]
Remediation: [1-3 sentences, concrete action]
```

---

## Principle 1: Perceivable

### 1.1.1 Non-text Content (Level A)

| Check | What to verify |
|-------|---------------|
| Images | Every `ImageView` (Android), `UIImageView` (iOS), or `<img>` (web) that conveys information has a non-empty content description / accessibility label / `alt` attribute. |
| Decorative images | Images that are purely decorative have an empty content description so screen readers skip them. |
| Icons | Icon-only buttons (play, bookmark, share) have a content description that conveys the action. Example: "Play" not "triangle pointing right." |
| Cover art | Book/movie covers have labels that include the title and media type. Example: "Dune, ebook cover." |

Common failures: cover art with null content description; icon buttons with generic labels ("button" or "image"); rating stars with no numeric equivalent.

Severity if failed: Critical (interactive controls), High (informational images).

### 1.2.2 Captions, Prerecorded (Level A)

| Check | What to verify |
|-------|---------------|
| Captions on video | All prerecorded video content has synchronized captions. |
| Caption accuracy | Captions are accurate, not auto-generated without review, and synchronized within 2 seconds of audio. |

Severity if failed: Critical for deaf and hard-of-hearing users.

### 1.2.5 Audio Description, Prerecorded (Level AA)

| Check | What to verify |
|-------|---------------|
| Audio descriptions | Video content where significant visual information is not conveyed through the soundtrack has an audio description track available. |

Severity if failed: High for blind users.

### 1.3.1 Info and Relationships (Level A)

| Check | Platform-specific requirement |
|-------|------------------------------|
| Android | Use `accessibilityHeading = true` for heading-level elements. Group related controls with descriptive container content descriptions. |
| iOS | Set `accessibilityTraits = .header` for heading-level elements. Use `accessibilityElements` to order elements correctly. |
| Web | Use `<h1>`-`<h6>` for headings. Use `<ul>/<ol>/<li>` for lists. Use `<label>` for form inputs. Use ARIA landmark roles. |
| Compose / CMP | Use `semantics { heading() }` for headings. Use `Modifier.semantics { isTraversalGroup = true }` for grouping. |

### 1.3.4 Orientation (Level AA)

The application must not lock to portrait or landscape unless essential to the content. Layout must adapt when orientation changes without data loss.

### 1.4.1 Use of Color (Level A)

Color is not the only visual means of conveying information. Error states use both a red color and an icon or text label. Borrowed vs available titles are distinguished by more than color.

Severity if failed: High (affects roughly 8% of males who are color-blind).

### 1.4.3 Contrast Minimum (Level AA)

| Text size | Required contrast ratio |
|-----------|------------------------|
| Normal text (below 18pt / 14pt bold) | 4.5:1 against background |
| Large text (18pt or larger / 14pt bold or larger) | 3:1 against background |
| UI component boundaries and icons | 3:1 against adjacent colors |

Measurement tools: Android Accessibility Scanner; iOS Xcode Accessibility Inspector; Web: browser DevTools or axe DevTools.

Common failures: placeholder text in search and form fields; secondary text and metadata labels; disabled button states that are too faint but still technically operable.

Severity if failed: Critical (primary content), High (secondary content and controls).

### 1.4.4 Resize Text (Level AA)

- iOS: test with Dynamic Type set to "Accessibility XL." Text must be readable and the layout must not break.
- Android: test with font scale set to 1.3x. Text must not be clipped or overflow.
- Web: page must be usable when the browser default font size is increased to 200%. Use relative units (rem, em), not fixed px.

### 1.4.10 Reflow (Level AA)

At 320 CSS pixels viewport width (equivalent to 400% zoom on a 1280px-wide screen), content reflows to a single column without horizontal scrolling, except for content that requires two-dimensional layout (tables, maps).

Severity if failed: High for low-vision users who zoom.

### 1.4.11 Non-text Contrast (Level AA)

Form field outlines, checkbox borders, focus indicators, and informational icons must meet 3:1 contrast against adjacent colors.

---

## Principle 2: Operable

### 2.1.1 Keyboard (Level A) — Web

Every function available by mouse is also available by keyboard alone (Tab, Enter, Space, arrow keys, Escape). No keyboard trap.

Severity if failed: Critical — blocks keyboard-only and switch access users.

### 2.2.1 Timing Adjustable (Level A)

If the application times out a session, the patron is warned at least 20 seconds before the timeout and can extend it. Auto-advancing carousels can be paused or stopped.

### 2.4.3 Focus Order (Level A)

Focus moves in a meaningful order that preserves meaning. Typically top-to-bottom, left-to-right.

- Android: verify TalkBack navigation order; use `android:accessibilityTraversalAfter/Before` where needed.
- iOS: verify VoiceOver focus order; use `accessibilityElements` array where default order is wrong.
- Web: verify Tab order follows DOM order; no positive `tabindex` values that override natural order.
- Compose: use `Modifier.semantics { traversalIndex = n }` to override order only when composition order is insufficient.

### 2.4.7 Focus Visible (Level AA)

Any keyboard-operable interface has a visible focus indicator. The focused element must be visually distinguishable from the unfocused state. On web, `outline: none` must not be removed unless replaced with a custom indicator that meets 3:1 contrast.

Severity if failed: Critical — keyboard users cannot navigate without visible focus.

### 2.5.1 Pointer Gestures (Level A)

Functions that use multipoint or path-based gestures (swipe to delete, pinch to zoom) have a single-pointer alternative.

### 2.5.3 Label in Name (Level A)

For buttons and links with visible text labels, the accessible name starts with or matches the visible label text. Speech recognition users speak the visible label to activate the control.

---

## Principle 3: Understandable

### 3.3.1 Error Identification (Level A)

When a form error occurs, the field in error is identified and the error is described in text. A red border without a text error message is a failure.

### 3.3.2 Labels or Instructions (Level A)

Instructions required to complete a form field are provided before the field. Placeholder text is not a substitute — it disappears on input.

### 3.3.3 Error Suggestion (Level AA)

When an error is detected and correction suggestions are known, the suggestion is provided. Example: "Password must be at least 8 characters."

---

## Principle 4: Robust

### 4.1.2 Name, Role, Value (Level A)

| Platform | Requirement |
|---------|-------------|
| Android | Custom `View` subclasses implement `AccessibilityDelegate` or use `ViewCompat.setAccessibilityDelegate`. Role, state, and value are announced. |
| iOS | Custom `UIView` subclasses override `accessibilityLabel`, `accessibilityValue`, `accessibilityTraits`, and `accessibilityHint` as appropriate. |
| Web | Custom interactive elements built from `<div>` or `<span>` use ARIA `role`, `aria-label`, `aria-expanded`, `aria-checked`, etc. |
| Compose | Custom composables use `Modifier.semantics { role = Role.Button; contentDescription = "..." }` and `stateDescription` for dynamic state. |

Severity if failed: Critical for custom interactive components.

### 4.1.3 Status Messages (Level AA)

Status messages ("Borrow succeeded," "Download complete," "3 results found") are announced by screen readers without moving focus to the message.

- Android: `ViewCompat.announceForAccessibility(view, message)`.
- iOS: `UIAccessibility.post(notification: .announcement, argument: "Borrow succeeded")`.
- Web: `aria-live="polite"` for non-urgent, `aria-live="assertive"` for urgent.
- Compose: `LocalAccessibilityManager.current?.sendStateChangeEvent`.

---

## Mobile-specific checks

### Touch target size

All interactive elements must be at least 48x48 density-independent pixels.

- Android: `minHeight`/`minWidth`, or `ViewCompat.setMinimumTouchDelegateSize`.
- iOS: minimum 44x44 points. Use `UIEdgeInsets` to expand touch target beyond visual bounds.
- Compose: `Modifier.minimumInteractiveComponentSize()` (Compose 1.3+) or `Modifier.size(48.dp)`.
- TV (Android TV / Compose TV): minimum 80x80 dp.

### Reduced motion

Respect the system "reduce motion" preference.
- Android: check `AnimatorDurationScale`.
- iOS: check `UIAccessibility.isReduceMotionEnabled`.
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
Column(modifier = Modifier.semantics(mergeDescendants = true) { }) {
    Text("Dune")
    Text("Frank Herbert")
    Text("Audiobook")
}
```

### Test tags

Use `Modifier.testTag("borrow-button")` for all interactive elements. The Test Agent relies on stable test tags for compose-test automation.

### Known CMP accessibility gaps

- compose-ios accessibility support is improving with each release. Some complex semantics (multi-select, custom roles) may require native UIAccessibility overrides via the interop layer.
- compose-web (wasm) accessibility is at an earlier maturity level. Audit carefully for ARIA role mapping.
- Always test on a physical device, not only in the emulator. Screen readers behave differently on physical hardware.

---

## Automated checks in Gate 5

The Quality Gate evaluates these WCAG criteria automatically for UI-bearing stories:

| Criterion | ID | Check |
|-----------|----|-------|
| Contrast minimum | 1.4.3 | Color pair contrast ratio >= 4.5:1 |
| Text resize | 1.4.4 | Text elements use sp units, not dp or px |
| Non-text contrast | 1.4.11 | UI component outlines >= 3:1 |
| Keyboard (D-pad) | 2.1.1 | All interactive elements reachable via D-pad on TV targets |
| Focus order | 2.4.3 | Focus traversal follows logical reading order |
| Labels or instructions | 3.3.2 | All form inputs have associated labels |
| Name, Role, Value | 4.1.2 | All interactive components have content descriptions |
| Tap target size | Platform NFR | Tap targets >= 48x48 dp (mobile); >= 80x80 dp (TV) |

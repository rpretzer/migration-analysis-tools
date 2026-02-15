---
name: migration-wcag-audit
description: Audits mobile apps against WCAG 2.1 AA for accessibility. Use when assessing iOS or Android screens for perceivable, operable, understandable, and robust requirements. Produces WCAG_AUDIT.md with per-screen issues, severity, and remediation.
---

# Mobile WCAG AA Audit

## Per-screen checklist

### Perceivable
- Color contrast (≥4.5:1 text)
- Text size, dynamic type support
- Images with contentDescription / accessibilityLabel
- Captions or transcripts where applicable

### Operable
- Tap targets ≥48×48dp
- Consistent focus order
- VoiceOver/TalkBack support
- Gesture alternatives where needed

### Understandable
- Clear labels
- Predictable navigation
- Error messaging, form validation clarity

### Robust
- VoiceOver/TalkBack compatibility
- OS accessibility settings respected

## Output format per screen

- **Screen / flow name**
- **Platform(s)**
- **WCAG issues**: description + criterion ID (e.g., 1.4.3)
- **Severity**: Critical, High, Medium, Low
- **Remediation**: 1–3 sentences

## Include

Screenshots or diagrams for every screen — offshore teams may not have the app installed.

---
name: migration-story-writing
description: Writes user stories for mobile migration work with Gherkin acceptance criteria. Use when creating stories for KMP extraction, native modernization, WCAG fixes, observability, or testing. Follows the template in docs/USER_STORY_TEMPLATE.md.
---

# Migration Story Writing

## Template structure

- **Title** — Short, action-oriented
- **Story** — As a [role], I want [goal] so that [value]
- **Context / Background** — 1–3 sentences
- **In scope** / **Out of scope** — Bullet lists
- **Acceptance Criteria** — Given/When/Then (Gherkin)
- **Non-functional requirements** — Performance, Accessibility, Observability, Testing
- **Dependencies** / **Assumptions**
- **Effort estimate** — Fibonacci (1, 2, 3, 5, 8, 13)
- **Estimation drivers** — Complexity, uncertainty, cross-platform impact

## Gherkin format

```
Given <precondition>
When <action>
Then <expected outcome>
```

Use multiple scenarios when needed. ACs must be testable by someone who has never seen the app.

## NFRs per story

- **Performance**: Latency, frame rate, or "Not applicable"
- **Accessibility**: WCAG requirements or "Not applicable"
- **Observability**: Logging, tracing, or "Not applicable"
- **Testing**: Unit/integration/UI coverage expectations

## Process

1. Generate 3–5 sample stories first; get client review
2. Only then generate the full set
3. Include reference story per point value for calibration

## Reference

- Template: `docs/USER_STORY_TEMPLATE.md`
- Examples: `stories/*.md`

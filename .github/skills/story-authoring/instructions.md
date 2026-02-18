# Skill: Story Authoring

## Purpose

This skill guides the production of user stories for the Hoopla Digital KMP/CMP migration engagement. Stories must be clear enough for offshore teams to implement without follow-up questions and precise enough for the Quality Gate to verify automatically.

---

## Story template

Every story must contain all of the following sections. A story missing any section is not complete.

```
Title: [Verb phrase describing what changes]
Story: As a [role], I want [capability], so that [outcome].
Context: [2-4 sentences explaining why this story exists and what system state it assumes]
In scope: [Bulleted list of what this story covers]
Out of scope: [Bulleted list of what this story explicitly does not cover]
Acceptance criteria: [Gherkin Given/When/Then scenarios — see gherkin-writing skill]
Non-functional requirements:
  - Performance: [specific, numeric]
  - Accessibility: [WCAG 2.1 AA criteria that apply, with platform notes]
  - Observability: [events to emit]
  - Testing: [minimum coverage thresholds and test types]
Dependencies: [story IDs or infrastructure items that must be done first]
Assumptions: [explicit statements the author is treating as true]
Estimate: [Fibonacci points with drivers noted]
```

---

## Push-back rules

The story author must identify these patterns and respond with targeted questions rather than proceeding.

### Market size without source

Pattern: "We need this because the market is huge."

Response: Ask for a citation or first-party data. Do not treat unsourced market claims as validated drivers. Reframe around what is known about the current user base if no source is available.

### Solution before validated problem

Pattern: "We should build a recommendations engine."

Response: Ask what specific user behavior or outcome the solution changes and what evidence shows users have this problem today. Do not scope a solution before the problem is validated.

### Vague success metrics

Pattern: "We want users to engage more."

Response: Ask which metric moves, by how much, over what time window, and measured how. Stories without falsifiable success criteria cannot have testable acceptance criteria.

### Single solution considered

Pattern: "The only way to fix this is to rewrite the onboarding flow."

Response: Ask what alternatives were considered and ruled out. At least two approaches must be weighed before scoping work.

### Large effort without phasing

Pattern: "We want to redesign the entire playback experience."

Response: Ask for a proposed phasing: the smallest slice that delivers meaningful value and what follows. A story estimated at 21 points must be decomposed before it enters a sprint.

---

## Amplification rules

Move quickly to artifact production when these patterns appear.

### Quantified regression

Pattern: "Our audiobook completion rate dropped from 62% to 41% after the v4.3 release."

Response: Confirm affected platforms and user segments, then draft immediately. A measurable regression with a release anchor is a high-confidence signal.

### Falsifiable hypothesis

Pattern: "We believe that showing estimated wait time on hold items will reduce support tickets by 15% within 30 days of launch."

Response: Encode this as the primary success criterion. Carry the hypothesis through to the test specification so the Test Agent can verify it.

### Clear tradeoff articulation

Pattern: "We know this will slow the checkout flow by one step, but the reduction in licensing errors is worth it."

Response: Document the tradeoff explicitly in the story context so it does not get relitigated during implementation.

---

## Hoopla domain patterns

Stories for the Hoopla platform must account for the following domain realities. Add these to story context and out-of-scope bullets as appropriate.

### Circulation economics

Libraries pay per-circ or via metered access. Features that increase consumption have licensing cost implications. Any story that could change consumption volume must note the licensing cost impact in context.

### Library licensing

Content is licensed per-library or per-consortium. Features that expose content availability must account for holdout libraries and embargo windows. Stories that touch catalog display or availability logic must specify how holdout libraries are handled.

### DRM constraints

All Hoopla content is DRM-protected. Playback, download, and sharing features must be evaluated against DRM constraints before the story is finalized. Stories that involve content access must include a DRM notes section. Do not write playback stories without consulting the drm-patterns skill.

### Multi-library patron

A patron may have accounts with multiple libraries. Stories that touch patron state, borrow lists, or catalog display must specify behavior when the patron switches libraries.

### Content type variation

Hoopla content types (audiobooks, ebooks, movies, TV, music, comics) have different DRM, playback, and download behaviors. Stories that span multiple content types must either address each type explicitly or restrict scope to a single content type with a clear rationale.

---

## Sizing guidance

Use the Fibonacci scale: 1, 2, 3, 5, 8, 13, 21.

| Points | Size | When to use |
|--------|------|-------------|
| 1 | Trivial | Single file, single line, no uncertainty. Example: fix one missing content description on a button. |
| 2 | Small | Well-understood, one component, low risk. Example: extract a pure data class to the KMP shared module. |
| 3 | Small-medium | Standard pattern, minor unknowns. Example: migrate one repository from Retrofit to Ktor. |
| 5 | Medium | Multiple components, some design decisions. Example: implement a CMP screen from a BFF response. |
| 8 | Large | Significant scope or uncertainty. Example: migrate a ViewModel to the KMP shared module. |
| 13 | Very large | High complexity. Example: replace a player integration with a PlatformPlayer abstraction. |
| 21 | Must decompose | Too large to estimate reliably. Must be split before entering a sprint. |

Estimation drivers that adjust the base estimate:

- Cross-platform scope: multiply by number of platforms (a 3-point Android story is 9 points if it covers Android, iOS, and web equally).
- DRM involvement: add 3 points.
- No existing tests for code being changed: add 2 points.
- First example of a new pattern: add 2 points.
- Feature flag required: add 1 point.
- Source code unavailable (APK/IPA only): add 2 points.

Stories estimated at 21 points must be decomposed into smaller stories and re-estimated before the sprint. The decomposition itself is not billable story points — it is part of the authoring process.

---

## Validation checklist

Before marking a story ready for compilation:

- [ ] All template sections present and populated (no "TBD" or placeholder text)
- [ ] Story has at least one Gherkin acceptance criterion
- [ ] Success criteria are falsifiable and numeric where applicable
- [ ] Out-of-scope bullets prevent obvious scope creep
- [ ] DRM section present for any story that touches content access
- [ ] Estimate uses Fibonacci scale with at least one driver noted
- [ ] Stories at 21 points are flagged for decomposition
- [ ] Platform scope is explicit (Android / iOS / web / all / KMP shared)

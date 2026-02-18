# Business Case Artifact Schema

**Version:** 1.0
**Producer:** Coach agent
**Consumers:** Spec Compiler, PM/PO review gate, Lead Analyst
**Purpose:** Ground a feature or product request in business reality before any technical work begins. This document is the source of truth for *why* a feature exists.

---

## Overview

The business case is a human-readable document written in plain English. It is not a technical spec. Its job is to establish that a problem is real, that the proposed solution direction is plausible, and that success can be measured. Any agent or human reviewer reading this document should be able to answer: "Is this worth building?"

The Coach agent produces this document through a structured conversation with the PM. The PM is the author of record; the Coach is the editor.

---

## Required Sections

All sections below must be present and non-empty. A section is considered empty if it contains only a placeholder, a heading with no body, or text equivalent to "TBD" without a committed follow-up date.

---

### Title

A short, human-readable name for the initiative. 3–8 words. Not a feature ID.

**Example (passes):** "Offline Audiobook Download for Patrons"
**Example (fails):** "Feature X" or "Q2 Initiative"

---

### Problem Statement

Describe who has this problem, how severely it affects them, how they currently work around it, and what is broken about that workaround. This section must reference evidence — not opinion or assumption.

**Acceptable evidence sources:**
- Quantitative data: analytics events, crash rates, funnel drop-off metrics
- Qualitative data: support ticket themes, user interview quotes, NPS verbatims
- Operational data: library consortium feedback, staff escalations
- Competitive signals: documented user complaints about a competitor's absent feature

**Evidence must be cited inline.** Phrases like "users are frustrated" or "we know this is a problem" without a citation fail validation.

**Example (passes):**
> Hoopla patrons on mobile lose access to in-progress audiobooks when connectivity drops below 3G. Support tickets citing "audiobook stopped working on the subway" account for 14% of mobile support volume (847 tickets, Q3 2025). Users currently work around this by downloading MP3s from library websites when available — a workflow that bypasses Hoopla entirely and is unavailable for 60% of the catalog.

**Example (fails):**
> Users want offline access. This is a commonly requested feature and would improve satisfaction.

---

### Target Users

Identify the specific user segments affected by this problem. Generic descriptions ("our users") fail.

For Hoopla Digital, valid segment names include:
- **Patrons** — end users borrowing content through a library
- **Library staff** — librarians and administrators managing a single library's account
- **Consortium administrators** — administrators managing groups of libraries
- **Hoopla internal ops** — Hoopla employees managing catalog, billing, or support
- **New patron onboarding** — patrons in their first 30 days (distinct behavior profile)

List each affected segment and describe briefly how the problem manifests for that segment.

---

### Opportunity Size

Quantify the potential impact of solving this problem. "Large market opportunity" without numbers fails validation.

**Required:** at least one number with a stated methodology.

**Preferred methodology (bottom-up):**
```
Count of affected users
× Expected behavior change
= Impact in measurable units
```

**Example (passes):**
> 2.3M active Hoopla patrons use mobile as their primary device (source: Q3 2025 platform analytics). Of these, 38% live in metro areas with frequent transit commutes (US Census commute data). If offline access increases audiobook session completion rate from 41% to 55% for this segment, that is approximately 500K additional completed sessions per month — a proxy for renewal intent.

**Example (fails):**
> Offline access is a large market opportunity. Competitors like Libby already offer it.

If precise data is unavailable, state the proxy metric and its limitations explicitly. Do not omit the section.

---

### Proposed Solution (High Level)

1–3 sentences describing a direction, not a spec. The goal is to establish what category of solution is being proposed so the Spec Compiler and engineering teams have a starting orientation.

Multiple options are encouraged when the direction is genuinely uncertain. Present options as a numbered list with 1 sentence each.

**What this section is not:** a wireframe description, a list of API endpoints, a technology choice, or an implementation plan.

**Example (passes):**
> Allow patrons to pre-download audiobook files to their device for offline playback within the existing Hoopla app. Option A: full-file download before departure. Option B: predictive pre-fetch based on listening history and calendar data.

**Example (fails):**
> We will add an offline mode using a local SQLite cache synced via background URLSession tasks on iOS and WorkManager on Android, exposing a new `/downloads` REST endpoint.

---

### Success Metrics

Measurable outcomes with numeric targets and timeframes. Vague engagement metrics fail.

**Each metric must include:**
- What is being measured (a specific, trackable event or rate)
- The current baseline value (or state "baseline TBD — analytics instrumentation required")
- The target value
- The timeframe for achieving the target

**Example (passes):**
- Audiobook completion rate (mobile, metro patrons): 41% → 55% within 60 days of launch
- Mobile support ticket volume (connectivity-related): reduce by 30% within 90 days
- Offline session starts per MAU: 0 → 0.8 within 30 days of launch

**Example (fails):**
- Improve patron engagement
- Reduce support burden
- Better user experience metrics

---

### Feature Flag Strategy

Describe how this feature will be rolled out and how it can be reversed if needed. This section is required for any change that reaches production, including backend changes that affect patron-facing behavior.

**Required elements:**
- Flag key name (can be a placeholder if not yet assigned, e.g., `offline_audiobook_download`)
- Initial rollout target (percentage of users, or specific audience segment)
- Planned rollout progression (e.g., 1% → 5% → 25% → 100% with stated intervals)
- Kill switch criteria: specific conditions under which the flag would be turned off immediately (error rate threshold, crash rate, support volume spike)

**Example (passes):**
> Flag key: `offline_audiobook_v1`. Initial rollout: 1% of active mobile patrons (Android only). Progression: 1% → 10% at 7 days if crash rate remains below 0.5% and offline session error rate below 5%. → 100% at 14 days. Kill switch: roll back immediately if crash rate exceeds 1.5% or download failure rate exceeds 20% in any 4-hour window.

**For infrastructure or non-production-facing stories:** write "N/A — internal tooling only" with a brief explanation. Do not leave the section empty.

---

### Risks and Assumptions

A numbered list. Each item must include:
- A description of the risk or assumption
- Risk level: **High**, **Medium**, or **Low**
- A mitigation strategy or validation approach

Minimum: 2 items. There is no maximum. Unstated assumptions are a defect.

**Example:**
1. *Assumption (Medium)*: Patron devices have sufficient local storage for full audiobook files (average 200–400 MB). Mitigation: Storage check before download with clear user messaging; offer compressed codec option.
2. *Risk (High)*: DRM licensing terms with content partners may restrict offline playback. Mitigation: Legal review of existing contracts before development begins; flag as go/no-go dependency.
3. *Assumption (Low)*: Patrons in metro areas have Wi-Fi at home to pre-download. Validation: Survey 200 patrons in target segment before launch.

---

### Recommendation

A single, clear recommendation from the Coach agent, with rationale.

**Valid values:**
- **Go** — evidence supports proceeding to spec. State the key reasons.
- **No-go** — evidence does not support proceeding. State what would need to change.
- **Needs more data** — a specific gap prevents a recommendation. State exactly what data is needed, who owns gathering it, and by when.

**Example (passes):**
> **Go.** Support ticket volume and session completion data confirm the problem is real and material. Legal review of DRM terms is the critical path dependency — schedule this before Spec Compiler begins.

**Example (fails):**
> We recommend moving forward with this feature as it aligns with our product strategy.

---

## Validation Rules

An artifact fails validation if any of the following are true. Failing artifacts are returned to the Coach agent for revision before proceeding downstream.

| Rule | Check |
|------|-------|
| All sections present | Every heading above has non-empty body text |
| Evidence in Problem Statement | At least one cited source (data, ticket count, quote, metric) |
| Opportunity Size contains a number | At least one numeric value with stated methodology |
| Success Metrics are measurable | Each metric has a numeric target and a timeframe |
| Minimum 2 risks listed | Risks and Assumptions section has at least 2 numbered items |
| Feature Flag Strategy present | Section is non-empty; "N/A" only if non-production with explanation |
| Recommendation is one of three values | Go / No-go / Needs more data |

---

## Downstream Usage

- **Spec Compiler** reads Problem Statement, Target Users, and Success Metrics to seed acceptance criteria.
- **Lead Analyst** reads Opportunity Size and Recommendation at the post-Phase 1 gate.
- **Story-writer agent** reads Feature Flag Strategy to populate the Feature Flag field in each story draft.
- **Risks and Assumptions** carry forward to the Critical Path Analysis risk audit.

# Story Draft Artifact Schema

**Version:** 1.0
**Producer:** Coach agent (with PM as author of record)
**Consumers:** Spec Compiler, story-writer agent, Lead Analyst review gate
**Purpose:** Define the structure of a user story before acceptance criteria are added. This is the handoff document from the PM-facing conversation to the technical spec pipeline.

---

## Overview

A story draft is what the Coach agent produces through a structured conversation with the PM. It captures business intent, scope boundaries, and platform context in human-readable form. It does not contain Gherkin acceptance criteria, non-functional requirements, or implementation detail — those are added by the Spec Compiler in the next pipeline stage.

The PM is the author of record. The Coach is the editor who enforces structure and completeness. A Spec Compiler reading only this document should know exactly what to build the acceptance criteria around.

Each story draft represents one deliverable unit of user-facing or system-facing value. Stories that are too large to ship independently should be split before the draft is submitted.

**One file, one story.** When the Coach produces multiple stories in a session, each story is a separate artifact. A collection of story drafts may be bundled for review, but each story must be independently valid.

---

## Required Fields

All fields below must be present in each story draft. Optional annotations are marked explicitly. All other fields are required.

---

### Story ID

**Format:** `{Epic-letter}-{number}` where:
- Epic letter is a single uppercase letter (A through Z) assigned to the epic this story belongs to
- Number is a positive integer unique within the epic

**Examples:** `A-1`, `B-12`, `C-3`

Epic letter assignments are defined in the project's epic registry. If an epic has not yet been assigned a letter, use a placeholder (`?-1`) and note that the epic registry must be updated before Jira import.

Story IDs are permanent once assigned. If a story is split, the original ID is retired and new IDs are assigned to the child stories.

---

### Title

A concise, action-oriented title of 4–10 words. The title should describe what the user or system does, not what the engineer builds.

**Example (passes):** "Pre-download Audiobook for Offline Playback"
**Example (fails):** "Offline Mode" (too vague) or "Implement URLSession background download task with local cache" (technical, not user-facing)

---

### Story

The standard user story sentence. Must follow this exact format:

> As a {user type}, I want {goal}, so that {value}.

**{user type}** must be a specific segment, not a generic role. "user" fails. Valid values for Hoopla Digital: patron, library staff member, consortium administrator, Hoopla ops team member, new patron (first 30 days).

**{goal}** must be an action the user takes or an outcome they experience — not a feature name.

**{value}** must state a concrete benefit. "so that it works better" fails. "so that I can finish listening during my commute even when I lose signal" passes.

**Example (passes):**
> As a patron, I want to download an audiobook to my phone before leaving home, so that I can listen during my subway commute without an internet connection.

**Example (fails):**
> As a user, I want offline mode, so that it works offline.

---

### Context

1–3 sentences explaining why this story matters now. This is not a restatement of the story sentence. It provides the business reason, timing signal, or user research finding that makes this story urgent or important.

**Example (passes):**
> Connectivity-related support tickets represent 14% of mobile support volume (Q3 2025). Library patrons in transit-heavy metro areas have asked for offline access in three consecutive NPS survey cycles. Libby's launch of server-side download queuing in February 2026 raises the competitive stakes.

**Example (fails):**
> This is an important feature for our users.

---

### Scope

A bullet list of what is explicitly included in this story. Minimum: 2 items. Each bullet should be specific enough that an engineer can write a test for it.

**Example (passes):**
- Patron can initiate a download for any audiobook they have an active borrow on
- Download progress is shown as a percentage in the library shelf view
- Downloaded audiobook is playable without a network connection
- Downloaded file persists across app restarts until the borrow expires or the patron deletes it

**Example (fails):**
- Download functionality
- Good UX

---

### Out of Scope

A bullet list of what is explicitly excluded from this story. Minimum: 1 item. This section prevents scope creep and ensures the Spec Compiler does not generate acceptance criteria for work not intended in this story.

State exclusions in terms of user-visible behaviors or system behaviors, not engineering implementation choices.

**Example (passes):**
- Video content is not included in this story; audiobooks only
- Background download while the app is closed is not in scope (foreground download only)
- Android TV and tablet form factors are excluded; phone only
- Download queue management (reordering, cancellation of queued items) is a separate story

**Example (fails):**
- Out of scope: future work

---

### Platform

Which platforms this story targets. Must be one or more of the following values:

| Value | Meaning |
|-------|---------|
| `Android` | Android phone and standard tablet only (not TV unless stated) |
| `Android TV` | Android TV / Leanback specifically |
| `iOS` | iPhone and standard iPad only |
| `Web` | Browser-based web app |
| `KMP shared` | Kotlin Multiplatform shared module (no UI; business logic, networking, or data layer) |
| `All` | All of the above (use only when genuinely cross-platform) |

When a story spans multiple platforms with different scope on each, list each platform separately and annotate the difference.

**Example:**
> Platform: Android, iOS — both phone form factors. Android TV is explicitly out of scope (see Out of Scope section).

**Example (KMP story):**
> Platform: KMP shared — this story creates the shared download state machine. Platform-specific UI stories are A-8 (Android) and A-9 (iOS).

---

### Feature Flag

The feature flag key name and rollout strategy for this story. This field is required for all stories that ship production-facing changes.

**Format:**
```
Flag key: {flag_key_name}
Rollout: {initial percentage or audience} → {progression} → {100%}
Kill switch: {specific condition for immediate rollback}
```

If the flag key has not yet been assigned, use the placeholder from the business case and note it must be finalized before implementation begins.

**For non-production stories** (infrastructure, internal tooling, CI improvements, KMP shared modules with no user-visible surface): write `N/A — {brief explanation}`. Do not leave the field empty.

**Example (production-facing):**
```
Flag key: offline_audiobook_v1
Rollout: 1% of active mobile patrons (Android only) → 10% at day 7 if error rate < 5% → 100% at day 14
Kill switch: roll back if download failure rate exceeds 20% in any 4-hour window
```

**Example (non-production):**
```
N/A — KMP shared module with no user-visible surface. UI integration stories carry their own flags.
```

---

### Analytics Events

A list of analytics events this story is expected to emit. Each event must include the event name and the condition that triggers it.

This field serves two purposes: it prevents analytics gaps from being discovered after launch, and it gives the Spec Compiler the inputs needed to write observable acceptance criteria.

**Format per event:**
```
- {event_name}: triggered when {condition}
```

If the analytics inventory has not been completed (common early in a project), use the placeholder:
> TBD — pending analytics inventory. Coach to revisit after repo access is granted.

This is the only field where a placeholder is acceptable without a follow-up date, because analytics event naming depends on existing conventions in the codebase.

**Example (passes):**
- `audiobook_download_initiated`: triggered when patron taps the download button for a specific title
- `audiobook_download_completed`: triggered when the full file is written to local storage successfully
- `audiobook_download_failed`: triggered when a download fails, with error category as a property
- `offline_playback_started`: triggered when playback begins from a local file rather than a stream
- `offline_playback_resumed`: triggered when playback resumes after an app restart using a local file

**Example (fails):**
- Download events
- Playback events

---

## Validation Rules

An artifact fails validation if any of the following are true. Failing drafts are returned to the Coach for revision before being passed to the Spec Compiler.

| Rule | Check |
|------|-------|
| Story ID matches pattern | Format is `letter-number` (e.g., A-1); placeholder `?-number` requires epic registry update before Jira import |
| Story follows required format | Contains "As a", "I want", "so that" — all three components present |
| User type is specific | Not "user" or "customer" without qualification |
| Platform is a valid value | One or more of: Android, Android TV, iOS, Web, KMP shared, All |
| Feature Flag is present | Non-empty; "N/A" only with explanation |
| At least 2 in-scope items | Scope section has minimum 2 bullets |
| At least 1 out-of-scope item | Out of Scope section has minimum 1 bullet |
| Context is present | Not a restatement of the story sentence |
| Analytics Events are present | Not empty; placeholder "TBD — pending analytics inventory" is acceptable |

---

## Downstream Usage

- **Spec Compiler** reads Story, Scope, Out of Scope, and Platform to generate Gherkin acceptance criteria and non-functional requirements.
- **Story-writer agent** reads Context and Analytics Events to write observable Given/When/Then clauses.
- **Figma prompt generation** reads Story, Platform, and the story's title to classify the story as UI-bearing or code-only (see `CLAUDE.md §17.1`) and to generate the Figma Make prompt.
- **Feature Flag Strategy** from the business case is refined into the per-story Flag Key in this document; the story's flag key is what gets implemented.
- **Jira import** maps each field directly: Story ID → issue key prefix, Title → summary, Story → description opening, Platform → label, Feature Flag key → custom field.
- **ANALYSIS_LOG.md** receives an entry when a story draft is revised after PM review, noting what changed and why.

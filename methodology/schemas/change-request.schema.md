# Change Request Artifact Schema

**Version:** 1.0
**Producer:** PM/PO (authored), Coach agent (structured)
**Consumers:** Lead Analyst, Spec Compiler, affected agent stages
**Purpose:** Formally document mid-pipeline scope changes so that downstream agents know what to re-run, what to skip, and who authorized the change.

---

## Overview

A change request is created when the PM or PO needs to modify scope after work has begun in the pipeline. "Mid-pipeline" means any point after a business case has been approved and story drafting has started.

The Coach agent structures the change request through a conversation with the PM, but the PM is the author of record. The Approval section must be completed by a human — it cannot be auto-populated by an agent.

Change requests are not patches to existing artifacts. They are standalone documents that trigger a defined re-run sequence. The Lead Analyst decides which pipeline stages are affected based on the Impact Assessment section.

**Do not use this artifact for:** pre-pipeline changes (revise the business case instead), bug reports discovered after launch (use the standard defect process), or clarifications that do not change scope (add a comment to the story directly).

---

## Required Sections

All sections below must be present and non-empty. A section containing only "TBD" is considered empty and fails validation.

---

### Title

A short, human-readable name for the change. 3–8 words. Should clearly identify what is changing, not just that something changed.

**Example (passes):** "Remove Android TV from Offline Download Scope"
**Example (fails):** "Scope Change" or "CR-001"

---

### Business Trigger

Describe what external or internal event caused this change. The trigger must be cited — state the source, not just the conclusion.

**Valid trigger types:**
- **Competitive intelligence**: a named competitor shipped a feature that changes the priority calculus
- **User feedback**: a specific research session, survey result, or support ticket surge
- **Executive decision**: a named decision-maker changed direction (cite the meeting or communication)
- **Bug discovered**: a defect found in current implementation that makes the original story undeliverable as written
- **Budget or timeline constraint**: a specific budget change or deadline shift (cite the constraint)
- **Legal or compliance requirement**: a new regulatory requirement or legal review finding
- **Technical blocker**: an upstream dependency (platform API, third-party SDK, partner contract) that makes the original approach infeasible

**Example (passes):**
> Competitive trigger. Libby shipped server-side download queuing on 2026-02-03, visible in their App Store release notes. PM leadership reviewed the competitive gap in the 2026-02-10 product sync (see meeting notes in Confluence: HOOP-PM-2026-02-10) and decided to re-prioritize the download UX to close the gap before Q2.

**Example (fails):**
> We decided to change the scope of this feature.

---

### Affected Stories

A list of story IDs currently in the pipeline that this change request impacts. Use the story ID format defined in `story-draft.schema.md`: `{Epic-letter}-{number}` (e.g., A-1, B-3).

If this change request adds net-new scope that does not map to any existing story, write "new — additive scope" and describe what new stories will need to be created.

If a story is only partially affected (some acceptance criteria remain valid, others do not), note which criteria are invalidated.

**Example (passes):**
```
- A-4: Offline download initiation (fully superseded — replace Android TV target with watch party sync)
- A-5: Download progress indicator (partially affected — AC-3 and AC-4 reference TV layout, remove those)
- A-7: Offline playback resume (unaffected — verify and confirm)
- new — additive scope: Watch party sync story (no existing ID yet)
```

**Example (fails):**
> The offline download stories are affected.

---

### Proposed Change

Describe what the PM wants changed, in business language. This section is not a technical specification. Engineering agents translate this into technical decisions during re-spec.

State the change as a delta from the current approved scope: what is being added, removed, or modified.

**Example (passes):**
> Remove Android TV as a target platform for the offline download feature. Rationale: TV users do not travel; offline download is a commuter use case. Redirect the freed capacity toward watch party sync, which allows patrons to listen to the same audiobook in sync with a friend remotely. Watch party sync was previously deprioritized due to capacity; the TV removal creates room for it in the same sprint.

**Example (fails):**
> Change the feature to do watch party sync instead of offline on TV.

---

### Priority

One of four values. Choose the value that reflects how quickly the affected pipeline stages must respond to this change.

| Value | Meaning |
|-------|---------|
| **P0** | Drop current work immediately. Re-run affected stages before any other task. Use only for blockers that make the current sprint unshippable. |
| **P1** | Complete current in-progress work unit, then re-run affected stages. Target: within current sprint. |
| **P2** | Schedule re-run in the next sprint planning cycle. Current sprint continues as-is. |
| **P3** | Nice to have. Re-run affected stages when capacity allows. Does not affect current or next sprint. |

**The priority reflects urgency of pipeline response, not importance of the business change.**

---

### Impact Assessment

Specify which pipeline stages need to re-run as a result of this change. This section is populated collaboratively by the PM (who knows the business intent) and the Lead Analyst (who knows the pipeline state). If the Lead Analyst has not yet reviewed, mark stages as "pending Lead Analyst review" and update before the change request is acted on.

**Pipeline stages (reference):**
- **Intake**: Business case review and approval
- **Story drafting**: Coach-guided story creation
- **Spec compilation**: Acceptance criteria, Gherkin, non-functional requirements
- **Implementation**: Engineering execution
- **Figma prompt generation**: UI prototype prompts
- **Jira import**: Backlog creation or update

**Format:** For each affected stage, state whether it needs a full re-run or a partial update, and why.

**Example:**
```
- Intake: No re-run. Business case rationale still valid; opportunity size unchanged.
- Story drafting: Partial update. A-4 must be rewritten. A-5 needs AC revision. New watch party story needed.
- Spec compilation: Re-run for A-4 and A-5 only after story drafts are updated.
- Implementation: No re-run yet. Sprint has not started for these stories.
- Figma prompt generation: Re-run for A-4. TV frame (1920x1080) replaced with phone frame (390x844).
- Jira import: Update after spec compilation completes.
```

---

### Constraints

List any timeline, budget, or scope limits that constrain how this change can be implemented. If none apply, write "None stated."

**Example:**
> - Q2 hard deadline remains 2026-04-30. The watch party sync story must be specced and estimated by 2026-03-01 for capacity planning.
> - No additional headcount. Story points freed by removing TV scope must cover the watch party story; no net increase in sprint capacity.
> - Legal review for watch party sync (data sharing between patron accounts) must complete before implementation begins.

---

### Approval

The name and role of the person who authorized this change request. This section must be completed by a human. Agents must not auto-populate this field.

**Required format:**
```
Approved by: {Full Name}, {Role}
Date: {YYYY-MM-DD}
```

**Example:**
```
Approved by: Jamie Kowalski, Senior Product Manager, Hoopla Digital
Date: 2026-02-12
```

If the change request has not yet received approval, write "Pending — do not act on this change request until approval is recorded." The Lead Analyst must not re-run pipeline stages until this field is complete.

---

## Validation Rules

An artifact fails validation if any of the following are true. Failing artifacts are returned to the PM and Coach before any pipeline action is taken.

| Rule | Check |
|------|-------|
| All sections present | Every heading above has non-empty body text |
| Business Trigger cites a source | Not just a statement of the change — a cited reason for it |
| Affected Stories lists at least one ID | Story ID in `letter-number` format, or "new — additive scope" |
| Priority is one of four values | P0, P1, P2, or P3 — no other values |
| Approval is non-empty | Name and role recorded; not auto-populated by an agent |
| Impact Assessment covers all stages | Each pipeline stage addressed (even if only to confirm no re-run needed) |

---

## Downstream Usage

- **Lead Analyst** reads Impact Assessment to determine which agents to re-invoke and in what order.
- **Spec Compiler** reads Proposed Change and Affected Stories to know which acceptance criteria to revise or regenerate.
- **Story-writer agent** reads Affected Stories and Proposed Change to rewrite or create story drafts.
- **Figma prompt generation** reads Impact Assessment to determine which prompts need regeneration.
- **Jira** is updated after all upstream re-runs complete; the change request ID is linked to all modified issues.
- **ANALYSIS_LOG.md** receives an entry for every P0 or P1 change request, with attribution to the named approver.

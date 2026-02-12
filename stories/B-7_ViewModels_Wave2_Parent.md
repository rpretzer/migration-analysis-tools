# ViewModels wave 2: planning and batch orchestration

**Title:** ViewModels wave 2: planning and batch orchestration

**Story:**
As a development team lead, I want the 55+ remaining screens assigned to batches, sequenced, and tracked so that wave-2 ViewModel migration proceeds in an orderly and measurable way.

**Context / Background:**
Story B-3 established the ViewModel pattern on four screens. The remaining 55+ screens must follow the same pattern. Running them as a single undifferentiated block of work would make progress invisible and merge conflicts likely. This story defines the six batches, assigns screens to them by feature area, and establishes the tracking mechanism. It is a planning story; the implementation work is in stories B-8 through B-13.

**In scope:**
- [ ] Assign all 55+ remaining screens to one of six batches, grouped by feature area
- [ ] Sequence the six batches and get architect approval on the ordering
- [ ] Confirm the pattern document from story B-3 is sufficient as the implementation guide
- [ ] Set up a completion tracker (board, checklist, or equivalent) before batch work begins

**Out of scope:**
- [ ] Actual ViewModel implementation (that is stories B-8 through B-13)
- [ ] Compose migration (separate stories B-14 and B-15)

**Acceptance Criteria:**

```
Given all screens in the app have been inventoried
When the batch assignment is complete
Then every screen is assigned to exactly one batch and the total across all six batches equals the full count of remaining screens
```

```
Given the batch assignments and sequencing are proposed
When the architect reviews them
Then the ordering is approved and any changes are documented
```

```
Given story B-3 is complete and the pattern document exists
When the pattern document is reviewed against the wave-2 screens
Then it is confirmed as sufficient; any gaps are identified and addressed before batch work begins
```

```
Given the completion tracker is set up
When batch work begins
Then progress is visible at the screen level (not just the batch level) and blockers can be identified early
```

**Non-functional requirements:**
- Performance: Not applicable to this story.
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story.
- Testing: Not applicable to this story (testing is per-batch in B-8 through B-13).

**Dependencies:**
- Story B-3 (ViewModels wave 1) must be complete. The pattern document is a deliverable of B-3.

**Assumptions:**
- Six batches of approximately 9 screens each is the target. If the screen count differs from the estimate, the batch sizes adjust but the count stays at six.
- Batches are sequenced so that screens sharing navigation edges are in adjacent batches, minimising merge conflicts.

**Effort estimate:** 3
**Estimation drivers:** Planning and coordination story; no implementation code; the deliverables are a batch plan and a tracker.

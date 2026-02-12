# Migrate Room to the Downloads process

**Title:** Migrate Room to the Downloads process

**Story:**
As a developer maintaining the Downloads subsystem, I want the download-queue and renew tables migrated to Room (or a documented alternative) so that the Downloads process has the same type-safe, lifecycle-aware data layer as the main process.

**Context / Background:**
The Downloads process runs as a separate process (:Downloads) and currently uses DownloadSQLiteHelper with raw SQLite. Room's multi-process invalidation is limited, so the team must evaluate whether Room with explicit locking, a shared database file, or a file-based queue is the right approach. Story B-4 proved the Room migration pattern on the main-process tables; this story applies it (or the chosen alternative) to the Downloads process.

**In scope:**
- [ ] Evaluate Room multi-process support, shared-file-with-locking, and file-based-queue approaches; document the decision as an ADR before implementation begins
- [ ] Implement the chosen approach for the download-queue and renew tables
- [ ] Write migration scripts to preserve existing download and renewal data across the upgrade
- [ ] Write integration tests covering the full download lifecycle end-to-end
- [ ] Verify no data loss on app upgrade

**Out of scope:**
- [ ] Main-process tables (already migrated in story B-4)
- [ ] Changes to the Downloads foreground service logic beyond what is required to wire the new data layer
- [ ] AudioPlayback process data (not in scope for this project)

**Acceptance Criteria:**

```
Given the ADR has been written and the approach is chosen
When implementation begins
Then the chosen approach is documented with the rationale for rejecting the alternatives
```

```
Given a device running the previous app version has active downloads and renewal records
When the app is upgraded
Then all existing download-queue and renewal records are present and correct in the new data layer
```

```
Given the Downloads process writes a new download-queue entry while the Main process reads the queue
When both operations complete
Then no data corruption occurs and both processes see a consistent view
```

```
Given the integration test suite runs
When the download lifecycle test executes (queue, start, progress, complete, renew)
Then all lifecycle events complete successfully end-to-end
```

**Non-functional requirements:**
- Performance: Download-queue writes must not block the download thread for more than 10 ms. Read latency for the queue must not exceed 50 ms under normal conditions.
- Accessibility: Not applicable to this story.
- Observability: Download lifecycle events are already logged by story C-1. This story must not break those log integrations.
- Testing: Integration tests covering the full download lifecycle are a hard gate. A concurrency test (simultaneous read from Main, write from Downloads) is required.

**Dependencies:**
- Story B-4 (Room migration, main process) must be complete. The migration pattern and lessons learned are inputs to this story.

**Assumptions:**
- The Downloads process and the Main process do not share an in-memory cache. All cross-process data sharing is via the database or a file.
- The ADR decision is made before any implementation code is written. If the evaluation reveals that none of the three approaches is suitable, a fourth option is explored and the story's scope adjusts.

**Effort estimate:** 8
**Estimation drivers:** High risk per roadmap; multi-process DB access; race conditions expected during development; depends on B-4; integration-test requirement covers full download lifecycle.

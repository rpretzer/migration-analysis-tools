# Migrate main-process SQLite tables to Room

**Title:** Migrate main-process SQLite tables to Room

**Story:**
As a developer maintaining the app's data layer, I want the three main-process SQLite tables migrated to Room so that database access is type-safe, lifecycle-aware, and free of manual connection management.

**Context / Background:**
Three SQLiteOpenHelper subclasses handle bookmarks, playback positions, and patron data: LocalBookmarkTableHelper, LocalPlaybackPositionTableHelper, and PatronSQLiteOpenHelper. All three call getWritableDatabase() synchronously and have no migration strategy. Room is already declared in the manifest (AndroidX Room MultiInstanceInvalidationService), indicating prior intent to migrate. The Repositories from story B-2 will own all DB access after this migration.

**In scope:**
- [ ] Create Room entities and DAOs for: bookmarks, playback positions, and patron data
- [ ] Write Room migration scripts to preserve existing data across the upgrade
- [ ] Wire the Room DAOs through the Repositories from story B-2
- [ ] Remove all synchronous getWritableDatabase() calls for these three tables
- [ ] Verify existing data survives the migration on a test device with seed data

**Out of scope:**
- [ ] The Downloads-process table (DownloadSQLiteHelper) — that is story B-16
- [ ] Changes to controller, ViewModel, or UI classes beyond what is required to wire the DAOs

**Acceptance Criteria:**

```
Given a device running the previous app version has data in all three tables
When the app is upgraded to the new version
Then all existing bookmarks, playback positions, and patron records are present and correct in Room
```

```
Given the Room migration is in place
When a code search is run for getWritableDatabase
Then zero results remain for the three migrated tables
```

```
Given the app is running with Room
When a bookmark is created, a playback position is saved, and patron data is updated
Then all three operations complete successfully and the data is queryable via the Room DAOs
```

```
Given DownloadSQLiteHelper exists in the codebase
When this story's changes are reviewed
Then DownloadSQLiteHelper is untouched; no migration or Room changes apply to the Downloads process
```

**Non-functional requirements:**
- Performance: Room DAO queries that feed the UI must return LiveData or Flow so that updates are automatic and no manual refresh is needed. Write operations must be suspend functions.
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story directly.
- Testing: Migration scripts must be tested against a seed database containing representative data for all three tables. Unit tests must cover each DAO's CRUD operations.

**Dependencies:**
- Story B-2 (Repository layer) must be complete. Repositories own all DB access; the Room DAOs are called through them.

**Assumptions:**
- Room migration scripts (incremental, from the current schema version to the new Room-managed version) are the chosen migration strategy. If the data volume is small enough, a destructive migration with a re-sync from the server is an acceptable alternative and must be documented as an ADR.
- The three tables have no foreign-key relationships to each other or to other tables. If they do, the migration scripts must account for ordering.

**Effort estimate:** 8
**Estimation drivers:** Three tables with Room migration scripts; data-survival requirement adds migration-script verification; depends on B-2; synchronous-write removal is the behavioral change.

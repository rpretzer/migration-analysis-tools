# Establish structured logging baseline across six modules

**Title:** Establish structured logging baseline across six modules

**Story:**
As an on-call engineer, I want structured log entries for every playback, download, DRM, and ebook-server event so that I can diagnose production issues from logs alone, without attaching a debugger.

**Context / Background:**
Six packages were identified as requiring observability instrumentation: audio/, video/, download/, dash/, playback/, and ebook/server/. Two of those packages run in separate processes (:AudioPlayback and :Downloads), which means log aggregation must account for process boundaries. Bugsnag crash reports must also include content ID and playback state as breadcrumbs so that crashes can be correlated with the user's last action.

**In scope:**
- [ ] Add structured log entries for every playback state transition (playing, paused, buffering, seeking, error, completed) in audio/ and video/, including content ID and timestamp
- [ ] Add structured log entries for every download lifecycle event (queued, started, progress, completed, failed, retried) in download/, including content ID and byte counts
- [ ] Add structured log entries for every DRM license event (request, granted, renewal, expiry, failure) in dash/ and playback/, including content ID and outcome
- [ ] Add structured log entries for every ebook-server request in ebook/server/, including request type, latency, and outcome
- [ ] Wire Bugsnag breadcrumbs so that every crash report includes the content ID and the most recent playback state
- [ ] Ensure logs from :AudioPlayback and :Downloads processes are aggregated and queryable alongside Main-process logs

**Out of scope:**
- [ ] Distributed trace spans (that is story C-2)
- [ ] Metrics dashboards (that is story C-2)
- [ ] Error-category taxonomy (that is story C-2)
- [ ] Changes to controller, ViewModel, or UI classes

**Acceptance Criteria:**

```
Given the app is playing an audiobook and the playback state changes from playing to buffering
When the structured logs are queried
Then an entry exists with: event=playback_state_change, state=buffering, content_id=<id>, timestamp=<iso8601>
```

```
Given the app has queued a download and the download completes
When the structured logs are queried
Then entries exist for queued, started, and completed events, each with content_id, byte counts (where applicable), and timestamp
```

```
Given the app requests a DRM license for a piece of content
When the license is granted or denied
Then a structured log entry exists with: event=drm_license, outcome=granted|denied|error, content_id=<id>, timestamp=<iso8601>
```

```
Given the ebook server receives a request
When the request completes
Then a structured log entry exists with: event=ebook_server_request, type=<request_type>, latency_ms=<value>, outcome=success|error
```

```
Given the app crashes while playback is active
When the Bugsnag crash report is inspected
Then it contains breadcrumbs with the content_id and the most recent playback state
```

```
Given the app is running and generating logs in all three processes
When the logs are queried from the observability backend
Then logs from Main, :AudioPlayback, and :Downloads are all present and queryable in a single view, tagged with their source process
```

**Non-functional requirements:**
- Performance: Structured logging must not add more than 1 ms of latency to any state-transition or event-handling code path. Logging must be asynchronous where the event handler is on a performance-critical thread (e.g., the audio playback thread).
- Accessibility: Not applicable to this story.
- Observability: This story is entirely an observability deliverable. The structured log schema must be documented so that story C-2 can build trace spans and dashboards on top of it.
- Testing: Each log event type must have a unit test that verifies the log entry is produced with the correct fields. Integration tests must verify that Bugsnag breadcrumbs are populated on a simulated crash.

**Dependencies:**
- Roadmap item 0.1 (assessment) is complete.
- Story E-2 (Hilt foundation) is preferred but not strictly required; logging can be wired via the service locator temporarily if Hilt is not yet complete.

**Assumptions:**
- The app already has a logging framework (or Android logcat) that can be extended with structured fields. If not, selecting a structured logging library is in scope.
- The observability backend (log aggregation service) is already in place and can ingest logs from multiple Android processes. If not, this story's scope includes selecting or configuring the ingestion pipeline.

**Effort estimate:** 8
**Estimation drivers:** Six packages across two separate processes; Bugsnag breadcrumb integration adds a second output surface; three sprints in the roadmap; schema design affects story C-2.

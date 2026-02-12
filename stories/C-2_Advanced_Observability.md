# Advanced observability: trace spans, error taxonomy, and metrics dashboard

**Title:** Advanced observability: trace spans, error taxonomy, and metrics dashboard

**Story:**
As an on-call engineer, I want distributed trace spans covering the full pre-playback sequence, a standardised error-category taxonomy on every crash, and a metrics dashboard so that I can understand playback performance and failure modes at a glance.

**Context / Background:**
Story C-1 established structured logging for individual events. This story adds the next layer: distributed trace spans that connect the sequential steps before playback starts (geo-check, license fetch, player init, first audio or video frame), an error-category taxonomy that tags every Bugsnag report, and a metrics dashboard that surfaces the key health indicators the team needs to monitor.

**In scope:**
- [ ] Instrument the full pre-playback sequence with distributed trace spans: geo-check, license fetch, player init, and first frame rendered
- [ ] Publish trace spans to the observability backend so they are visible and queryable
- [ ] Define an error-category taxonomy: network, DRM, timeout, auth (and any additional categories surfaced during implementation)
- [ ] Tag every Bugsnag crash report with exactly one error category from the taxonomy
- [ ] Create a metrics dashboard displaying at least five key metrics: buffering rate, download failure rate, seek latency, DRM renewal success rate, and playback-start p95 latency

**Out of scope:**
- [ ] Structured logging for individual events (that is story C-1 and must be complete first)
- [ ] Application Performance Monitoring (APM) instrumentation beyond the pre-playback trace
- [ ] Changes to controller, ViewModel, or UI classes

**Acceptance Criteria:**

```
Given a user starts playing a piece of content
When the pre-playback sequence completes
Then a distributed trace exists in the observability backend with spans for: geo-check, license-fetch, player-init, and first-frame, each with start time, end time, and parent-child relationships
```

```
Given a crash occurs in the app
When the Bugsnag report is inspected
Then exactly one error category (network, DRM, timeout, auth, or another documented category) is attached to the report
```

```
Given the metrics dashboard is open
When it displays data for the last 24 hours
Then buffering rate, download failure rate, seek latency (p50 and p95), DRM renewal success rate, and playback-start p95 latency are all visible and populated with real data
```

```
Given the error-category taxonomy is defined
When it is reviewed by the team
Then every category has: a name, a definition, one or more example trigger conditions, and a link to the relevant structured-log event from story C-1
```

**Non-functional requirements:**
- Performance: Trace-span instrumentation must not add more than 5 ms of latency to the pre-playback sequence. Span creation must be asynchronous.
- Accessibility: Not applicable to this story.
- Observability: This story is the observability deliverable. The dashboard and trace spans are the primary outputs.
- Testing: Unit tests must verify that spans are created with correct parent-child relationships for a simulated pre-playback sequence. Integration tests must verify that spans appear in the observability backend. The error-category tagging must be verified against a mock crash with each category.

**Dependencies:**
- Story C-1 must be complete. The structured log schema from C-1 is the foundation that trace spans and error categories build on.
- The observability backend must support distributed tracing (span ingestion and visualization). If it does not, this story's scope includes evaluating and selecting a backend or adding a sidecar.

**Assumptions:**
- The observability backend already supports distributed tracing or a compatible tracing standard (e.g., OpenTelemetry). If not, backend selection is in scope and adds risk.
- The five dashboard metrics listed are the minimum set. The team may add metrics during implementation; additional metrics do not block completion.

**Effort estimate:** 8
**Estimation drivers:** Depends on C-1; adds distributed tracing (new capability); error-category taxonomy is a design decision affecting all crash reports; dashboard scope depends on backend tooling availability.

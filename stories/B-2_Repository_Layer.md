# Introduce Repository layer for five domains

**Title:** Introduce Repository layer for five domains

**Story:**
As a developer working on the modernization roadmap, I want Repository interfaces for the five highest-traffic domains so that controllers and ViewModels depend on abstractions, not on raw HTTP clients or database handles.

**Context / Background:**
Controllers currently construct HttpRequest objects inline and call HTTP clients directly. There is no layer between the controller and the network or database. Introducing Repository interfaces for History, Policy, Patron, Playback, and Search decouples the data-access layer, enables mocking for unit tests, and creates the insertion point for caching, retry logic, and offline fallback in the future.

**In scope:**
- [ ] Define Repository interfaces for: History, Policy, Patron, Playback, Search
- [ ] Implement each Repository, routing network calls through the shared webservices module (if A-2 is complete) or through the existing manager layer (fallback)
- [ ] Implement each Repository's local-DB reads
- [ ] Update the top-10 controllers to call Repositories instead of constructing HttpRequest objects directly
- [ ] Write unit tests for each Repository with a mocked HTTP client

**Out of scope:**
- [ ] Repository interfaces for domains beyond the five listed (future scope)
- [ ] ViewModel introduction (that is story B-3)
- [ ] Room migration (that is story B-4); Repositories use the existing SQLite layer for now
- [ ] Caching, retry, or offline-fallback logic (future enhancements)

**Acceptance Criteria:**

```
Given the five Repository interfaces are defined
When a code search is run for HttpRequest construction in the top-10 controllers
Then zero results remain; all HTTP calls route through a Repository
```

```
Given each Repository implementation is in place
When the app is exercised on the five domains (history list, policy acceptance, patron management, playback start, search)
Then each domain functions identically to the pre-Repository behaviour
```

```
Given each Repository has unit tests
When the test suite runs
Then every Repository has at least one happy-path test and one error-path test, each using a mocked HTTP client
```

```
Given A-2 (shared HTTP client) is complete
When the Repositories are built
Then they route calls through the shared module; if A-2 is not yet complete, they fall back to the existing manager layer and this is documented
```

**Non-functional requirements:**
- Performance: Repository method calls must not add measurable latency beyond what the underlying HTTP or DB call already incurs.
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story directly; logging for HTTP and DB calls is covered by stories C-1 and C-2.
- Testing: Unit tests are a hard gate. Each Repository must be independently testable with a mocked HTTP client and a mocked or in-memory database.

**Dependencies:**
- Story B-1 (coroutines) must be complete. Repository methods are suspend functions; the controllers that call them must already be coroutine-native.
- Story A-2 (shared HTTP client) is a preferred dependency. If A-2 slips past the start of this story, the architect decides whether to proceed against the existing manager layer or wait. This is a go/no-go gate at the end of sprint 4.

**Assumptions:**
- The five domains (History, Policy, Patron, Playback, Search) are sufficient for Phase 1. Additional domains are added in Phase 2 as controllers are migrated.
- The Repository interface method signatures are defined by the existing controller call patterns; no new API contracts are invented in this story.

**Effort estimate:** 8
**Estimation drivers:** Five new interfaces plus implementations; depends on B-1; prefers A-2 but can proceed without it; unit-test requirement per Repository adds scope.

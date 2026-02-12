# Extract webservices/ HTTP client and parsers into KMP shared module

**Title:** Extract webservices/ HTTP client and parsers into KMP shared module

**Story:**
As a mobile platform engineer, I want the HTTP client setup, manager interfaces, and all response parsers extracted into the KMP shared module so that every API call can be shared across platforms with a single implementation.

**Context / Background:**
The webservices/ package contains 89 classes including the OkHttp client setup, all manager interfaces, and approximately 45 response parsers. This is the largest single extraction in the KMP track and carries the highest risk because the serialization migration touches every parser. GatewayWSManager contains dead endpoints that must be audited and removed before porting.

**In scope:**
- [ ] Extract OkHttp client setup into the shared module (OkHttp is already KMP-compatible)
- [ ] Extract all manager interfaces into the shared module
- [ ] Extract and convert all ~45 response parsers to use kotlinx.serialization
- [ ] Audit GatewayWSManager for dead endpoints and remove them before porting
- [ ] Verify the shared HTTP client compiles for both JVM and iOS targets
- [ ] Update the Android app to call all existing API endpoints through the shared module

**Out of scope:**
- [ ] auth/ token management (that is story A-3)
- [ ] Any iOS app integration beyond compilation verification
- [ ] Changes to controllers, ViewModels, or UI classes

**Acceptance Criteria:**

```
Given GatewayWSManager has been audited against server-side access logs or backend documentation
When the audit is complete
Then all endpoints confirmed as unused are removed before any code is ported to the shared module
```

```
Given all ~45 response parsers have been converted to kotlinx.serialization in the shared module
When the shared module is built for the JVM target
Then all parsers compile with zero errors and all existing unit tests pass
```

```
Given the shared HTTP client is published as a dependency of the Android app
When the app makes a request to any previously-used API endpoint
Then the response is parsed by the shared-module parser and the resulting bean matches the previous Gson output exactly
```

```
Given sample API responses are available for every active endpoint
When the shared-module parsers deserialize those responses
Then no field is silently dropped, renamed, or type-coerced compared to the Gson baseline
```

```
Given the shared module is built for the iOS Native target
When the build completes
Then the HTTP client and all parsers compile with zero errors
```

**Non-functional requirements:**
- Performance: HTTP round-trip latency must not regress. Parser deserialization latency for the top-10 endpoints must not regress by more than 10 % vs. the Gson baseline.
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story. (Structured logging for HTTP calls is covered by story C-1.)
- Testing: Unit tests must cover every parser with at least one happy-path and one malformed-input scenario. Integration tests must verify end-to-end HTTP calls against a mock server for the top-10 endpoints.

**Dependencies:**
- Story A-1 must be complete. Parsers return bean types; those types must already be in the shared module.
- Story C-1 (observability baseline) is not a hard dependency but structured logging on HTTP calls will be easier to add after this extraction.

**Assumptions:**
- OkHttp's KMP support is stable and does not require a fork or patch.
- The dead-endpoint audit can be performed against backend documentation or access logs provided by the backend team. If neither is available, endpoints are retained with a documented note.

**Effort estimate:** 13
**Estimation drivers:** Largest single extraction (89 classes, ~45 parsers); High-risk flag in roadmap; serialization migration touches every parser; dead-endpoint audit adds discovery work; hard dependency on A-1.

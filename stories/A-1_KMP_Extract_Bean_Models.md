# Extract bean/ data models into KMP shared module

**Title:** Extract bean/ data models into KMP shared module

**Story:**
As a mobile platform engineer, I want all 132 data-model classes extracted into a Kotlin Multiplatform shared module so that the same domain models compile and run on both Android and iOS without duplication.

**Context / Background:**
The bean/ package contains 132 data-model classes currently compiled only for Android. These classes are the response types returned by every API parser in webservices/. Extracting them into a KMP shared module is the prerequisite for sharing the HTTP client (story A-2) and is the first step of the KMP track in the roadmap.

**In scope:**
- [ ] Convert all 132 classes in bean/ to Kotlin data classes in the shared module
- [ ] Replace implicit Gson serialization contracts with explicit @SerializedName annotations or kotlinx.serialization equivalents
- [ ] Confirm with the backend team that v4/ is the only active API response version
- [ ] Verify the shared module compiles for both JVM and iOS (Native) targets
- [ ] Update the Android app to resolve all bean types from the shared module

**Out of scope:**
- [ ] webservices/ HTTP client or parser migration (that is story A-2)
- [ ] Any iOS app integration beyond compilation verification
- [ ] Changes to any controller, task, or UI class

**Acceptance Criteria:**

```
Given the shared module source contains all 132 bean classes
When the Gradle build runs for the JVM target
Then the shared module compiles with zero errors
```

```
Given the shared module source contains all 132 bean classes
When the Gradle build runs for the iOS Native target
Then the shared module compiles with zero errors
```

```
Given the shared module is published as a dependency of the Android app module
When the app is launched and any API response is parsed
Then the bean type is resolved from the shared module, not from the original bean/ package in the app module
```

```
Given sample API responses for every active endpoint are available as test fixtures
When the shared-module bean classes are deserialized from those fixtures
Then every field maps correctly and no field is silently dropped or renamed compared to the Gson baseline
```

```
Given the backend team has been contacted regarding API version status
When the confirmation is received
Then the v4/ sub-package is documented as the sole active schema and any older-version bean classes are removed or flagged
```

**Non-functional requirements:**
- Performance: Deserialization latency for the top-10 most-frequently-parsed bean types must not regress by more than 10 % compared to the Gson baseline, measured in a micro-benchmark.
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story.
- Testing: Unit tests must cover round-trip serialization/deserialization for every bean class using at least one sample payload. A Gson-vs-kotlinx.serialization comparison test must pass for all classes that previously had implicit field mappings.

**Dependencies:**
- Roadmap item 0.1 (assessment) is complete.
- Backend team confirmation that v4/ is the only active API version is a coordination dependency; the extraction can proceed in parallel but the v4/ gate must pass before the story is marked complete.

**Assumptions:**
- The v4/ sub-package is the only active API response schema. If older versions are still served by the backend, the bean extraction will need to carry multiple schemas and this story's scope increases.
- kotlinx.serialization is the target serialization library for the shared module. If the team decides otherwise, the annotation strategy changes but the extraction scope does not.

**Effort estimate:** 8
**Estimation drivers:** 132 classes to convert; Gson-to-kotlinx.serialization contract risk is the main uncertainty; cross-platform compilation verification adds a loop not present in Android-only work.

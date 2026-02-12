# Rotate exposed credentials and harden manifest

**Title:** Rotate exposed credentials and harden manifest

**Story:**
As a security-conscious engineering team, I want all API keys removed from the production manifest and injected at build time so that credentials are not shipped in plain text in the APK.

**Context / Background:**
The AndroidManifest.xml contains a Google Maps API key, a Branch.io live key, and a Branch.io test key in plain text. TestEbookReaderActivity exposes dev/test hostnames in a production build. These are the highest-priority security findings from the project-structure analysis.

**In scope:**
- [ ] Remove the Google Maps API key from AndroidManifest.xml and inject it via build-time config (e.g., BuildConfig or a config-file mechanism)
- [ ] Remove the Branch.io live and test keys from AndroidManifest.xml and inject them via build-time config
- [ ] Rotate the keys on the Google and Branch.io provider side (coordination task — tracked here, executed externally)
- [ ] Remove TestEbookReaderActivity from release builds or gate it to debug builds only
- [ ] Verify no API keys or test hostnames appear in a release APK manifest scan

**Out of scope:**
- [ ] Encryption-at-rest for keys (build-time injection is the target; key-management-service integration is a future concern)
- [ ] Changes to any controller, ViewModel, or UI class beyond the activity gating

**Acceptance Criteria:**

```
Given a release APK is built
When the AndroidManifest.xml inside the APK is inspected
Then no Google Maps API key, Branch.io live key, Branch.io test key, or test hostname appears in plain text
```

```
Given the app is launched on a device with the release build
When the app uses Google Maps or Branch.io features
Then the features function correctly with the build-time-injected keys
```

```
Given a debug build is created
When TestEbookReaderActivity is checked
Then it is present and functional in the debug build
```

```
Given a release build is created
When TestEbookReaderActivity is checked
Then it is absent from the release build or is unreachable from any navigation path
```

**Non-functional requirements:**
- Performance: Build-time injection must not add measurable latency to app startup.
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story.
- Testing: A CI check must be added that scans the release APK manifest for known key patterns and fails the build if any are found.

**Dependencies:**
- Roadmap item 0.1 (assessment) is complete.
- Google and Branch.io accounts must be accessible to rotate keys. This is a coordination dependency; the code changes can be made in parallel but the story is not complete until rotation is confirmed.

**Assumptions:**
- The existing Google Maps API key and Branch.io keys are not already scoped or restricted on the provider side. If they are already restricted, rotation is lower urgency but the build-time injection still applies.
- The build system supports a BuildConfig or equivalent mechanism for injecting strings at compile time. If not, a config-file-based approach is used.

**Effort estimate:** 2
**Estimation drivers:** Mechanical on the app side; the actual rotation is a coordination dependency on provider accounts, not a code task; TestEbookReaderActivity gating is a manifest/Gradle change.

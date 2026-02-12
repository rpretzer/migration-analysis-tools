# Port auth/ token management into KMP shared module

**Title:** Port auth/ token management into KMP shared module

**Story:**
As a mobile platform engineer, I want the authentication and token-management logic ported to the KMP shared module so that token validation, refresh, and account sync run from a single shared implementation on both platforms.

**Context / Background:**
The auth/ package contains AuthenticationManagerImpl, which owns token validation, refresh, and account sync. Token storage is platform-specific; the shared module defines a TokenStore interface and Android provides the implementation backed by SharedPreferences. This is a security-sensitive flow and requires thorough regression testing even though the class count is small.

**In scope:**
- [ ] Port AuthenticationManagerImpl logic into the shared module
- [ ] Define a TokenStore interface in the shared module
- [ ] Implement the Android TokenStore backed by SharedPreferences
- [ ] Wire the shared HTTP client from story A-2 into the shared auth module
- [ ] Verify the full authentication flow (validation, refresh, account sync) end-to-end on Android

**Out of scope:**
- [ ] iOS TokenStore implementation (iOS platform work is out of scope for this project phase)
- [ ] Changes to any UI, controller, or ViewModel class
- [ ] OAuth or SSO flow changes (the existing auth contract is preserved)

**Acceptance Criteria:**

```
Given the TokenStore interface is defined in the shared module
When the Android implementation is compiled and wired
Then the implementation correctly persists and retrieves tokens from SharedPreferences
```

```
Given the user holds a valid, non-expired token
When the app makes an authenticated API call through the shared auth module
Then the call succeeds and the token is attached correctly
```

```
Given the user holds an expired token
When the app attempts an authenticated API call
Then the shared auth module automatically refreshes the token, persists the new token via TokenStore, and retries the original call successfully
```

```
Given the app performs an account sync
When the sync completes
Then the patron data and token state are consistent with the backend and persisted locally
```

```
Given the original AuthenticationManagerImpl used the service locator to obtain dependencies
When the shared-module version is deployed
Then all service-locator calls within the auth flow are replaced with injected dependencies
```

**Non-functional requirements:**
- Performance: Token refresh must complete within 2 seconds under normal network conditions. No blocking calls on the main thread.
- Accessibility: Not applicable to this story.
- Observability: Token refresh and account sync events must be loggable (the shared module exposes log callbacks; wiring to the app's structured logging is covered by story C-1).
- Testing: Unit tests must cover: valid-token path, expired-token refresh path, refresh-failure path, and account-sync path. Each test uses a mocked HTTP client and a mocked TokenStore.

**Dependencies:**
- Story A-2 must be complete. The shared auth module injects the HTTP client from the shared webservices module.

**Assumptions:**
- SharedPreferences is the correct backing store for tokens on Android. If the team decides on EncryptedSharedPreferences or a keystore-backed store, the TokenStore implementation changes but the interface does not.
- The existing token-refresh contract (endpoint, request/response shape) does not change.

**Effort estimate:** 5
**Estimation drivers:** Only 2 classes to port, but the flow is security-sensitive; TokenStore interface design affects both platforms; depends on A-2; regression scope is narrow but bug consequences are high.

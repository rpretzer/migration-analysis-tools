# DRM Integration Patterns

**Audience:** Codebase Analyst and Spec Compiler agents.
**Purpose:** Patterns for classifying DRM-related code during migration analysis and writing DRM-aware specs. DRM is always a native-only concern. Misclassifying DRM code as a KMP candidate is a blocking error.

---

## 1. The three DRM systems

| DRM System | Supported platforms | License server standard |
|------------|--------------------|-----------------------|
| **Widevine** | Android, Chrome browser, Chromecast, Android TV, Fire TV | MPEG CENC, DASH |
| **FairPlay Streaming (FPS)** | iOS, iPadOS, macOS, Apple TV, Safari | HLS |
| **PlayReady** | Various (Microsoft ecosystem, Samsung Tizen, Roku, some Android TV) | MPEG CENC, DASH |

A multi-platform service such as Hoopla must implement all three to cover all supported client platforms.

---

## 2. What must stay native (non-negotiable)

The following operations are tied directly to the platform's trusted execution environment (TEE) or hardware security module. They cannot be implemented in Kotlin common code and must never be moved to the KMP shared module.

| Operation | Why it must be native |
|-----------|----------------------|
| **License acquisition** | The DRM SDK makes a platform-specific call to the TEE or hardware security module. The mechanism is different on every platform. |
| **Key management** | Decryption keys are stored in secure hardware storage managed by the OS. No cross-platform abstraction is possible. |
| **Secure media pipeline** | Decrypted media data must pass through the OS-managed secure decoder. On Android: `MediaDrm` + `MediaCodec`. On iOS: `AVContentKeySession` + `AVAssetResourceLoader`. |
| **License persistence (offline)** | Offline keys are stored in the platform's secure storage. The storage mechanism is different per platform. |

**Classification rule:** Any class that imports `android.media.MediaDrm`, `com.google.android.exoplayer2.drm.*`, `AVContentKeySession`, or `AVAssetResourceLoader` is a Framework-layer class. It belongs in the native-only classification bucket.

---

## 3. What can be shared (KMP shared module)

The following operations deal with coordination, state, and communication rather than the DRM cryptographic operations themselves. They can be implemented in Kotlin common code.

| Operation | KMP implementation |
|-----------|------------------|
| **DRM token request** | HTTP call to the entitlement server to obtain a DRM token/license URL. Uses Ktor. Returns a `DrmTokenResponse` data class. |
| **Entitlement verification** | Business logic that checks whether a patron's account is entitled to access a title. Calls the BFF's entitlement endpoint. |
| **Playback state management** | Tracking play position, buffering state, chapter position, sleep timer. `StateFlow`-based; no DRM-specific APIs. |
| **Offline download coordination** | Determining which titles are downloaded, tracking download progress, managing download queue. Uses SQLDelight for state persistence. |
| **License renewal scheduling** | Logic that calculates when a license expires and schedules renewal. The renewal call itself is native; the scheduling logic is shared. |
| **Multi-device concurrency state** | Tracking whether playback is active on another device. BFF manages the authoritative state; the shared module observes and reacts. |

---

## 4. Interface pattern

Define the DRM boundary in the Domain layer. The shared module depends on the interface. Native platform code provides the implementation.

```kotlin
// Domain layer (shared module): defines the contract
interface DrmProvider {
    // Acquire a license for a content item. Called before playback begins.
    suspend fun acquireLicense(
        contentId: String,
        licenseServerUrl: String,
        drmToken: String
    ): DrmLicense

    // Release the license after playback ends or the patron returns the title.
    suspend fun releaseLicense(contentId: String)

    // Check whether a valid license is currently held (used for offline access checks).
    fun isLicenseValid(contentId: String): Boolean

    // Acquire an offline license for persistent download.
    // Only available on platforms and content types that support offline playback.
    suspend fun acquireOfflineLicense(
        contentId: String,
        licenseServerUrl: String,
        drmToken: String
    ): OfflineDrmLicense
}

// Domain layer (shared module): data classes
data class DrmLicense(
    val contentId: String,
    val expiresAt: Instant,
    val isOffline: Boolean
)

data class OfflineDrmLicense(
    val contentId: String,
    val expiresAt: Instant,
    val renewalRequiredAfter: Instant
)
```

---

## 5. Multi-DRM server interaction

A single backend serves different DRM license formats depending on the requesting platform. The sequence:

```
Client                    BFF                   DRM License Server
  |                        |                           |
  |-- GET /bff/v1/play --> |                           |
  |                        |-- validate entitlement    |
  |                        |-- select DRM system       |
  |                        |   (Widevine/FairPlay/PR)  |
  |<-- PlaybackManifest ---|                           |
  |    + licenseServerUrl  |                           |
  |    + drmToken          |                           |
  |                        |                           |
  |-- acquireLicense() --> native DRM SDK              |
  |                        |-- license request ------> |
  |                        |<-- license response ------|
  |<-- DrmLicense ---------|                           |
  |                        |                           |
  |-- begin playback (native secure media pipeline)    |
```

The BFF selects the appropriate DRM system based on the `User-Agent` or a client-declared capability. The client never negotiates DRM system selection — the BFF makes that decision server-side.

---

## 6. Testing strategy

### Unit tests (shared module — no real DRM)

Use a `FakeDrmProvider` that returns valid `DrmLicense` objects without any DRM SDK calls. Test the shared module's coordination logic against the fake.

```kotlin
class FakeDrmProvider : DrmProvider {
    override suspend fun acquireLicense(
        contentId: String,
        licenseServerUrl: String,
        drmToken: String
    ): DrmLicense = DrmLicense(
        contentId = contentId,
        expiresAt = Clock.System.now() + 48.hours,
        isOffline = false
    )

    override suspend fun releaseLicense(contentId: String) { /* no-op */ }
    override fun isLicenseValid(contentId: String): Boolean = true

    override suspend fun acquireOfflineLicense(
        contentId: String,
        licenseServerUrl: String,
        drmToken: String
    ): OfflineDrmLicense = OfflineDrmLicense(
        contentId = contentId,
        expiresAt = Clock.System.now() + 30.days,
        renewalRequiredAfter = Clock.System.now() + 25.days
    )
}
```

### Integration tests (on-device — real DRM)

DRM integration tests must run on a physical device connected to the real license server. They cannot run in the JVM emulator. Schedule these in CI as a nightly run on a real device farm (Firebase Test Lab or similar), not on every PR.

```kotlin
// androidTest: real Widevine on a physical device
@Test
fun widevineLicenseIsAcquiredForValidContent() {
    val provider = WidevineProvider(context)
    val license = runBlocking {
        provider.acquireLicense(
            contentId = TEST_CONTENT_ID,
            licenseServerUrl = TEST_LICENSE_URL,
            drmToken = TEST_DRM_TOKEN
        )
    }
    assertThat(license.isOffline).isFalse()
    assertThat(license.expiresAt).isGreaterThan(Clock.System.now())
}
```

---

## 7. Common issues

| Issue | Cause | Resolution |
|-------|-------|-----------|
| **License renewal fails during long playback session** | The license expires mid-session. The client does not renew proactively. | Implement proactive renewal: when `expiresAt - now < renewalThreshold`, trigger renewal before expiry. |
| **Offline license not refreshed after borrow renewal** | The patron extends their borrow period, but the offline license still uses the old expiry. | After borrow renewal, call `acquireOfflineLicense` again to refresh the offline key. |
| **Concurrent device limit** | Patron plays on two devices simultaneously. The license server rejects the second device. | The BFF enforces concurrent device limits server-side. The client must handle a 403 response from the license server gracefully and display an appropriate message. |
| **FairPlay requires HTTPS license URL** | Apple requires the license server URL to use HTTPS. HTTP URLs cause a silent failure. | Verify all FairPlay license server URLs in the configuration use HTTPS. |
| **Widevine L1 vs L3** | L1 requires hardware TEE support; L3 falls back to software. HD content may be restricted to L1 only. | Check device Widevine security level before offering HD streams. Show SD-only content on L3 devices if HD is restricted. |
| **Downloaded title inaccessible after OS update** | The OS update may clear or invalidate secure storage. | On app launch after an OS update, verify all offline licenses are still valid. If invalid, prompt the patron to re-download. |

---

## 8. Hoopla content type DRM matrix

Different content types on Hoopla use different DRM configurations. The Codebase Analyst must map this matrix during analysis.

| Content type | Android DRM | iOS DRM | Offline available | Notes |
|-------------|-------------|---------|------------------|-------|
| Movies | Widevine | FairPlay | Yes (SD only) | HD may require Widevine L1 |
| TV shows | Widevine | FairPlay | Yes (SD only) | Same as movies |
| Music | Widevine | FairPlay | Yes | Lower security requirements |
| Audiobooks | Widevine | FairPlay | Yes | DRM applied to audio stream |
| Ebooks | Adobe DRM (EPUB) | Adobe DRM (EPUB) | Yes | Different DRM system from video |
| Comics | Widevine (image encryption) or none | FairPlay or none | Varies | Some comics use image-level encryption; others rely on API authorization only |

**Note on ebooks and Adobe DRM:** Adobe Digital Editions (ADE) uses a different DRM technology from Widevine and FairPlay. EPUB DRM integration is separate from the video DRM pipeline. Classify ebook DRM as a separate framework-layer concern during analysis.

# Skill: DRM Patterns

## Purpose

This skill covers classification, interface design, and testing patterns for DRM-related code during migration analysis and spec writing. DRM is always a native-only concern. Misclassifying DRM code as a KMP candidate is a blocking error that will cause a Gate 3 FAIL when the shared module fails to compile for iOS.

---

## The three DRM systems

| DRM System | Supported platforms | License server standard |
|------------|--------------------|-----------------------|
| Widevine | Android, Chrome, Chromecast, Android TV, Fire TV | MPEG CENC, DASH |
| FairPlay Streaming (FPS) | iOS, iPadOS, macOS, Apple TV, Safari | HLS |
| PlayReady | Microsoft ecosystem, Samsung Tizen, Roku, some Android TV | MPEG CENC, DASH |

A multi-platform service (such as Hoopla) must implement all three to cover all supported client platforms.

---

## What must stay native (non-negotiable)

The following operations are tied directly to the platform's trusted execution environment (TEE) or hardware security module. They cannot be implemented in Kotlin common code and must never be moved to the KMP shared module.

| Operation | Why it must be native |
|-----------|----------------------|
| License acquisition | The DRM SDK makes a platform-specific call to the TEE or hardware security module. The mechanism is different on every platform. |
| Key management | Decryption keys are stored in secure hardware storage managed by the OS. No cross-platform abstraction is possible. |
| Secure media pipeline | Decrypted media data must pass through the OS-managed secure decoder. Android: `MediaDrm` + `MediaCodec`. iOS: `AVContentKeySession` + `AVAssetResourceLoader`. |
| License persistence (offline) | Offline keys are stored in the platform's secure storage. The storage mechanism differs per platform. |

**Classification rule:** Any class that imports any of these is a Framework-layer class in the native-only bucket:
- `android.media.MediaDrm`
- `com.google.android.exoplayer2.drm.*`
- `AVContentKeySession`
- `AVAssetResourceLoader`

These classes are never KMP candidates. Do not propose migrating them to the shared module.

---

## What can be shared (KMP shared module)

The following operations deal with coordination, state, and communication rather than the DRM cryptographic operations themselves.

| Operation | KMP implementation |
|-----------|------------------|
| DRM token request | HTTP call to the entitlement server to obtain a DRM token or license URL. Uses Ktor. Returns a `DrmTokenResponse` data class. |
| Entitlement verification | Business logic that checks whether a patron's account is entitled to access a title. Calls the BFF's entitlement endpoint. |
| Playback state management | Tracking play position, buffering state, chapter position, sleep timer. StateFlow-based; no DRM-specific APIs. |
| Offline download coordination | Determining which titles are downloaded, tracking download progress, managing the download queue. Uses SQLDelight for state persistence. |
| License renewal scheduling | Logic that calculates when a license expires and schedules renewal. The renewal call itself is native; the scheduling logic is shared. |
| Multi-device concurrency state | Tracking whether playback is active on another device. BFF manages authoritative state; the shared module observes and reacts. |

---

## DrmProvider interface pattern

Define the DRM boundary in the Domain layer. The shared module depends on the interface. Native platform code provides the implementation.

```kotlin
// Domain layer (shared module commonMain): defines the contract
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
    suspend fun acquireOfflineLicense(
        contentId: String,
        licenseServerUrl: String,
        drmToken: String
    ): OfflineDrmLicense
}

// Domain layer: data classes
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

Framework layer provides the implementations:

```kotlin
// Framework layer (androidMain): Widevine
class WidevineProvider(private val context: Context) : DrmProvider {
    override suspend fun acquireLicense(
        contentId: String, licenseServerUrl: String, drmToken: String
    ): DrmLicense { /* Widevine-specific MediaDrm calls */ }

    override suspend fun releaseLicense(contentId: String) { /* ... */ }
    override fun isLicenseValid(contentId: String): Boolean { /* ... */ }
    override suspend fun acquireOfflineLicense(
        contentId: String, licenseServerUrl: String, drmToken: String
    ): OfflineDrmLicense { /* ... */ }
}

// Framework layer (iosMain): FairPlay
class FairPlayProvider : DrmProvider {
    override suspend fun acquireLicense(
        contentId: String, licenseServerUrl: String, drmToken: String
    ): DrmLicense { /* AVContentKeySession calls */ }

    override suspend fun releaseLicense(contentId: String) { /* ... */ }
    override fun isLicenseValid(contentId: String): Boolean { /* ... */ }
    override suspend fun acquireOfflineLicense(
        contentId: String, licenseServerUrl: String, drmToken: String
    ): OfflineDrmLicense { /* ... */ }
}
```

Domain use cases use the interface, not the implementation:

```kotlin
// Domain use case: pure, testable, platform-independent
class StartPlayback(private val drmProvider: DrmProvider) {
    suspend operator fun invoke(contentId: String, token: String): PlaybackSession {
        val license = drmProvider.acquireLicense(contentId, licenseServerUrl = token, drmToken = token)
        return PlaybackSession(contentId, license)
    }
}
```

---

## BFF + multi-DRM server interaction

A single backend serves different DRM license formats depending on the requesting platform. The BFF selects the appropriate DRM system based on the User-Agent or a client-declared capability. The client never negotiates DRM system selection — the BFF makes that decision server-side.

Sequence:
1. Client calls `GET /bff/v1/play` with authentication token.
2. BFF validates entitlement, selects DRM system (Widevine/FairPlay/PlayReady), and returns `PlaybackManifest` including `licenseServerUrl` and `drmToken`.
3. Client native DRM SDK calls the license server using the provided URL and token.
4. License server returns the platform-appropriate license.
5. Client native secure media pipeline begins playback.

The DRM token request and entitlement verification (steps 1-2) can be in the KMP shared module. Steps 3-5 must be in the Framework layer.

---

## Hoopla content type DRM matrix

| Content type | Android DRM | iOS DRM | Offline available | Notes |
|-------------|-------------|---------|------------------|-------|
| Movies | Widevine | FairPlay | Yes (SD only) | HD may require Widevine L1 |
| TV shows | Widevine | FairPlay | Yes (SD only) | Same as movies |
| Music | Widevine | FairPlay | Yes | Lower security requirements |
| Audiobooks | Widevine | FairPlay | Yes | DRM applied to audio stream |
| Ebooks | Adobe DRM (EPUB) | Adobe DRM (EPUB) | Yes | Different system from video DRM |
| Comics | Widevine (image encryption) or none | FairPlay or none | Varies | Some use image-level encryption; others use API authorization only |

Note on ebooks: Adobe Digital Editions (ADE) uses a different DRM technology from Widevine and FairPlay. Classify ebook DRM as a separate Framework-layer concern during analysis. Do not combine ebook DRM stories with video DRM stories.

---

## Testing strategy

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

DRM integration tests must run on a physical device connected to the real license server. They cannot run in the JVM emulator. Schedule these as nightly CI runs on a real device farm (Firebase Test Lab or similar), not on every PR.

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

## Common issues

| Issue | Cause | Resolution |
|-------|-------|-----------|
| License renewal fails during long playback session | License expires mid-session; client does not renew proactively | Implement proactive renewal: when `expiresAt - now < renewalThreshold`, trigger renewal before expiry |
| Offline license not refreshed after borrow renewal | Patron extends borrow period but offline license still has old expiry | After borrow renewal, call `acquireOfflineLicense` again to refresh the offline key |
| Concurrent device limit | Patron plays on two devices simultaneously; license server rejects the second | BFF enforces concurrent device limits server-side. Client must handle 403 from the license server and display the appropriate message |
| FairPlay requires HTTPS license URL | Apple requires HTTPS; HTTP causes a silent failure | Verify all FairPlay license server URLs use HTTPS |
| Widevine L1 vs L3 | L1 requires hardware TEE; L3 falls back to software; HD may be restricted to L1 only | Check device Widevine security level before offering HD streams; show SD-only content on L3 devices when HD is restricted |
| Downloaded title inaccessible after OS update | OS update may clear or invalidate secure storage | On app launch after an OS update, verify all offline licenses are still valid; prompt patron to re-download if invalid |

---

## Estimation notes

DRM involvement adds 3 points to any story estimate. This accounts for:
- Platform-specific complexity in Framework-layer code.
- Testing overhead: unit tests use fakes; integration tests require real devices and license server credentials.
- Coordination with license server operations or backend teams.
- The constraint that CMP cannot render video player surfaces — the player UI must use native interop.

Stories that span multiple DRM systems (Widevine + FairPlay + Adobe DRM) must be decomposed by DRM system and by content type. Do not write a single story that covers all three DRM systems.

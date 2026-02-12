# Project Structure — Hoopla Android 4.42.1

## App Metadata

| Field | Value |
|-------|-------|
| Package | `com.hoopladigital.android` |
| Version | 4.42.1 (build 925) |
| Min SDK | 23 (Android 6.0) |
| Target SDK | 29 (Android 10) |
| Compile SDK | 29 |
| Language mix | ~75% Kotlin-compiled, ~25% Java |
| App classes | 1,204 |
| Third-party classes | ~4,650 |
| Processes | Main, `:AudioPlayback`, `:Downloads` |
| Leanback (TV) | Supported |

---

## Package Map

All paths relative to `com.hoopladigital.android`. Class counts from JADX output.

| Package | Classes | Role | Platform Coupling |
|---------|---------|------|-------------------|
| `bean/` | 132 | Data models (all content types) | None |
| `webservices/` | 89 | HTTP client, managers, parsers | Very low |
| `ui/` | 449 | Activities, Fragments, presenters, ebook reader | Heavy |
| `controller/` | 271 | Feature controllers (presenter-like) | Low–Medium |
| `task/` | 34 | AsyncTask wrappers and data fetchers | Medium |
| `audio/` | 23 | Audio playback service, ExoPlayer | Heavy |
| `view/` | 22 | Custom Android views | Heavy |
| `service/` | 17 | Service locator, platform services, widgets | Medium |
| `sqlite/` | 16 | SQLite helpers (one per domain) | Heavy |
| `download/` | 15 | Download queue, validators, receivers | Heavy |
| `dao/` | 12 | SharedPreferences wrappers | Heavy |
| `dash/` | 11 | DASH streaming, Widevine DRM, subtitles | Heavy |
| `ebook/` | 10 | Ebook DRM, local HTTP server for WebView | Medium |
| `ui8/` | 10 | Legacy UI (comic reader, upgrade, auth error) | Heavy |
| `links/` | 9 | Deep link routing (Branch.io) | Medium |
| `workmanager/` | 6 | Background sync workers | Medium |
| `video/` | 6 | Video ExoPlayer adapter, Leanback glue | Heavy |
| `playback/` | 6 | Playback orchestration across formats | Medium |
| `suggestion/` | 5 | Post-play "what's next" recommendations | Medium |
| `adapter/` | 4 | ListView/RecyclerView adapters | Heavy |
| `analytics/` | 3 | Firebase event logging | Medium |
| `crashreporting/` | 3 | Bugsnag integration | Medium |
| `dictionary/` | 3 | Word-definition lookup (OwlBot API) | Low |
| `hls/` | 3 | Service interfaces (empty — impls elsewhere) | None |
| `notification/` | 1 | Media notification factory | Heavy |
| `app/` | 1 | Application class, SDK initialization | Heavy |
| `activity/` | 1 | ChromecastPlayerActivity | Heavy |
| `auth/` | 2 | Authentication token management | None |
| `util/` | 30 | Mixed utilities (crypto, validation, network) | Mixed |
| `google/` | 6 | Google Cast (Chromecast) | Heavy |

---

## Process Separation

```
Main process          — All UI, controllers, most services
:AudioPlayback        — AudioService (MediaBrowserServiceCompat)
:Downloads            — QueueDownloadService, RenewService, DownloadService
```

Audio and download run in separate processes to survive background restrictions.

---

## Third-Party Dependencies

| Library | Used For |
|---------|----------|
| ExoPlayer 2 | Audio and video playback, DASH/HLS |
| OkHttp 3 | All HTTP traffic |
| Gson | JSON parsing (response parsers) |
| Picasso | Image loading (covers, thumbnails) |
| Firebase Analytics | Event telemetry |
| Firebase Messaging | Push notifications (FCM) |
| Braze (Appboy) | Marketing analytics, content cards |
| Branch.io | Deep linking and install attribution |
| Google Cast Framework | Chromecast receiver/sender |
| Bugsnag | Crash reporting |
| AndroidX WorkManager | Background job scheduling |
| AndroidX Leanback | Android TV UI |
| AndroidX Room | SQLite (service declared in manifest; helpers use raw SQLite) |
| Dagger | Present in APK; usage in app code is minimal or absent |
| Kotlin stdlib + coroutines | Runtime present; coroutines not actively used by app code |

---

## Deep-Link Routes

All handled by `SplashScreenActivity` (autoVerify intent filters).

| Scheme | Paths |
|--------|-------|
| `https://www.hoopladigital.com` | `/title/`, `/artist/`, `/series/`, `/publisher/`, `/audiobook/`, `/comic/`, `/ebook/`, `/movie/`, `/music/`, `/television/`, `/collection/`, `/genre/`, `/my/`, `/browse/`, `/privacy`, `/terms`, `/help` |
| `https://hoopla.app.link` | Branch.io universal link (all paths) |
| `https://hoopla.test-app.link` | Branch.io test universal link |
| `hoopladigital://open` | Custom scheme fallback |

A separate `TestEbookReaderActivity` is bound to several internal dev/test hostnames (`www-dev.private.hoopladigital.com`, etc.) — these are present in the production APK.

---

## Manifest-Declared Components (App-Owned)

### Activities (19)
- `SplashScreenActivity` — launcher, all deep-link entry point
- `HomeActivity` — main content browser
- `WelcomeActivity` — onboarding
- `RegistrationActivity` — sign-up / library card
- `AcceptPolicyActivity` — terms acceptance
- `BookReaderActivity` — ebook reader
- `VideoPlayerActivity` — video playback (landscape, config changes suppressed)
- `AudiobookPlayerActivity` — audiobook playback
- `MusicPlayerActivity` — music playback
- `OfflineActivity` — offline content browser
- `DisplayHelpPageActivity` — help pages
- `ChromecastPlayerActivity` — Chromecast remote control
- `LoadAudioPlaybackActivity` — headless audio loader (noHistory)
- `HeadlessBGRestrictionCheckActivity` — background restriction probe (Theme.NoDisplay)
- `AuthenticationErrorActivity` — auth failure (noHistory)
- `ComicReaderActivity` — comic reader (ui8, legacy)
- `UpgradeAppActivity` — version upgrade prompt
- `TestEbookReaderActivity` — dev-only ebook test (see above)
- 8 × Leanback (TV) activities (splash, auth, home, search, details, players, dialogs)

### Services (7 app-owned)
- `AudioService` — foreground, mediaPlayback, process `:AudioPlayback`
- `QueueAudioTitleService` — foreground, mediaPlayback
- `QueueDownloadService` — foreground, dataSync, process `:Downloads`
- `DownloadService` — foreground, dataSync, process `:Downloads`
- `RenewService` — foreground, dataSync, process `:Downloads`
- `MusicWidgetRemoteViewsService` — AppWidget
- `AudioBookWidgetRemoteViewsService` — AppWidget

### Receivers (5 app-owned)
- `MusicPlayerAppWidgetProvider` — home screen music widget
- `AudiobookPlayerAppWidgetProvider` — home screen audiobook widget
- `DownloadCompleteBroadcastReceiver` — `DOWNLOAD_COMPLETE`
- `StorageUnmountedBroadcastReceiver` — `MEDIA_REMOVED` / `MEDIA_UNMOUNTED`
- `LocaleChangedBroadcastReceiver` — `LOCALE_CHANGED`

---

## Security Observations (from Manifest)

These items are embedded in the production build. Flag for the team.

- **Google Maps API key** exposed in plain text (value redacted — see `analysis/SECURITY_FINDINGS.md`)
- **Branch.io live key** exposed (value redacted — see `analysis/SECURITY_FINDINGS.md`)
- **Branch.io test key** also present (value redacted — see `analysis/SECURITY_FINDINGS.md`)
- **Dev/test hostnames** in intent filters on `TestEbookReaderActivity` ship in production
- `WRITE_EXTERNAL_STORAGE` and `WRITE_SETTINGS` permissions declared — both deprecated / restricted on API 29+
- `allowBackup="false"` is set (good), but `extractNativeLibs="true"` is set (increases APK size unnecessarily on modern devices)

---

## Architectural Patterns in Use

| Pattern | Where | Notes |
|---------|-------|-------|
| Service Locator | `service/FrameworkServiceFactory` | Single global singleton; all managers accessed through it |
| Controller / Presenter-like | `controller/*ControllerImpl` | Decoupled from Android but not from AsyncTask |
| AsyncTask | `task/`, controllers, activities | Deprecated API 30+; used everywhere |
| Callback | `task/v2/WSAsyncTask`, controllers | Manual callback chains, no Rx or coroutines |
| Delegate | `ui/activity/delegate/*` | Strategy pattern for content-type-specific title detail screens |
| Factory | `service/factory/`, `crashreporting/` | SDK initialization and service creation |
| Embedded HTTP server | `ebook/server/EbookServer` | Jetty on localhost for ebook WebView rendering |

---

## What Is Missing

- No ViewModel classes (rotation state loss likely)
- No Repository pattern (DAOs and web services accessed directly)
- Dagger is bundled but does not appear to be wired into app code — DI is absent
- Kotlin coroutines runtime is bundled but app code does not use coroutines
- No evidence of unit or integration tests in the APK

# Client Context — Midwest Tape / Hoopla Digital

This document captures client-specific context that informs the analysis and should be updated as new information is confirmed.

---

## 1. Company overview

- **Company**: Midwest Tape, LLC
- **Location**: Holland, Ohio (headquarters)
- **Product**: Hoopla Digital — a digital media lending platform for public libraries
- **Business model**: Libraries subscribe to Hoopla. Patrons borrow digital content (ebooks, audiobooks, movies, TV shows, music, comics) through the Hoopla app or website. Content is licensed per-borrow (pay-per-use), not owned by the library.

---

## 2. Product scope

### Hoopla platforms
- Android phone/tablet app (analyzed: v4.42.1)
- Android TV app (Leanback-based, included in the same APK)
- iOS phone/tablet app (not yet analyzed)
- Web app (out of scope for mobile analysis)

### Content types supported
- Ebooks (WebView + local Jetty server + JS bridge)
- Audiobooks (ExoPlayer-based, separate `:AudioPlayback` process)
- Movies and TV (ExoPlayer + Widevine DRM)
- Music (audio playback, likely shared infra with audiobooks)
- Comics (image-based reader)

### Key user flows
1. **Library card authentication**: Patron enters library card number, app validates against backend.
2. **Browse/Search**: Content discovery by category, search, or curated lists.
3. **Borrow**: Patron borrows a title (subject to library's monthly allocation).
4. **Playback/Read**: Stream or download content; format-dependent player.
5. **Return/Expire**: Content auto-expires or patron returns early.

---

## 3. Technical context (confirmed from APK analysis)

| Attribute | Value | Source |
|-----------|-------|--------|
| Android target SDK | 29 (Android 10) | AndroidManifest.xml |
| Min SDK | 23 (Android 6.0) | APK metadata |
| App version analyzed | 4.42.1 (build 925) | APK filename |
| Language split | ~75% Kotlin, ~25% Java | Class analysis |
| DI framework | Dagger bundled but not wired; no @Inject usage | Decompiled code |
| Async pattern | AsyncTask (deprecated) | task/v2/ package |
| HTTP client | OkHttp 3 | META-INF |
| Serialization | Gson | webservices/ parsers |
| Database | Raw SQLite (no Room) | sqlite/ package |
| Crash reporting | Bugsnag | META-INF |
| Analytics | Firebase Analytics | firebase-analytics.properties |
| Push/engagement | Braze (formerly Appboy) | braze assets |
| Deep links | Branch.io | META-INF |
| Media playback | ExoPlayer 2 | audio/, video/, dash/ |
| DRM | Widevine | playback/ package |
| TV framework | AndroidX Leanback | leanback META-INF |

---

## 4. Assumptions to confirm with client

| # | Assumption | Impact if wrong | Status |
|---|-----------|-----------------|--------|
| 1 | v4/ is the only active API version | KMP bean extraction scope changes | Unconfirmed |
| 2 | ui8/ package is legacy dead code | If live, stories B-6 needs rescoping | Unconfirmed |
| 3 | No active Dagger usage | If used, Hilt migration is more complex | High confidence (no @Inject found) |
| 4 | Test coverage is near-zero for app code | If tests exist in source (not in APK), E-3 baseline changes | Unconfirmed — need source access |
| 5 | Backend API is stable and not changing in parallel | If API changes during migration, KMP stories need versioning strategy | Unconfirmed |
| 6 | iOS app exists and is in scope for KMP | If no iOS app, KMP value proposition weakens significantly | Unconfirmed |
| 7 | Team has Android expertise but limited KMP experience | Affects critical path (spike needed) | Unconfirmed |

---

## 5. Client contacts (to be filled in)

| Role | Name | Availability | Notes |
|------|------|-------------|-------|
| Technical lead | | | Confirms assumptions, reviews architecture |
| Product owner | | | Approves roadmap scenario, prioritizes features |
| QA lead | | | Validates WCAG findings, confirms test infra |
| Backend lead | | | Confirms API version status, endpoint stability |

---

## 6. Engagement timeline

| Milestone | Target date | Status |
|-----------|------------|--------|
| Initial analysis delivery | | Complete |
| Client review of analysis | | Not started |
| Assumption confirmation | | Not started |
| Roadmap scenario selection | | Not started |
| Story refinement with client | | Not started |
| Jira backlog import | | Not started |
| Phase 0 kickoff | | Not started |

---

## 7. Hoopla-specific risks

1. **Ebook reader complexity**: ~80 files, WebView + local HTTP server + JavaScript bridge. This is the single most complex subsystem and is deliberately excluded from early migration phases. A production bug here could derail the critical path.

2. **Multi-process architecture**: The app runs three processes (Main, `:AudioPlayback`, `:Downloads`). Any data-layer refactoring (Room, Repositories) must account for cross-process boundaries. Room's multi-process invalidation does not cover this automatically.

3. **DRM sensitivity**: Widevine integration in the playback pipeline is security-sensitive. Changes to the playback stack require careful regression testing and possibly re-certification.

4. **Library patron model**: Unlike consumer apps, Hoopla's users authenticate via library card, not personal accounts. This affects how auth flows are tested and how KMP auth extraction is validated.

5. **Content type diversity**: Five distinct content types (ebook, audiobook, movie/TV, music, comics) each have their own player/reader. Migration must handle each independently. No single "playback" migration covers everything.

# Figma Make Detection Report

Detection rules from CLAUDE.md §16.1 applied against all 30 user stories in this project.

---

## Triggered — UI-bearing (prompts generated)

| Story | Title | Triggers fired | Screens covered | Prompt file(s) |
|-------|-------|----------------|-----------------|----------------|
| D-1 | WCAG Critical Fixes | 2, 5 | Browse Cards, Advanced Search | browse-card.json, advanced-search.json |
| D-2 | WCAG Phase 1 Fixes | 2, 4, 5 | Audiobook Player, Video Player, Browse Cards, Ebook Highlight | audiobook-player.json, video-player.json, browse-card.json, ebook-highlight-menu.json |
| D-3 | WCAG Phase 2 Fixes | 2, 5 | Advanced Search, Audiobook Player | advanced-search.json, audiobook-player.json |
| B-3 | ViewModels Wave 1 | 1, 2, 4 | Home, TitleDetails, Search, AudiobookPlayer | home.json, title-details.json, search.json, audiobook-player.json |
| B-14 | Compose Leaf Screens | 1, 3 | Settings, Help, Registration, AcceptPolicy | settings.json, help.json, registration.json, accept-policy.json |
| B-15 | Compose Core Screens | 1, 3, 6 | Home, Browse, TitleDetails, Search | home.json, browse.json, title-details.json, search.json |
| B-17 | Leanback / TV | 1, 3 | TV Home, TV Search, TV Playback | tv-home.json, tv-search.json, tv-playback.json |
| B-8–B-13 | ViewModels Wave 2 (batches 1–6) | 1, 3 | Screens TBD (defined in B-7) | vm-wave2-template.json |

**Unique screen prompts generated: 16**
**Template prompts (pending B-7 batch assignments): 1**

### Screen consolidation notes

Several stories reference the same screen. Requirements from all source stories were merged into a single prompt:

- **Home** ← B-3 (ViewModel, rotation survival) + B-15 (Compose migration, frame rate)
- **Title Details** ← B-3 + B-15
- **Search** ← B-3 + B-15
- **Audiobook Player** ← B-3 + D-2 (tap targets, contrast) + D-3 (seekbar announcements)
- **Browse Cards** ← D-1 (contentDescriptions) + D-2 (tap targets, contrast, icons)
- **Advanced Search** ← D-1 (label/hint fix) + D-3 (focus ordering)

---

## Not triggered — code-only (no prompt generated)

| Story | Title | Why no prompt |
|-------|-------|---------------|
| A-1 | Extract bean/ data models into KMP | Shared-module extraction. No screen is changed. |
| A-2 | Extract webservices/ HTTP client | Shared-module extraction. No screen is changed. |
| A-3 | Port auth/ token management | Security flow ported to shared module. No UI change. |
| A-4 | KMP wave 2: extract controller logic | Logic extraction. No screen is changed. |
| B-1 | Replace AsyncTask with coroutines | Async-layer refactor. No screen-level behaviour change visible to the user. |
| B-2 | Introduce Repository layer | Data-abstraction layer. No UI change. |
| B-4 | Migrate main-process SQLite tables to Room | Database migration. UI surfaces data through Repositories, which are unchanged. |
| B-6 | Audit and consolidate ui8/ | Audit and dead-code removal. Migrated screens must match existing appearance — no new design needed. |
| B-7 | ViewModels wave 2: planning | Orchestration story. No implementation, no visual output. |
| B-16 | Migrate Room to Downloads process | Database migration in a background process. No UI change. |
| B-18 | Performance optimisation | Profiling and APK size reduction. No new visual design. |
| C-1 | Structured logging baseline | Logging instrumentation. No UI change. |
| C-2 | Advanced observability | Tracing and dashboards. No app UI change. |
| E-1 | Rotate exposed credentials | Manifest and build-config change. No UI change. |
| E-2 | Wire Hilt DI foundation | DI wiring in base classes. No screen-level change. |
| E-3 | CI test-coverage baseline | CI tooling. No UI change. |

---

## Borderline decisions

| Story | Decision | Rationale |
|-------|----------|-----------|
| B-5 (Navigation Component) | No prompt | Trigger 1 fires (HomeActivity). The story preserves existing nav behaviour — no new visual design is required. Back-stack correctness is validated via interaction testing, not visual prototyping. |
| B-6 (ui8/ consolidation) | No prompt | Migrated screens must function identically to current state. Visual regression against the existing app is the validation method, not a new Figma prototype. |
| B-18 (Performance) | No prompt | Trigger 6 fires (frame rate). The story is profiling and dead-weight removal — the visual output does not change. Frame-rate regression is validated via benchmarks. |

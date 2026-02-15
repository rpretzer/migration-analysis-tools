---
name: migration-kmp-classification
description: Classifies mobile app modules for Kotlin Multiplatform (KMP) migration. Use when deciding whether code should be shared via KMP, kept native but modernized, or kept native with refactor/observability. Applies to Android (Java/Kotlin) and iOS (Objective-C/Swift) codebases.
---

# KMP Module Classification

## Three buckets

### KMP candidate
- Business logic, data models, networking, validation, state machines, domain rules
- Few platform-specific API dependencies
- Clear benefit to share (auth, API clients, caching, domain calculations)

### Keep native — modernize
- Tied to platform UI or OS integrations; tech is outdated
- Propose concrete upgrades: "Migrate to Swift MVVM," "Convert to Jetpack Compose"

### Keep native — refactor/observability
- Must stay platform-specific; code is complex, fragile, or underperforming
- Identify pain points: unstructured logs, no error categorization, no tracing

## Per-module entry

- **Module name / path**
- **Classification**: KMP candidate / Native modernize / Native refactor/observability
- **Rationale**: 2–4 sentences
- **Risks/unknowns**
- **Suggested next steps**

## Heuristics

- `bean/`, `webservices/`, `auth/` → often KMP candidates
- `ui/`, `view/`, `adapter/`, `activity/` → usually native (UI-heavy)
- `controller/`, `task/` → assess coupling; may be KMP if logic-only
- AsyncTask, raw SQLite, no DI → modernization candidates

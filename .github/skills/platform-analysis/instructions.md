# Skill: Platform Analysis

## Purpose

This skill provides standardized procedures for analyzing each platform's codebase. Following these procedures produces consistent, comparable output across platforms. The output feeds `pipeline/state/{platform}/` and `pipeline/state/cross-platform-mapping.md`.

---

## Android procedure

### Entry points

Read these files in order:

1. `settings.gradle.kts` — Lists all Gradle modules in the project.
2. `build.gradle.kts` (root) — Lists shared build dependencies, version catalogs, plugin declarations.
3. Each module's `build.gradle.kts` — Declares dependencies, targets, and flavors for that module.

### Gradle module graph

Enumerate all modules and map `implementation` and `api` dependencies between them.

```bash
./gradlew dependencies --configuration runtimeClasspath > pipeline/state/android/dependency-graph.txt
```

Document in `pipeline/state/android/module-graph.md`:
- Module name and path.
- Module type (`:app`, `:feature:*`, `:core:*`, `:shared:*`).
- Direct dependencies (modules it imports).
- Direct dependents (modules that import it).

### Kotlin/Java ratio

Higher Kotlin ratio means lower migration friction.

```bash
find . -name "*.kt" | xargs wc -l | tail -1   # Kotlin LOC
find . -name "*.java" | xargs wc -l | tail -1  # Java LOC
```

If Java is above 30% of total LOC, flag mixed-language modules for conversion-before-extraction analysis. Java files in a module that is a KMP candidate must be converted to Kotlin before the KMP extraction begins.

### Compose adoption

Classify each module:
- **Jetpack Compose:** Already on the CMP migration path.
- **Jetpack Compose + View interop:** Mixed; some screens already migrated.
- **Views only:** Requires Compose migration before CMP migration.

```bash
grep -r "androidx.compose" --include="*.kt" src/ | wc -l
```

### Existing KMP usage

```bash
grep -r "kotlin-multiplatform\|kmp\|shared" settings.gradle.kts build.gradle.kts
```

If KMP modules exist, document their current scope. These modules are migration-ready starting points.

### ProGuard/R8 configuration

Examine `proguard-rules.pro` files. Note:
- Are classes kept (not obfuscated)? Indicates the team expects to inspect the APK.
- Are reflection-based libraries (Gson, Retrofit) configured with keep rules? Indicates these libraries are in use and will need replacement before KMP extraction.

### Build variants

Enumerate product flavors and build types. Note variant-specific code paths that affect which modules are in scope for a given release.

### Output: `pipeline/state/android/project-summary.md`

```markdown
## Android Project Summary

**Analysis date:** YYYY-MM-DD
**App version analyzed:** x.y.z
**Source access:** [Yes / No — APK only]

### Module inventory
| Module | Type | Kotlin % | Java % | Compose? | KMP-ready? |
|--------|------|----------|--------|----------|-----------|
| :app | application | 85% | 15% | Yes (Compose + Views) | No |
| :feature:search | feature | 100% | 0% | Yes (Compose) | Partial |

### Third-party libraries of note
| Library | Version | KMP alternative | Action required |
|---------|---------|----------------|----------------|
| Retrofit | 2.9.0 | Ktor | Replace before KMP extraction |
| Gson | 2.10.1 | kotlinx.serialization | Replace before KMP extraction |

### Key findings
- [List notable issues, anti-patterns, or migration blockers]
```

---

## iOS procedure

### Entry points

Read these files in order:

1. `*.xcworkspace` or `*.xcodeproj` — Lists all targets and schemes.
2. `Podfile` or `Package.swift` — Lists external dependencies.
3. Per-target `Info.plist` — Capabilities, deployment target, bundle configuration.

### Xcode project structure

Enumerate all Xcode targets. For each target:
- Name and type (app target, framework, test, extension).
- Source language (Swift, Objective-C, or mixed).
- Deployment target (iOS version).
- Primary dependency manager (CocoaPods, SPM, or mixed).

### Swift/Objective-C ratio

```bash
find . -name "*.swift" | xargs wc -l | tail -1
find . -name "*.m" -o -name "*.mm" | xargs wc -l | tail -1
find . -name "*.h" | xargs wc -l | tail -1
```

Objective-C files require additional work before KMP integration because Kotlin/Native interop targets Swift, not Objective-C. Mixed files (`*.mm`) are Objective-C++. Document the ratio per module.

### SwiftUI vs UIKit surface area

Classify each view file:
- **UIKit only:** `UIViewController` subclass without SwiftUI usage.
- **SwiftUI only:** `struct` conforming to `View`.
- **SwiftUI + UIKit interop:** `UIHostingController` wrapping a SwiftUI view, or `UIViewRepresentable`.

```bash
grep -r "UIViewController" --include="*.swift" --include="*.m" src/ | wc -l
grep -r "struct.*View" --include="*.swift" src/ | wc -l
```

Higher UIKit usage means more migration work. SwiftUI usage is closer to compose-ios patterns and reduces migration friction.

### SPM vs CocoaPods

SPM is preferred because compose-ios ships as an SPM package. If CocoaPods is in use, the XCFramework produced by the KMP build must be integrated via a custom podspec or the project must migrate to SPM first.

### Modularization status

Determine whether the iOS app uses multiple framework targets or has all code in a single app target. Modularized iOS apps are easier to migrate incrementally. A monolithic app target requires decomposition before CMP migration.

### Output: `pipeline/state/ios/project-summary.md`

```markdown
## iOS Project Summary

**Analysis date:** YYYY-MM-DD
**App version analyzed:** x.y.z
**Source access:** [Yes / No — IPA only]

### Target inventory
| Target | Type | Swift % | ObjC % | SwiftUI? | UIKit? |
|--------|------|---------|--------|----------|--------|
| HooplaApp | application | 70% | 30% | Partial | Primary |
| HooplaPlayback | framework | 100% | 0% | No | Yes |

### Dependency manager
- CocoaPods / SPM / Mixed
- Key pods/packages that must be evaluated for KMP integration

### Key findings
- [SwiftUI adoption level — quantified]
- [ObjC bridge complexity estimate]
- [compose-ios integration path: SPM-ready? Pod migration needed?]
- [Notable UIKit-only components that must stay native]
```

---

## Web procedure

### Entry points

Read these files in order:

1. `package.json` — Dependencies and scripts.
2. `tsconfig.json` — TypeScript configuration and strictness settings.
3. `webpack.config.js` or `vite.config.ts` — Bundler and build configuration.
4. Top-level `src/` structure — Identify the primary framework and organization pattern.

### Dependency tree

Key dependencies to identify:

| Category | What to look for |
|----------|-----------------|
| Framework | `react`, `vue`, `angular` — note major version |
| State management | `redux`, `zustand`, `jotai`, `mobx`, React Context |
| Routing | `react-router-dom`, `@tanstack/router`, Next.js routing |
| SSR | `next`, `remix`, `gatsby`, or absence of SSR |
| Bundler | `webpack`, `vite`, `esbuild`, `rollup` |
| Testing | `jest`, `vitest`, `@testing-library/react`, `playwright`, `cypress` |

### State management migration complexity

| Pattern | Migration complexity to CMP |
|---------|-----------------------------|
| Redux with slices | High: no direct CMP equivalent; restructure around `StateFlow` |
| React Context only | Medium: maps loosely to `CompositionLocal` |
| Zustand | Medium: maps reasonably to `StateFlow` |
| Component-local `useState` | Low: maps directly to `remember { mutableStateOf() }` |

### SSR status

- SSR (Next.js, Remix): Compose Wasm does not support SSR today. This is a blocking issue for a complete React to Compose Web migration. SSR must be retained or replaced with static generation.
- CSR only: migration to Compose Wasm is possible in principle but still high risk.

### Output: `pipeline/state/web/project-summary.md`

Same structure as Android/iOS, adapted for web findings. Include an explicit SSR status and migration risk assessment.

---

## BFF and backend procedure

### Service inventory

For each BFF service and backend microservice:
- Service name, URL, and repository location.
- Technology stack (language, framework, database).
- Team ownership.
- API contracts exposed to clients (endpoints, request/response schemas).

### API contract extraction

For each client-facing endpoint:
- HTTP method and path.
- Request parameters (path, query, body schema).
- Response schema (nominal and error cases).
- Authentication mechanism.
- Which client platforms call this endpoint.

Document in `pipeline/state/api-contract-inventory.md`.

### Data ownership boundaries

Map which service owns which data. Identify services that:
- Own data but share it with multiple clients (strong BFF aggregation candidates).
- Are called directly by clients instead of through a BFF (thick-client anti-pattern to remediate).
- Have circular dependencies with other services.

### Output: `pipeline/state/bff/service-inventory.md`

- Service name, technology, URL, and owner.
- API surface summary (count of endpoints; list key ones).
- Data ownership and key dependencies.
- Deployment mechanism.
- Migration readiness notes.

---

## Cross-platform mapping

After completing all platform analyses, produce `pipeline/state/cross-platform-mapping.md`.

### Feature parity matrix template

```markdown
| Feature | Android | iOS | Web | Shared API? | KMP candidate? | CMP candidate? |
|---------|---------|-----|-----|-------------|---------------|---------------|
| Authentication | Yes | Yes | Yes | Yes | Yes | Yes |
| Borrow/return | Yes | Yes | Yes | Yes | Yes | Yes |
| Audiobook playback | Yes | Yes | Partial | Partial | Partial | No (player is native) |
| Video playback | Yes | Yes | Yes | Partial | Partial | No (player is native) |
| Offline downloads | Yes | Yes | No | Partial | Partial | No |
```

### Shared API surface

Document which backend/BFF endpoints are called by which platforms. Endpoints called identically by all platforms are the strongest KMP candidates.

### DRM differences

Document which DRM system each platform uses for each content type. Note content types where DRM is not yet implemented on a platform. Reference the drm-patterns skill for the full matrix.

---

## Source unavailability protocol

When only an APK or IPA is available:

1. Document this limitation in ANALYSIS_LOG.md at the start of the session.
2. Flag every finding that might be affected by decompilation artifacts.
3. Add the label `apk-only-analysis` to every story that touches the analyzed module.
4. Add 2 points to every story estimate for the analyzed module to account for discovery time.
5. Do not guess at behavior that cannot be confirmed from the decompiled code. State "unknown (APK-only analysis)" in the finding.

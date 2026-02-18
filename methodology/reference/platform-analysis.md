# Per-Platform Analysis Procedures

**Audience:** Codebase Analyst agent.
**Purpose:** Standardized procedures for analyzing each platform's codebase. Following these procedures produces consistent, comparable output across platforms. The output of each procedure feeds `pipeline/state/{platform}/` and `pipeline/state/cross-platform-mapping.md`.

---

## 1. Android procedure

### 1.1 Entry points

Start with these files in order:

1. `settings.gradle.kts` — Lists all Gradle modules in the project.
2. `build.gradle.kts` (root) — Lists shared build dependencies, version catalogs, plugin declarations.
3. Each module's `build.gradle.kts` — Declares dependencies, targets, and flavors for that module.

### 1.2 Gradle module graph

Enumerate all modules and map the `implementation` and `api` dependencies between them.

```
# Command to generate a dependency graph
./gradlew dependencies --configuration runtimeClasspath > pipeline/state/android/dependency-graph.txt
```

Document the module graph in `pipeline/state/android/module-graph.md` with:
- Module name and path.
- Module type (`:app`, `:feature:*`, `:core:*`, `:shared:*`).
- Direct dependencies (modules it imports).
- Direct dependents (modules that import it).

### 1.3 Kotlin/Java ratio

Count lines of code per language to assess migration readiness. Higher Kotlin ratio = lower migration friction.

```bash
# Rough count using find and wc
find . -name "*.kt" | xargs wc -l | tail -1   # Kotlin LOC
find . -name "*.java" | xargs wc -l | tail -1  # Java LOC
```

Document the ratio in `pipeline/state/android/project-summary.md`. If Java is above 30% of total LOC, flag mixed-language modules for conversion-before-extraction analysis.

### 1.4 Compose adoption

For each module, determine whether it uses:
- **Jetpack Compose** (good: already on the CMP migration path).
- **Jetpack Compose + View interop** (mixed: some screens already migrated).
- **Views only** (Views: requires Compose migration before CMP migration).

```bash
# Check for Compose usage in a module
grep -r "androidx.compose" --include="*.kt" src/ | wc -l
```

Record the Compose adoption percentage per module in `pipeline/state/android/project-summary.md`.

### 1.5 Existing KMP usage

Check whether the project already uses any KMP shared modules:

```bash
grep -r "kotlin-multiplatform\|kmp\|shared" settings.gradle.kts build.gradle.kts
```

If KMP modules exist, document their current scope (what is already shared). These modules are migration-ready starting points.

### 1.6 ProGuard/R8 configuration

Examine `proguard-rules.pro` files. Aggressive obfuscation can indicate that the APK was compiled without source maps, which would affect the analysis if only an APK is available.

Key items to note:
- Are classes kept (not obfuscated)? This indicates the team expects to inspect the APK.
- Are reflection-based libraries (Gson, Retrofit) configured with keep rules? This indicates these libraries are in use.

### 1.7 Build variants

Enumerate product flavors and build types. Note any variant-specific code paths that would affect which modules are in scope for a given release.

### 1.8 Output format for Android analysis

Produce `pipeline/state/android/project-summary.md` with:

```markdown
## Android Project Summary

**Analysis date:** YYYY-MM-DD
**App version analyzed:** x.y.z
**Source access:** [Yes / No — APK only]

### Module inventory
| Module | Type | Kotlin % | Java % | Compose? | KMP-ready? |
|--------|------|----------|--------|----------|-----------|
| :app | application | 85% | 15% | Yes (Compose + Views) | No (DI wiring, not business logic) |
| :feature:search | feature | 100% | 0% | Yes (Compose) | Partial (ViewModel is KMP-ready, API client is not) |
...

### Dependency graph
[Link to module-graph.md]

### Third-party libraries of note
| Library | Version | KMP alternative | Action required |
|---------|---------|----------------|----------------|
| Retrofit | 2.9.0 | Ktor | Replace before KMP extraction |
| Gson | 2.10.1 | kotlinx.serialization | Replace before KMP extraction |
| Hilt | 2.48 | Koin | Replace in shared module (Hilt stays in androidMain DI wiring) |
...

### Key findings
- [List notable issues, anti-patterns, or migration blockers]
```

---

## 2. iOS procedure

### 2.1 Entry points

Start with these files in order:

1. `*.xcworkspace` or `*.xcodeproj` — Lists all targets and schemes.
2. `Podfile` or `Package.swift` — Lists external dependencies.
3. Per-target `Info.plist` — Capabilities, deployment target, bundle configuration.

### 2.2 Xcode project structure

Enumerate all Xcode targets (app targets, framework targets, test targets, extension targets). For each target:
- Name and type.
- Source language (Swift, Objective-C, or mixed).
- Deployment target (iOS version).
- Primary dependency manager (CocoaPods, SPM, or mixed).

### 2.3 Swift/Objective-C ratio

```bash
# Rough count
find . -name "*.swift" | xargs wc -l | tail -1   # Swift LOC
find . -name "*.m" -o -name "*.mm" | xargs wc -l | tail -1   # ObjC LOC
find . -name "*.h" | xargs wc -l | tail -1   # Headers (ObjC/mixed)
```

Objective-C files require additional work before KMP integration because Kotlin/Native interop targets Swift, not Objective-C. Mixed files (`*.mm`) are Objective-C++. Document the ratio per module.

### 2.4 SwiftUI vs UIKit surface area

For each view controller or view file, classify it:
- **UIKit only:** `UIViewController` subclass without any SwiftUI usage.
- **SwiftUI only:** `struct` conforming to `View`.
- **SwiftUI + UIKit interop:** `UIHostingController` wrapping a SwiftUI view, or `UIViewRepresentable` embedding UIKit in SwiftUI.

```bash
grep -r "UIViewController" --include="*.swift" --include="*.m" src/ | wc -l
grep -r "struct.*View" --include="*.swift" src/ | wc -l
```

Higher UIKit usage = more migration work. SwiftUI usage = closer to compose-ios patterns, lower migration friction.

### 2.5 SPM vs CocoaPods

Determine which dependency manager is in use. SPM is preferred because compose-ios ships as an SPM package. If CocoaPods is in use, the XCFramework produced by the KMP build will need to be integrated via a custom podspec or a migration to SPM is required.

### 2.6 Modularization status

Determine whether the iOS app uses multiple frameworks or targets, or whether all code is in a single app target. Modularized iOS apps are easier to migrate incrementally. A monolithic app target requires decomposition before CMP migration.

### 2.7 Output format for iOS analysis

Produce `pipeline/state/ios/project-summary.md` with:

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
...

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

## 3. Web procedure

### 3.1 Entry points

Start with these files in order:

1. `package.json` — Dependencies and scripts.
2. `tsconfig.json` — TypeScript configuration and strictness settings.
3. `webpack.config.js` or `vite.config.ts` — Bundler and build configuration.
4. Top-level `src/` structure — Identify the primary framework and organization pattern.

### 3.2 Dependency tree

```bash
# Display top-level dependencies with their types
cat package.json | jq '{dependencies, devDependencies}'
```

Key dependencies to identify and document:

| Category | What to look for |
|----------|-----------------|
| Framework | `react`, `vue`, `angular` — note the major version |
| State management | `redux`, `@reduxjs/toolkit`, `zustand`, `jotai`, `recoil`, `mobx`, React Context |
| Routing | `react-router-dom`, `@tanstack/router`, Next.js routing |
| SSR | `next`, `remix`, `gatsby`, or absence of any SSR framework |
| Bundler | `webpack`, `vite`, `esbuild`, `rollup` |
| Testing | `jest`, `vitest`, `@testing-library/react`, `playwright`, `cypress` |
| TypeScript | `typescript` version; check `tsconfig.json` for `strict: true` |

### 3.3 Component inventory

For React-based codebases, enumerate the top-level component directories. For each:
- Component count.
- Average component complexity (subjective: simple presentational, medium with local state, complex with side effects).
- Shared component library usage (internal design system, Material UI, Radix UI, etc.).

### 3.4 State management assessment

Map the state management patterns in use:

| Pattern | Migration complexity to CMP |
|---------|-----------------------------|
| Redux with slices | High: Redux patterns have no direct CMP equivalent. Requires restructuring around `StateFlow`. |
| React Context only | Medium: Maps loosely to `CompositionLocal` in Compose. |
| Zustand | Medium: Simpler state; maps reasonably to `StateFlow`. |
| Component-local `useState` | Low: Maps directly to `remember { mutableStateOf() }`. |

### 3.5 SSR/CSR split

Determine whether the application uses server-side rendering (SSR):
- **SSR (Next.js, Remix):** Compose Wasm does not support SSR today. SSR must be retained or replaced with static generation during migration. This is a blocking issue for a complete React → Compose Web migration.
- **CSR only:** Migration to Compose Wasm is possible in principle but still high risk.

### 3.6 TypeScript coverage

```bash
# Check for TypeScript usage vs plain JavaScript
find src -name "*.ts" -o -name "*.tsx" | wc -l
find src -name "*.js" -o -name "*.jsx" | wc -l
```

High TypeScript coverage = clearer type contracts = easier to write equivalent Kotlin data classes.

### 3.7 Output format for web analysis

Produce `pipeline/state/web/project-summary.md` with the same structure as Android/iOS, adapted for web-specific findings. Include an explicit SSR status and a migration risk assessment.

---

## 4. Cross-platform mapping

After completing all platform analyses, produce `pipeline/state/cross-platform-mapping.md`.

### Feature parity matrix template

```markdown
## Feature Parity Matrix

| Feature | Android | iOS | Web | Shared API? | KMP candidate? | CMP candidate? |
|---------|---------|-----|-----|-------------|---------------|---------------|
| Authentication | Yes | Yes | Yes | Yes (BFF auth endpoint) | Yes | Yes |
| Borrow/return | Yes | Yes | Yes | Yes | Yes | Yes |
| Audiobook playback | Yes | Yes | Partial | Partial (state shared) | Partial | No (player is native) |
| Video playback | Yes | Yes | Yes | Partial | Partial | No (player is native) |
| Ebook reading | Yes | Yes | Yes | No (Adobe DRM differs) | No | No |
| Offline downloads | Yes | Yes | No | Partial | Partial | No |
| Push notifications | Yes | Yes | Web push | No | No | No |
| Library card login | Yes | Yes | Yes | Yes | Yes | Yes |
...
```

### Shared API surface

Document which backend/BFF endpoints are called by which platforms. Endpoints called identically by all platforms are the strongest KMP candidates.

### Platform-specific feature flags

Document LaunchDarkly flags that are evaluated differently per platform or that gate platform-exclusive features.

### DRM differences

Document which DRM system each platform uses for each content type. Reference `drm-patterns.md` for the full matrix. Note any content types where DRM is not yet implemented on a platform (gap analysis).

---

## 5. BFF and backend procedure

### 5.1 Service inventory

For each BFF service and backend microservice:
- Service name, URL, and repository location (when available).
- Technology stack (language, framework, database).
- Team ownership.
- API contracts exposed to clients (endpoints, request/response schemas).

### 5.2 API contract extraction

For each client-facing endpoint:
- HTTP method and path.
- Request parameters (path, query, body schema).
- Response schema (nominal and error cases).
- Authentication mechanism (bearer token, API key, etc.).
- Which client platforms call this endpoint.
- Call frequency and latency requirements (if known from analytics).

This data feeds `pipeline/state/api-contract-inventory.md` and informs BFF aggregation design.

### 5.3 Data ownership boundaries

Map which service owns which data. Identify services that:
- Own data but share it with multiple clients (strong BFF aggregation candidates).
- Are called directly by clients instead of through a BFF (thick-client anti-pattern to remediate).
- Have circular dependencies with other services (coupling to resolve).

### 5.4 Event pipeline

If the backend uses event-driven communication (Kafka, SNS, SQS, etc.):
- Map the event topics and their producers and consumers.
- Note any events that the client subscribes to via WebSocket or long polling.
- Identify events related to borrow state changes, availability updates, or hold notifications.

### 5.5 Deployment topology

Document how services are deployed: containerized (ECS, Kubernetes), serverless (Lambda), or mixed. This affects how new BFF services will be deployed and what the operational burden of adding a BFF layer is.

### 5.6 Output format

Produce `pipeline/state/bff/service-inventory.md` and `pipeline/state/backend/service-inventory.md` with:
- Service name, technology, URL, and owner.
- API surface summary (count of endpoints; list key ones).
- Data ownership and key dependencies.
- Deployment mechanism.
- Notes on migration readiness (e.g., "This service already returns aggregated responses suitable for a BFF pattern" or "This service requires decomposition before a BFF can be introduced").

# Skill: CLEAN Architecture

## Purpose

Every module in the KMP/CMP migration must be classified by CLEAN layer position in addition to migration bucket (KMP/CMP/native-only/BFF). Layer classification determines which imports are permitted, how code is tested, and which layer bears the cost of a future change.

---

## Layer definitions

Dependencies flow inward only. Inner layers have no knowledge of outer layers.

```
+------------------------------------------+
|  Framework / Platform                    |  Outermost: platform SDKs, DRM, push, biometrics
|  +--------------------------------------+|
|  |  Presentation                        ||  ViewModels, state holders, UI logic
|  |  +----------------------------------+||
|  |  |  Data                            |||  Repository implementations, API clients, storage
|  |  |  +------------------------------+|||
|  |  |  |  Domain                      ||||  Entities, use cases, repository interfaces
|  |  |  +------------------------------+|||
|  |  +----------------------------------+||
|  +--------------------------------------+|
+------------------------------------------+
```

The dependency rule: source code dependencies must point inward. Nothing in an inner layer can know about anything in an outer layer.

---

## Domain layer (innermost)

The domain layer contains the core business rules. It is pure Kotlin with no dependencies on any framework, library, or platform.

| Contains | Examples |
|----------|---------|
| Entities | `Borrow`, `Title`, `Patron`, `Hold` |
| Use cases (interactors) | `BorrowTitle`, `ReturnTitle`, `GetPatronBorrows`, `SearchCatalog` |
| Repository interfaces | `BorrowRepository`, `CatalogRepository`, `PatronRepository` |
| Domain exceptions | `BorrowLimitExceededException`, `TitleUnavailableException` |
| Business rules | Borrow limit enforcement, hold queue logic, availability calculation |

Permitted imports: Kotlin standard library and `kotlinx.coroutines` (for `Flow` and `suspend`) only.

Violation indicators:
- Imports from `io.ktor.*` — Data leaking into Domain
- Imports from `app.cash.sqldelight.*` — Data leaking into Domain
- Imports from `android.*` or `androidx.*` — Framework leaking into Domain
- Imports from any `@Composable` function — Presentation leaking into Domain

Domain use cases as suspend functions:
```kotlin
class BorrowTitle(
    private val borrowRepo: BorrowRepository,
    private val catalogRepo: CatalogRepository
) {
    suspend operator fun invoke(titleId: String, patronId: String): Result<Borrow> {
        val availability = catalogRepo.checkAvailability(titleId)
        if (!availability.isAvailable) return Result.failure(TitleUnavailableException())
        return borrowRepo.borrow(titleId, patronId)
    }
}
```

Repository interfaces using Flow:
```kotlin
interface BorrowRepository {
    fun observePatronBorrows(patronId: String): Flow<List<Borrow>>
    suspend fun borrow(titleId: String, patronId: String): Result<Borrow>
    suspend fun returnTitle(borrowId: String): Result<Unit>
}
```

---

## Data layer

The data layer provides implementations of the repository interfaces defined in the domain layer. It knows about network clients, databases, and caches, but does not know about UI.

| Contains | Examples |
|----------|---------|
| Repository implementations | `BorrowRepositoryImpl`, `CatalogRepositoryImpl` |
| API clients (data sources) | `HooplaBffClient`, `HooplaApiClient` |
| Local data sources | `BorrowLocalDataSource` (SQLDelight), `PreferencesDataSource` |
| Data transfer objects (DTOs) | `BorrowDto`, `TitleDto` |
| Mappers | `BorrowDto.toDomain()`, `BorrowEntity.toDomain()` |
| Caching strategies | Offline-first logic, sync scheduling |

Permitted imports: Domain layer, Ktor, SQLDelight, kotlinx.serialization.

Violation indicators:
- Imports from Presentation layer
- Imports from Framework layer
- A repository class applies circulation rules or returns formatted display strings (business logic belongs in Domain)

---

## Presentation layer

The presentation layer handles UI logic, state management, and navigation. It is independent of the specific UI framework rendering the UI.

| Contains | Examples |
|----------|---------|
| ViewModels / state holders | `HomeViewModel`, `TitleDetailViewModel`, `PlayerViewModel` |
| UI state classes | `HomeUiState`, `BorrowState` |
| UI events | `BorrowEvent.BorrowClicked`, `BorrowEvent.ReturnClicked` |
| Composable functions (CMP) | `HomeScreen`, `TitleDetailScreen`, `PlayerScreen` |
| Navigation logic | Route definitions, navigation handlers |

Permitted imports: Domain (for use cases and entities). Data via DI only — never import repository implementations directly. No Framework.

Violation indicators:
- A ViewModel imports `Context` — Presentation importing Framework
- A composable imports a repository implementation — Presentation bypassing Domain
- A ViewModel imports a DAO or Room database — Presentation accessing Data directly

Sealed class for UI state:
```kotlin
sealed class BorrowState {
    object Idle : BorrowState()
    object Loading : BorrowState()
    data class Success(val borrow: Borrow) : BorrowState()
    data class Error(val message: String) : BorrowState()
}
```

---

## Framework layer (outermost)

The framework layer contains code that is irreversibly tied to a specific platform or OS API.

| Contains | Examples |
|----------|---------|
| DRM implementations | `WidevineProviderImpl`, `FairPlayProviderImpl` |
| Platform-specific DI wiring | Koin modules, Hilt modules |
| Push notification handlers | `FirebaseMessagingService`, APNs handler |
| Biometric authentication | `BiometricPrompt` (Android), `LocalAuthentication` (iOS) |
| OS media controls | `MediaSessionService` (Android), `MPNowPlayingInfoCenter` (iOS) |
| App entry points | `Application`, `MainActivity`, `AppDelegate` |

Classification rule: any file that imports `android.media.MediaDrm`, `com.google.android.exoplayer2.drm.*`, `AVContentKeySession`, or `AVAssetResourceLoader` is a Framework-layer file. These are never KMP candidates.

Framework implementations are injected behind domain-defined interfaces. They are never directly referenced from inner layers.

---

## BFF layer position

The BFF (Backend-for-Frontend) is a server-side component. Its effect on the client architecture:

- The client's Data layer becomes a thin BFF client plus local cache.
- Business rules for circulation limits and availability move to the BFF.
- Client domain entities are simplified data models matching BFF responses.
- The client domain retains: offline state management, playback state, local user preferences.

```
Client Data layer calls --> BFF endpoint (single call per screen)
BFF contains:            --> Domain + Data layers server-side
Client Data layer:       --> Simplified (one BFF client, local cache, sync)
```

---

## Dependency rule enforcement

| Layer | Can import Domain | Can import Data | Can import Presentation | Can import Framework |
|-------|:-:|:-:|:-:|:-:|
| Domain | | | | |
| Data | Yes | | | |
| Presentation | Yes | via DI only | | |
| Framework | Yes | Yes | Yes | |

When classifying a file, check what it imports. The import list determines which layer the file belongs to — the directory name alone is not authoritative.

---

## Layer decomposition patterns

When a module mixes layers, decompose before migration.

### Pattern 1: Network call from UI class

Detection: a class in `*Activity`, `*Fragment`, `*ViewController`, or `*View` contains `HttpURLConnection`, `OkHttpClient`, `URLSession`, or Retrofit service interface calls.

Decomposition:
1. Extract the network call to a repository in the Data layer.
2. Extract business logic to a use case in the Domain layer.
3. Call the use case from a ViewModel in the Presentation layer.
4. The UI class observes ViewModel state only.

### Pattern 2: Business logic in repository

Detection: repository class applies circulation rules, calculates availability, or returns formatted strings for display.

Decomposition:
1. Extract business rules to use cases in the Domain layer.
2. Repository returns raw DTOs.
3. Use cases apply rules and return domain entities.

### Pattern 3: Database query in ViewModel

Detection: ViewModel imports a DAO or Room database directly.

Decomposition:
1. Introduce a repository interface in the Domain layer.
2. Move database access to a repository implementation in the Data layer.
3. ViewModel receives the repository via DI.

### Pattern 4: UI model reused as domain entity

Detection: a single data class has `@Entity` (Room), `@SerializedName` (Gson), and is passed directly to composable functions.

Decomposition:
1. Create a DTO in the Data layer matching the API/DB schema.
2. Create a domain entity in the Domain layer (no framework annotations).
3. Create a UI model in the Presentation layer.
4. Write mappers: DTO to domain entity, domain entity to UI model.

---

## Testing by layer

| Layer | Test type | Tool | Notes |
|-------|-----------|------|-------|
| Domain | Pure unit tests | JUnit (no Android dependencies) | No mocks needed for pure domain logic. Use fakes for repository interfaces. |
| Data | Integration tests with fakes | JUnit + in-memory SQLDelight driver + MockWebServer | Verify repositories correctly read, write, and map data. |
| Presentation | ViewModel tests + compose-test | `kotlinx.coroutines.test`, `compose-test` | Use `TestCoroutineScheduler`. Inject fake use cases. |
| Framework | Platform integration tests | Espresso (Android), XCTest (iOS) | Only test the glue code — DI wiring, platform event forwarding. |

The Domain layer must have the highest test coverage because it contains the business rules that define correctness. A Domain bug is a correctness bug. A Framework bug is an integration bug.

Coverage thresholds:
- Domain / Use Case layer: 90%
- Data layer: 80%
- Presentation layer: 75%
- Framework layer: 60%

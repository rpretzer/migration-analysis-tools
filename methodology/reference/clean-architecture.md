# CLEAN Architecture Reference

**Audience:** Codebase Analyst, Spec Compiler, and Coding Agent.
**Purpose:** Definitions, rules, and detection heuristics for applying CLEAN architecture to the KMP/CMP migration target state. Every module must be classified by CLEAN layer position in addition to migration bucket (KMP/CMP/native-only/BFF).

---

## 1. Layer definitions

CLEAN architecture organizes code into concentric layers. Dependencies flow inward only. Inner layers have no knowledge of outer layers.

```
+------------------------------------------+
|  Framework / Platform                    |  Outermost: platform SDKs, DRM, push, biometrics
|  +--------------------------------------+|
|  |  Presentation                        ||  ViewModels, state holders, UI logic
|  |  +----------------------------------+||
|  |  |  Data                            |||  Repository implementations, API clients, local storage
|  |  |  +------------------------------+|||
|  |  |  |  Domain                      ||||  Entities, use cases, repository interfaces
|  |  |  +------------------------------+|||
|  |  +----------------------------------+||
|  +--------------------------------------+|
+------------------------------------------+
```

---

## 2. Layer-by-layer description

### Domain (innermost)

The domain layer contains the core business rules of the application. It is pure Kotlin with no dependencies on any framework, library, or platform. It does not know about Ktor, Room, Retrofit, Android, or iOS.

| Contains | Examples |
|----------|---------|
| Entities | `Borrow`, `Title`, `Patron`, `Hold` |
| Use cases (interactors) | `BorrowTitle`, `ReturnTitle`, `GetPatronBorrows`, `SearchCatalog` |
| Repository interfaces | `BorrowRepository`, `CatalogRepository`, `PatronRepository` |
| Domain exceptions | `BorrowLimitExceededException`, `TitleUnavailableException` |
| Business rules | Borrow limit enforcement, hold queue logic, availability calculation |

**Dependency rule:** Domain imports nothing except Kotlin standard library and `kotlinx.coroutines` (for `Flow` and `suspend`).

**In the BFF architecture:** With a BFF layer, most domain logic (circulation rules, availability, content formatting) lives server-side in the BFF or backend microservices. The client domain layer is thinner — it contains the client-side subset of the domain: local borrow state, playback state, offline sync logic.

### Data

The data layer provides implementations of the repository interfaces defined in the domain layer. It knows about network clients, databases, and caches, but does not know about UI.

| Contains | Examples |
|----------|---------|
| Repository implementations | `BorrowRepositoryImpl`, `CatalogRepositoryImpl` |
| API clients (data sources) | `HooplaBffClient`, `HooplaApiClient` |
| Local data sources | `BorrowLocalDataSource` (SQLDelight), `PreferencesDataSource` |
| Data transfer objects (DTOs) | `BorrowDto`, `TitleDto` (match API/DB shapes) |
| Mappers | `BorrowDto.toDomain()`, `BorrowEntity.toDomain()` |
| Caching strategies | Offline-first logic, sync scheduling |

**Dependency rule:** Data imports Domain (for interfaces and entities) and third-party libraries (Ktor, SQLDelight). Data does not import Presentation or Framework.

### Presentation

The presentation layer handles UI logic, state management, and navigation. It is independent of the specific UI framework rendering the UI.

| Contains | Examples |
|----------|---------|
| ViewModels / state holders | `HomeViewModel`, `TitleDetailViewModel`, `PlayerViewModel` |
| UI state classes | `HomeUiState`, `BorrowState` (sealed classes or data classes) |
| UI events | `BorrowEvent.BorrowClicked`, `BorrowEvent.ReturnClicked` |
| Composable functions (CMP) | `HomeScreen`, `TitleDetailScreen`, `PlayerScreen` |
| Navigation logic | Route definitions, navigation handlers |

**Dependency rule:** Presentation imports Domain (for use cases and entities) and uses Data via dependency injection (never imports Data implementations directly). Presentation does not import Framework.

### Framework (outermost)

The framework layer contains code that is irreversibly tied to a specific platform or OS API. It provides concrete implementations of domain interfaces for platform-specific capabilities.

| Contains | Examples |
|----------|---------|
| DRM implementations | `WidevineProviderImpl`, `FairPlayProviderImpl` |
| Platform-specific DI wiring | Koin modules, Hilt modules |
| Push notification handlers | `FirebaseMessagingService`, APNs handler |
| Biometric authentication | `BiometricPrompt` (Android), `LocalAuthentication` (iOS) |
| OS media controls | `MediaSessionService` (Android), `MPNowPlayingInfoCenter` (iOS) |
| App entry points | `Application`, `MainActivity`, `AppDelegate` |

**Dependency rule:** Framework can import any layer. It is the only layer permitted to reference platform SDKs.

---

## 3. Dependency rule

> Source code dependencies must point inward. Nothing in an inner layer can know about anything in an outer layer.

| Can import | Domain | Data | Presentation | Framework |
|-----------|:---:|:---:|:---:|:---:|
| Domain | | | | |
| Data | Yes | | | |
| Presentation | Yes | (via DI only) | | |
| Framework | Yes | Yes | Yes | |

**Violation indicators:**
- A use case imports `HttpClient` or `SqlDriver` — Data leaking into Domain.
- A composable function imports a repository implementation — Presentation bypassing Domain.
- A ViewModel imports `Context` — Presentation importing Framework.
- A repository imports a composable — Data importing Presentation.

---

## 4. BFF layer position

The BFF (Backend-for-Frontend) is a server-side component. Its position in the client architecture:

```
Client Data layer calls --> BFF endpoint (single call per screen)
BFF contains:            --> Domain + Data layers server-side
                              (business rules, API orchestration)
Client Data layer:       --> Simplified (one BFF client, local cache, sync)
```

**Client-side impact:**
- The client's Data layer becomes a thin BFF client + local cache.
- Use cases for business logic (circulation rules, availability) move to the BFF.
- Client domain entities are simplified data models matching BFF responses.
- The client domain retains: offline state management, playback state, local user preferences.

---

## 5. Interface-driven DI for native-only code

Framework layer implementations are never directly referenced from inner layers. They are injected behind domain-defined interfaces.

```kotlin
// Domain layer: defines what it needs, not how it works
interface DrmProvider {
    suspend fun acquireLicense(contentId: String, token: String): DrmLicense
    suspend fun releaseLicense(contentId: String)
    fun isLicenseValid(contentId: String): Boolean
}

// Domain use case: uses the interface
class StartPlayback(private val drmProvider: DrmProvider) {
    suspend operator fun invoke(contentId: String, token: String): PlaybackSession {
        val license = drmProvider.acquireLicense(contentId, token)
        return PlaybackSession(contentId, license)
    }
}

// Framework layer (androidMain): provides the implementation
class WidevineProvider(private val context: Context) : DrmProvider {
    override suspend fun acquireLicense(contentId: String, token: String): DrmLicense { ... }
    override suspend fun releaseLicense(contentId: String) { ... }
    override fun isLicenseValid(contentId: String): Boolean { ... }
}

// Framework layer (iosMain): provides the iOS implementation
class FairPlayProvider : DrmProvider {
    override suspend fun acquireLicense(contentId: String, token: String): DrmLicense { ... }
    override suspend fun releaseLicense(contentId: String) { ... }
    override fun isLicenseValid(contentId: String): Boolean { ... }
}
```

The domain use case is pure, testable, and platform-independent.

---

## 6. Layer decomposition patterns

When a module mixes layers, it must be decomposed before migration. These are the most common mixed-layer patterns found in legacy mobile apps:

### Pattern 1: Network call from UI class

**Symptom:** An Activity, Fragment, or ViewController makes a direct HTTP call.

**Detection heuristic:** A class in `*Activity`, `*Fragment`, `*ViewController`, or `*View` contains `HttpURLConnection`, `OkHttpClient`, `URLSession`, or `Retrofit` service interface calls.

**Decomposition:**
1. Extract the network call to a repository in the Data layer.
2. Extract the business logic to a use case in the Domain layer.
3. Call the use case from a ViewModel in the Presentation layer.
4. The UI class observes ViewModel state only.

### Pattern 2: Business logic in repository

**Symptom:** A repository class applies circulation rules, calculates availability, or transforms data for display rather than just storing/fetching.

**Detection heuristic:** Repository class contains conditional logic based on business rules (borrow limits, hold queue position, content type-specific behavior), or returns formatted strings for display.

**Decomposition:**
1. Extract business rules to use cases in the Domain layer.
2. Repository returns raw data transfer objects.
3. Use cases apply rules and return domain entities.

### Pattern 3: Database query in ViewModel

**Symptom:** A ViewModel imports a database DAO or Room database directly.

**Detection heuristic:** ViewModel class imports `Dao`, `RoomDatabase`, or `@Query` annotated interfaces.

**Decomposition:**
1. Introduce a repository interface in the Domain layer.
2. Move the database access to a repository implementation in the Data layer.
3. ViewModel receives the repository via DI.

### Pattern 4: UI model reused as domain entity

**Symptom:** The same data class is used for the API response, the database entity, and the UI state.

**Detection heuristic:** A single model class has `@Entity` (Room), `@SerializedName` (Gson), and is passed directly to composable functions.

**Decomposition:**
1. Create a DTO in the Data layer matching the API/DB schema.
2. Create a domain entity in the Domain layer (clean, no framework annotations).
3. Create a UI model in the Presentation layer (contains only what the UI needs).
4. Write mappers: DTO → Domain entity, Domain entity → UI model.

---

## 7. Kotlin-specific patterns

### Use cases as suspend functions

```kotlin
// Single-operation use case
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

### Flow for reactive data

```kotlin
// Repository interface (Domain layer)
interface BorrowRepository {
    fun observePatronBorrows(patronId: String): Flow<List<Borrow>>
    suspend fun borrow(titleId: String, patronId: String): Result<Borrow>
    suspend fun returnTitle(borrowId: String): Result<Unit>
}
```

### Sealed classes for state

```kotlin
// Presentation layer UI state
sealed class BorrowState {
    object Idle : BorrowState()
    object Loading : BorrowState()
    data class Success(val borrow: Borrow) : BorrowState()
    data class Error(val message: String) : BorrowState()
}
```

---

## 8. Testing at each layer

| Layer | Test type | Tool | Notes |
|-------|-----------|------|-------|
| Domain | Pure unit tests | JUnit (no Android) | No mocks needed for pure domain logic. Use fakes for repository interfaces. |
| Data | Integration tests with fakes | JUnit + in-memory SQLDelight driver + MockWebServer | Test that repositories correctly read/write and map data. |
| Presentation | ViewModel tests + compose-test | `kotlinx.coroutines.test`, `compose-test` | Use `TestCoroutineScheduler`. Inject fake use cases. |
| Framework | Platform integration tests | Espresso (Android), XCTest (iOS) | Only test the glue code (DI wiring, platform event forwarding). |

**Testing rule:** The Domain layer must have the highest test coverage. It contains the business rules that define correctness. A bug in the Domain layer is a correctness bug. A bug in the Framework layer is an integration bug.

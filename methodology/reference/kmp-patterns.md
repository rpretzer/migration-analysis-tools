# KMP Migration Patterns

**Audience:** Codebase Analyst and Spec Compiler agents.
**Purpose:** Procedures and patterns for extracting shared business logic and data access into Kotlin Multiplatform (KMP) shared modules. Reference this when classifying modules and writing migration specs.

---

## 1. Module extraction procedure

This procedure applies when a module has been classified as a KMP candidate: it contains business logic, data models, networking, or validation with limited direct dependency on platform-specific APIs.

### Step 1: Identify the shared logic boundary

Review the module and separate code into three groups:

| Group | Description | Action |
|-------|-------------|--------|
| Shared | Pure Kotlin logic, data models, business rules, validation, repository interfaces | Move to shared module |
| Platform | Android/iOS SDK calls, UI code, platform file paths | Keep native; wrap behind `expect/actual` |
| Unknown | Third-party libraries that may or may not be KMP-compatible | Audit compatibility first (see Step 2) |

### Step 2: Audit third-party library compatibility

For each library the module depends on, determine KMP status:

| Library category | KMP-compatible alternative |
|-----------------|---------------------------|
| JSON serialization (Gson, Moshi) | `kotlinx.serialization` |
| Networking (Retrofit, OkHttp, URLSession) | `Ktor` (client) |
| Local storage (Room, CoreData) | `SQLDelight` |
| Reactive streams (RxJava, Combine) | Kotlin `Flow` + `kotlinx.coroutines` |
| Dependency injection (Hilt, Dagger, Koin-Android) | `Koin` (multiplatform), `kotlin-inject`, or manual DI |
| Date/time (java.time, ThreeTenBP) | `kotlinx-datetime` |
| HTTP logging | `Ktor` plugins |

If a dependency has no KMP alternative, it must remain in the platform-specific layer behind an interface.

### Step 3: Create the shared module

```
shared/
  build.gradle.kts        # KMP targets, source sets, dependencies
  src/
    commonMain/kotlin/    # Shared business logic
    androidMain/kotlin/   # Android expect/actual implementations
    iosMain/kotlin/       # iOS expect/actual implementations
```

Gradle configuration skeleton:

```kotlin
kotlin {
    androidTarget()
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-core:$ktorVersion")
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:$coroutinesVersion")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:$serializationVersion")
                implementation("app.cash.sqldelight:runtime:$sqldelightVersion")
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:$datetimeVersion")
            }
        }
        val androidMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-android:$ktorVersion")
                implementation("app.cash.sqldelight:android-driver:$sqldelightVersion")
            }
        }
        val iosMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-darwin:$ktorVersion")
                implementation("app.cash.sqldelight:native-driver:$sqldelightVersion")
            }
        }
    }
}
```

### Step 4: Implement expect/actual for platform differences

Use `expect`/`actual` only for platform-specific behavior. Do not use it for business logic.

```kotlin
// commonMain
expect class PlatformDispatcher() {
    val io: CoroutineDispatcher
    val main: CoroutineDispatcher
}

// androidMain
actual class PlatformDispatcher actual constructor() {
    actual val io: CoroutineDispatcher = Dispatchers.IO
    actual val main: CoroutineDispatcher = Dispatchers.Main
}

// iosMain
actual class PlatformDispatcher actual constructor() {
    actual val io: CoroutineDispatcher = Dispatchers.Default
    actual val main: CoroutineDispatcher = Dispatchers.Main
}
```

### Step 5: Wire up in platform apps

**Android:** Add the shared module as a Gradle dependency. Inject via Hilt/Koin.

**iOS:** Build the shared module as an XCFramework using `./gradlew assembleXCFramework`. Add to the Xcode project via SPM or direct framework embedding.

---

## 2. Serialization migration: Gson/Moshi to kotlinx.serialization

### Why this migration is required

Gson and Moshi use Java reflection. Reflection is not available in Kotlin/Native (iOS). `kotlinx.serialization` generates serialization code at compile time, which works across all KMP targets.

### Migration procedure

1. Add the `kotlinx.serialization` Gradle plugin and dependency.
2. Replace `@SerializedName` (Gson) or `@Json` (Moshi) with `@SerialName`.
3. Annotate data classes with `@Serializable`.
4. Replace `Gson().fromJson<T>(json, T::class.java)` calls with `Json.decodeFromString<T>(json)`.
5. Remove Gson/Moshi dependencies from the shared module.

```kotlin
// Before (Gson)
data class BorrowResponse(
    @SerializedName("borrow_id") val borrowId: String,
    @SerializedName("due_date") val dueDate: String
)

// After (kotlinx.serialization)
@Serializable
data class BorrowResponse(
    @SerialName("borrow_id") val borrowId: String,
    @SerialName("due_date") val dueDate: String
)
```

### Configuration

```kotlin
val json = Json {
    ignoreUnknownKeys = true    // Tolerate new server fields
    coerceInputValues = true    // Handle null where default is expected
    isLenient = false           // Strict JSON parsing in production
}
```

---

## 3. Networking migration: Retrofit/URLSession to Ktor

### Why Ktor

Retrofit is JVM-only. URLSession is Apple-only. Ktor provides a single API that compiles for Android (using OkHttp as the engine), iOS (using Darwin), and web (JavaScript or Wasm).

### Migration procedure

Define the API client in `commonMain`. The platform-specific engine is injected via the `HttpClient` constructor.

```kotlin
// commonMain: API client definition
class HooplaApiClient(private val httpClient: HttpClient) {

    suspend fun borrow(titleId: String, patronToken: String): BorrowResponse {
        return httpClient.post("/api/v3/borrows") {
            header("Authorization", "Bearer $patronToken")
            contentType(ContentType.Application.Json)
            setBody(BorrowRequest(titleId = titleId))
        }.body()
    }
}

// commonMain: expect engine factory
expect fun createHttpEngine(): HttpClientEngine

// androidMain: actual engine factory
actual fun createHttpEngine(): HttpClientEngine = Android.create()

// iosMain: actual engine factory
actual fun createHttpEngine(): HttpClientEngine = Darwin.create()
```

### BFF client pattern

When a BFF (Backend-for-Frontend) layer aggregates multiple backend calls into a single endpoint per screen, the Ktor client in the shared module becomes significantly simpler. Each screen gets one API call instead of 3-5:

```kotlin
// Without BFF: client orchestrates multiple calls
suspend fun loadHomeScreen(patronToken: String): HomeScreenData {
    val borrows = getBorrows(patronToken)
    val recommendations = getRecommendations(patronToken)
    val featured = getFeatured()
    return HomeScreenData(borrows, recommendations, featured)
}

// With BFF: single call, server-side orchestration
suspend fun loadHomeScreen(patronToken: String): HomeScreenData {
    return httpClient.get("/bff/v1/home") {
        header("Authorization", "Bearer $patronToken")
    }.body()
}
```

This is the primary reason the BFF reduces KMP scope from ~60% to ~30% of client code.

---

## 4. Local storage migration: Room/CoreData to SQLDelight

### Why SQLDelight

Room is JVM-only. CoreData is Apple-only. SQLDelight generates type-safe Kotlin code from SQL statements and provides drivers for Android (SQLite via Android driver), iOS (SQLite via Native driver), and JVM.

### Migration procedure

1. Write SQL schema and queries in `.sq` files in `commonMain`.
2. Generate Kotlin code by running the SQLDelight Gradle task.
3. Use the generated `Queries` classes to execute database operations.
4. Provide the platform-specific driver via dependency injection.

```sql
-- commonMain/sqldelight/com/hoopla/BorrowQueries.sq
CREATE TABLE borrow (
  id TEXT PRIMARY KEY NOT NULL,
  title_id TEXT NOT NULL,
  patron_id TEXT NOT NULL,
  due_date TEXT NOT NULL,
  is_downloaded INTEGER NOT NULL DEFAULT 0
);

selectAll:
SELECT * FROM borrow;

insert:
INSERT OR REPLACE INTO borrow VALUES (?, ?, ?, ?, ?);

deleteById:
DELETE FROM borrow WHERE id = ?;
```

```kotlin
// commonMain: repository using generated queries
class BorrowRepository(private val db: HooplaDatabase) {

    fun getAllBorrows(): Flow<List<Borrow>> =
        db.borrowQueries.selectAll()
            .asFlow()
            .mapToList(Dispatchers.Default)
}
```

---

## 5. Coroutines patterns

### Shared coroutine scope

Define a shared scope in `commonMain`. Platform apps provide the `SupervisorJob` and cancel it when the component is destroyed.

```kotlin
class SharedViewModel(private val borrowRepo: BorrowRepository) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    val borrows: StateFlow<List<Borrow>> = borrowRepo.getAllBorrows()
        .stateIn(scope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun onCleared() = scope.cancel()
}
```

### iOS coroutine export

Kotlin coroutines are not natively understood by Swift. Use the `kotlinx-coroutines-native` library and the SKIE or KMP-NativeCoroutines library to expose `Flow` as `AsyncSequence` in Swift, or expose `suspend` functions as `async/await`.

```kotlin
// With SKIE: @ObjCName annotation generates a Swift-friendly name
@ObjCName("HooplaSharedViewModel")
class SharedViewModel { ... }
```

### Dispatcher selection

| Operation | Dispatcher | Reason |
|-----------|-----------|--------|
| Database reads/writes | `Dispatchers.Default` on iOS; `Dispatchers.IO` on Android | iOS has no IO dispatcher |
| UI updates | `Dispatchers.Main` | Main thread on both platforms |
| CPU-intensive work | `Dispatchers.Default` | Background thread pool |
| Network calls | Ktor manages internally | Do not specify a dispatcher for Ktor calls |

---

## 6. Dependency injection

### Koin (recommended for KMP)

Koin is KMP-compatible and uses a Kotlin DSL without annotation processing. Annotation processing (kapt/ksp-based DI frameworks) works on JVM targets only.

```kotlin
// commonMain: shared module definitions
val sharedModule = module {
    single { HooplaApiClient(get()) }
    single { BorrowRepository(get()) }
    factory { SharedViewModel(get()) }
}

// androidMain: Android-specific module
val androidModule = module {
    single<SqlDriver> { AndroidSqliteDriver(HooplaDatabase.Schema, get(), "hoopla.db") }
}

// iosMain: iOS-specific module
val iosModule = module {
    single<SqlDriver> { NativeSqliteDriver(HooplaDatabase.Schema, "hoopla.db") }
}
```

---

## 7. Common pitfalls

### iOS memory model (strict)

Kotlin/Native on iOS uses a strict memory model. Objects shared between threads must be either frozen (immutable) or accessed only from one thread. Violation causes a runtime exception.

- Do not share mutable state between threads.
- Use `StateFlow` and `SharedFlow` which handle concurrency correctly.
- Avoid passing closures/lambdas across thread boundaries unless they capture only immutable values.

### JVM-only libraries in shared code

If a `commonMain` file imports any package from `java.*`, `android.*`, or `javax.*`, the module will not compile for iOS. Use the `expect/actual` pattern or find a KMP alternative.

**Detection heuristic:** Run `./gradlew linkDebugFrameworkIosArm64` after adding new dependencies. Compilation failures reveal JVM-only imports.

### Platform threading differences

On iOS, the main thread is the Kotlin main dispatcher. Long-running operations on the main thread cause UI freezes. Always dispatch background work to `Dispatchers.Default` and only update state on `Dispatchers.Main`.

### Objective-C interop naming

Kotlin functions and classes exported to Objective-C follow naming conventions that can produce verbose or ambiguous names. Use `@ObjCName` to provide clean Swift names:

```kotlin
@ObjCName("HooplaError", swiftName = "HooplaError")
sealed class AppError {
    @ObjCName("network")
    data class Network(val message: String) : AppError()
}
```

---

## 8. BFF client pattern (simplified networking)

When a BFF layer is in place, the KMP shared module only needs to implement:

1. A Ktor HTTP client with authentication middleware.
2. Data model classes annotated with `@Serializable` matching BFF response shapes.
3. A thin repository layer that calls BFF endpoints and maps responses to domain models.
4. Local SQLDelight caching for offline support.

It does not need to implement:
- Multi-API orchestration (BFF handles this server-side).
- Business rules for circulation limits (BFF handles this server-side).
- Content formatting or search ranking (BFF handles this server-side).

This constraint reduces the shared module's complexity substantially and lowers the risk of the KMP migration.

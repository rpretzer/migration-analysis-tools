# Skill: KMP Migration

## Purpose

This skill covers procedures and patterns for extracting shared business logic and data access into Kotlin Multiplatform (KMP) shared modules. Use it when classifying modules as KMP candidates and when writing migration specs.

---

## Module extraction procedure

Apply this procedure when a module has been classified as a KMP candidate: it contains business logic, data models, networking, or validation with limited direct dependency on platform-specific APIs.

### Step 1: Identify the shared logic boundary

Separate code in the module into three groups:

| Group | Description | Action |
|-------|-------------|--------|
| Shared | Pure Kotlin logic, data models, business rules, validation, repository interfaces | Move to shared module (commonMain) |
| Platform | Android/iOS SDK calls, UI code, platform file paths, DRM | Keep native; wrap behind expect/actual |
| Unknown | Third-party libraries that may or may not be KMP-compatible | Audit compatibility before classifying |

### Step 2: Audit third-party library compatibility

For each library the module depends on, determine KMP status:

| Library | KMP-compatible alternative |
|---------|--------------------------|
| Gson, Moshi (JSON serialization) | `kotlinx.serialization` |
| Retrofit, OkHttp, URLSession (networking) | `Ktor` client |
| Room, CoreData (local storage) | `SQLDelight` |
| RxJava, Combine (reactive streams) | Kotlin `Flow` + `kotlinx.coroutines` |
| Hilt, Dagger, Koin-Android (DI) | `Koin` multiplatform, `kotlin-inject`, or manual DI |
| java.time, ThreeTenBP (date/time) | `kotlinx-datetime` |

If a dependency has no KMP alternative, it must remain in the platform-specific layer behind an interface.

### Step 3: Create the shared module

Directory structure:
```
shared/
  build.gradle.kts
  src/
    commonMain/kotlin/    # Shared business logic
    androidMain/kotlin/   # Android expect/actual implementations
    iosMain/kotlin/       # iOS expect/actual implementations
    commonTest/kotlin/    # Shared tests
    androidTest/kotlin/   # Android-specific tests
    iosTest/kotlin/       # iOS-specific tests
```

Gradle configuration:
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

Use `expect/actual` only for platform-specific behavior. Do not use it for business logic.

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

Android: Add the shared module as a Gradle dependency. Inject via Hilt or Koin.

iOS: Build the shared module as an XCFramework using `./gradlew assembleXCFramework`. Add to the Xcode project via SPM or direct framework embedding.

---

## Serialization migration: Gson/Moshi to kotlinx.serialization

Gson and Moshi use Java reflection. Reflection is not available in Kotlin/Native (iOS). `kotlinx.serialization` generates serialization code at compile time, which works across all KMP targets.

Migration steps:
1. Add the `kotlinx.serialization` Gradle plugin and dependency.
2. Replace `@SerializedName` (Gson) or `@Json` (Moshi) with `@SerialName`.
3. Annotate data classes with `@Serializable`.
4. Replace `Gson().fromJson<T>(json, T::class.java)` with `Json.decodeFromString<T>(json)`.
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

Recommended Json configuration:
```kotlin
val json = Json {
    ignoreUnknownKeys = true    // Tolerate new server fields
    coerceInputValues = true    // Handle null where default is expected
    isLenient = false           // Strict JSON parsing in production
}
```

---

## Networking migration: Retrofit/URLSession to Ktor

Retrofit is JVM-only. URLSession is Apple-only. Ktor provides a single API that compiles for Android (OkHttp engine), iOS (Darwin engine), and web (JavaScript or Wasm).

Define the API client in commonMain. Inject the platform-specific engine via the HttpClient constructor.

```kotlin
// commonMain
class HooplaApiClient(private val httpClient: HttpClient) {
    suspend fun borrow(titleId: String, patronToken: String): BorrowResponse {
        return httpClient.post("/api/v3/borrows") {
            header("Authorization", "Bearer $patronToken")
            contentType(ContentType.Application.Json)
            setBody(BorrowRequest(titleId = titleId))
        }.body()
    }
}

expect fun createHttpEngine(): HttpClientEngine

// androidMain
actual fun createHttpEngine(): HttpClientEngine = Android.create()

// iosMain
actual fun createHttpEngine(): HttpClientEngine = Darwin.create()
```

### BFF client pattern

When a BFF layer is in place, the KMP shared module only needs:
1. A Ktor HTTP client with authentication middleware.
2. Data model classes annotated with `@Serializable` matching BFF response shapes.
3. A thin repository layer calling BFF endpoints and mapping responses to domain models.
4. Local SQLDelight caching for offline support.

It does not need multi-API orchestration, circulation business rules, or search ranking logic — the BFF handles these server-side. This reduces the shared module's complexity substantially.

```kotlin
// With BFF: single call per screen
suspend fun loadHomeScreen(patronToken: String): HomeScreenData {
    return httpClient.get("/bff/v1/home") {
        header("Authorization", "Bearer $patronToken")
    }.body()
}
```

---

## Local storage migration: Room/CoreData to SQLDelight

Write SQL schema and queries in `.sq` files in commonMain. SQLDelight generates type-safe Kotlin code.

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
class BorrowRepository(private val db: HooplaDatabase) {
    fun getAllBorrows(): Flow<List<Borrow>> =
        db.borrowQueries.selectAll()
            .asFlow()
            .mapToList(Dispatchers.Default)
}
```

---

## Dependency injection

Koin is KMP-compatible and uses a Kotlin DSL without annotation processing. Annotation processing (kapt/ksp-based frameworks) works on JVM targets only.

```kotlin
// commonMain: shared module definitions
val sharedModule = module {
    single { HooplaApiClient(get()) }
    single { BorrowRepository(get()) }
    factory { SharedViewModel(get()) }
}

// androidMain
val androidModule = module {
    single<SqlDriver> { AndroidSqliteDriver(HooplaDatabase.Schema, get(), "hoopla.db") }
}

// iosMain
val iosModule = module {
    single<SqlDriver> { NativeSqliteDriver(HooplaDatabase.Schema, "hoopla.db") }
}
```

---

## Coroutines patterns

### Dispatcher selection

| Operation | Dispatcher |
|-----------|-----------|
| Database reads/writes | `Dispatchers.Default` on iOS; `Dispatchers.IO` on Android |
| UI updates | `Dispatchers.Main` |
| CPU-intensive work | `Dispatchers.Default` |
| Network calls | Ktor manages internally; do not specify |

### iOS coroutine export

Kotlin coroutines are not natively understood by Swift. Use the SKIE library to expose `Flow` as `AsyncSequence` in Swift, or expose `suspend` functions as `async/await`.

```kotlin
@ObjCName("HooplaSharedViewModel")
class SharedViewModel { ... }
```

---

## Common pitfalls

### JVM-only imports in shared code

If a commonMain file imports any package from `java.*`, `android.*`, or `javax.*`, the module will not compile for iOS.

Detection: run `./gradlew linkDebugFrameworkIosArm64` after adding new dependencies. Compilation failures reveal JVM-only imports.

### iOS strict memory model

Do not share mutable state between threads. Use `StateFlow` and `SharedFlow`, which handle concurrency correctly. Avoid passing closures across thread boundaries unless they capture only immutable values.

### Objective-C interop naming

Use `@ObjCName` to provide clean Swift names for Kotlin types exported to Objective-C:

```kotlin
@ObjCName("HooplaError", swiftName = "HooplaError")
sealed class AppError {
    @ObjCName("network")
    data class Network(val message: String) : AppError()
}
```

### Dispatcher.IO not available on iOS

iOS has no IO dispatcher. Use `Dispatchers.Default` for all background work on iOS. The `PlatformDispatcher` expect/actual pattern handles this automatically.

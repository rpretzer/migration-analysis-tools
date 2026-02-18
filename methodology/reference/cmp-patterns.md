# Compose Multiplatform (CMP) Migration Patterns

**Audience:** Codebase Analyst and Spec Compiler agents.
**Purpose:** Patterns and constraints for migrating native UI (Android Compose, iOS UIKit/SwiftUI, React web) to Compose Multiplatform. Reference this when classifying UI modules and writing migration specs.

---

## 1. Overview of CMP targets

| Target | Runtime | Status (as of 2025) | Risk level |
|--------|---------|---------------------|------------|
| Android | Jetpack Compose (same engine) | Stable, production-ready | Low |
| iOS | compose-ios via Kotlin/Native | Stable for most UI patterns | Medium |
| Web (Wasm) | compose-web via Kotlin/Wasm | Alpha/Beta, limited ecosystem | High |
| Desktop (JVM) | compose-desktop | Stable | Low |
| TV (Android TV) | Compose TV | Stable | Low |

---

## 2. Android Compose to CMP

This is the lowest-risk migration path. Android Compose code is largely reusable in CMP with minor changes.

### What changes

| Item | Android Compose | CMP (commonMain) |
|------|----------------|------------------|
| Import prefix | `androidx.compose.*` | `org.jetbrains.compose.*` (for UI) + `androidx.compose.*` (for runtime, kept as is) |
| Resources | `R.drawable.*`, `stringResource()` | `Res.drawable.*`, `stringResource()` via `compose-resources` |
| Window insets | `WindowInsetsCompat` | `WindowInsets` (available via compose-foundation-layout) |
| Navigation | `androidx.navigation.compose` | `org.jetbrains.compose.navigation` (or third-party multiplatform nav) |

### What stays the same

- `@Composable` function signatures.
- `State<T>`, `remember`, `mutableStateOf`, `LaunchedEffect`, `derivedStateOf`.
- All layout primitives: `Box`, `Column`, `Row`, `LazyColumn`, `Scaffold`.
- Material 3 components: `TopAppBar`, `NavigationBar`, `Button`, `Card`, `TextField`.
- Modifier API.
- `StateFlow` / `collectAsStateWithLifecycle`.

### Build configuration change

```kotlin
// Before (Android-only module)
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

// After (CMP shared UI module)
plugins {
    id("org.jetbrains.kotlin.multiplatform")
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}

kotlin {
    androidTarget()
    iosX64(); iosArm64(); iosSimulatorArm64()
    // wasmJs()  // Add when web target is in scope

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.ui)
                implementation(compose.components.resources)
            }
        }
    }
}
```

---

## 3. iOS UIKit/SwiftUI to compose-ios

This migration has medium risk. The Compose UI renders inside a `UIViewController` on iOS via `ComposeUIViewController`. Native UIKit/SwiftUI is replaced with Compose composables.

### Integration with existing iOS app

```swift
// AppDelegate or SceneDelegate — wrap Compose UI in a UIViewController
import UIKit
import shared  // KMP shared module

class MainViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        let composeVC = MainViewControllerKt.MainViewController()
        addChild(composeVC)
        view.addSubview(composeVC.view)
        composeVC.view.frame = view.bounds
        composeVC.didMove(toParent: self)
    }
}
```

```kotlin
// shared/iosMain — expose entry point
fun MainViewController(): UIViewController =
    ComposeUIViewController { AppContent() }
```

### Navigation

Use a multiplatform navigation library rather than UINavigationController or SwiftUI's `NavigationStack`. Options:

| Library | Notes |
|---------|-------|
| `compose-navigation` multiplatform | Official Jetpack Navigation adapted for CMP. Recommended. |
| `Voyager` | Community library; simpler API, less alignment with Jetpack patterns. |
| `Decompose` | Supports back-stack and lifecycle across platforms. More complex setup. |

### Lifecycle management

iOS lifecycle events (foreground/background/memory pressure) must be forwarded to the Compose runtime. Use `ComposeUIViewController` with lifecycle callbacks or `LifecycleOwner` from the `lifecycle-core` KMP library.

### Interop: keep native UIKit where Compose cannot replace it

Some components have no CMP equivalent or have known compose-ios gaps. Keep these native and expose them via `UIKitView` or `UIKitInteropLayout`:

```kotlin
// Embed a native UIKit video player in a Compose screen
@Composable
fun NativeVideoPlayer(playerController: AVPlayerViewController) {
    UIKitView(
        factory = { playerController.view },
        modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f)
    )
}
```

Known components requiring native interop on iOS (as of CMP 1.7):
- Video playback surfaces (DRM-required: must stay native).
- Maps (use `UIKitView` with `MKMapView`).
- WebViews (`WKWebView`).
- Camera and AR views.

---

## 4. React to compose-web/Wasm

**This is the highest-risk migration path.** React's ecosystem (hooks, context, SSR) has no 1:1 mapping to Compose Multiplatform. Recommend migrating web last and using phased decomposition.

### Risk factors

| Risk | Impact |
|------|--------|
| Compose Wasm is Alpha/Beta | Breaking API changes between releases. Not suitable for production without thorough testing. |
| No React-to-Compose component mapping | Every React component must be reimplemented, not mechanically converted. |
| SSR is unsupported in Compose Wasm | Server-side rendering for SEO and initial page load performance cannot be achieved with compose-web/wasm today. |
| Web developer skill gap | The existing React/JavaScript team's skills do not transfer. KMP/Kotlin expertise is required. |
| Bundle size | Kotlin/Wasm bundles are large. Performance on slow connections must be tested. |

### Component mapping reference

| React concept | CMP equivalent |
|---------------|---------------|
| Functional component `const Component = () => <div>` | `@Composable fun Component()` |
| `useState` | `remember { mutableStateOf(value) }` |
| `useEffect` | `LaunchedEffect(key)` or `SideEffect` |
| `useContext` | `CompositionLocal` |
| `useMemo` | `remember(key) { computation }` |
| `useCallback` | `rememberUpdatedState` or `remember { lambda }` |
| `useReducer` | `StateFlow` + `ViewModel` |
| Redux store | `StateFlow` in a shared ViewModel |
| React Router | `compose-navigation` multiplatform |
| CSS modules / styled-components | `MaterialTheme` + `Modifier` |
| `React.lazy` + `Suspense` | No direct equivalent; use `LaunchedEffect` with loading state |

### Phased web migration approach (recommended)

Given the risk, migrate the web platform in phases rather than all at once:

1. **Phase 1:** Migrate shared business logic to KMP (no UI change). Web calls KMP via Kotlin/JS interop.
2. **Phase 2:** Migrate low-risk, self-contained screens to Compose Web. Keep core flows in React.
3. **Phase 3:** Migrate remaining screens after Compose Wasm reaches production stability.

This approach allows web teams to gain KMP/Compose experience incrementally and allows the ecosystem to mature.

---

## 5. Theming across platforms

### MaterialTheme

CMP uses Material 3's `MaterialTheme` across all targets. Define the theme once in `commonMain`:

```kotlin
@Composable
fun HooplaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) darkColorScheme(
            primary = Color(0xFF6366F1),
            error = Color(0xFFEF4444),
            background = Color(0xFF121212)
        ) else lightColorScheme(
            primary = Color(0xFF6366F1),
            error = Color(0xFFEF4444),
            background = Color(0xFFF9FAFB),
            surface = Color(0xFFFFFFFF)
        ),
        typography = HooplaTypography,
        shapes = HooplaShapes,
        content = content
    )
}
```

### Design token injection

Store design tokens in `pipeline/state/design-tokens.json`. The Design System MCP server exposes tokens to agents. When theming code is generated, it reads from this source of truth to keep design and code synchronized.

### Platform-specific theme overrides

Use `expect/actual` for platform-specific theming concerns:

```kotlin
// commonMain
expect fun platformSpecificRippleRadius(): Dp

// androidMain
actual fun platformSpecificRippleRadius(): Dp = 24.dp

// iosMain
actual fun platformSpecificRippleRadius(): Dp = 20.dp
```

---

## 6. Navigation

### Compose Navigation Multiplatform

```kotlin
@Composable
fun AppNavigation(navController: NavHostController) {
    NavHost(navController = navController, startDestination = "home") {
        composable("home") { HomeScreen(navController) }
        composable("title/{titleId}") { backStackEntry ->
            val titleId = backStackEntry.arguments?.getString("titleId") ?: return@composable
            TitleDetailScreen(titleId, navController)
        }
        composable("player/{titleId}") { backStackEntry ->
            val titleId = backStackEntry.arguments?.getString("titleId") ?: return@composable
            PlayerScreen(titleId)
        }
    }
}
```

### Deep linking

Deep links must be registered in the platform app (AndroidManifest.xml on Android, Info.plist on iOS) and handled at the nav host level:

```kotlin
composable(
    route = "title/{titleId}",
    deepLinks = listOf(navDeepLink { uriPattern = "hoopla://title/{titleId}" })
) { ... }
```

---

## 7. Platform-specific UI via expect/actual

Use `expect`/`actual` for platform widgets that have no CMP equivalent:

```kotlin
// commonMain
@Composable
expect fun VideoPlayerSurface(
    modifier: Modifier,
    onPlayerReady: (PlatformPlayer) -> Unit
)

// androidMain — ExoPlayer
@Composable
actual fun VideoPlayerSurface(
    modifier: Modifier,
    onPlayerReady: (PlatformPlayer) -> Unit
) {
    AndroidView(
        factory = { context ->
            PlayerView(context).also { view ->
                val exoPlayer = ExoPlayer.Builder(context).build()
                view.player = exoPlayer
                onPlayerReady(AndroidPlayer(exoPlayer))
            }
        },
        modifier = modifier
    )
}

// iosMain — AVKit
@Composable
actual fun VideoPlayerSurface(
    modifier: Modifier,
    onPlayerReady: (PlatformPlayer) -> Unit
) {
    val avPlayer = remember { AVPlayer() }
    UIKitView(
        factory = {
            val controller = AVPlayerViewController()
            controller.player = avPlayer
            onPlayerReady(IosPlayer(avPlayer))
            controller.view
        },
        modifier = modifier
    )
}
```

---

## 8. Testing

### compose-test multiplatform

```kotlin
// commonTest: works on all targets
@Test
fun borrowButtonShowsCorrectState() {
    rule.setContent {
        HooplaTheme {
            TitleDetailScreen(titleId = "123", viewModel = fakeViewModel)
        }
    }
    rule.onNodeWithTag("borrow-button")
        .assertIsDisplayed()
        .assertHasClickAction()
    rule.onNodeWithText("Borrow").assertIsDisplayed()
}
```

### Screenshot testing

Screenshot tests must be run per-platform. Use `Paparazzi` for Android and `compose-screenshot-testing` for CMP targets. Screenshots from iOS must be taken on a physical device or simulator — they cannot be generated from JVM-only test runs.

---

## 9. Known limitations and workarounds

| Limitation | Platform | Workaround |
|------------|---------|-----------|
| No `Dispatchers.IO` on iOS | iOS | Use `Dispatchers.Default` for background work |
| Video player must be native | iOS, Android | `UIKitView` on iOS, `AndroidView` on Android; define `PlatformPlayer` interface in KMP |
| DRM playback cannot be in CMP | All | Native `Framework` layer; DRM output feeds CMP player state via observable |
| System fonts not accessible via Compose | iOS | Use custom font files bundled in compose-resources |
| `LocalContext` not available in commonMain | All | Use `expect/actual` to provide context-equivalent per platform |
| Compose Wasm does not support SSR | Web | Keep initial page load in React or static HTML; hydrate with Compose after load |
| `compose-ios` memory usage is higher than native SwiftUI | iOS | Profile with Instruments; lazy-load heavy screens; avoid retaining large state in composition |

# Skill: CMP Migration (Compose Multiplatform)

## Purpose

This skill covers patterns and constraints for migrating native UI (Android Compose, iOS UIKit/SwiftUI, React web) to Compose Multiplatform (CMP). Use it when classifying UI modules and writing migration specs.

---

## Target status

| Target | Status | Risk |
|--------|--------|------|
| Android | Stable, production-ready (same Jetpack Compose engine) | Low |
| iOS (compose-ios) | Stable for most UI patterns | Medium |
| Web (Wasm) | Alpha/Beta, limited ecosystem | High |
| Desktop (JVM) | Stable | Low |
| TV (Android TV) | Stable | Low |

Migrate Android first, iOS second, web last. Never commit a fixed deadline for the web target until Compose Wasm reaches production stability.

---

## Android Compose to CMP

This is the lowest-risk migration path. Android Compose code is largely reusable in CMP with minor changes.

### What changes

| Item | Android Compose | CMP (commonMain) |
|------|----------------|-----------------|
| Import prefix | `androidx.compose.*` | `org.jetbrains.compose.*` for UI |
| Resources | `R.drawable.*`, `stringResource()` | `Res.drawable.*` via `compose-resources` |
| Navigation | `androidx.navigation.compose` | `org.jetbrains.compose.navigation` |

### What stays the same

- `@Composable` function signatures
- `State<T>`, `remember`, `mutableStateOf`, `LaunchedEffect`, `derivedStateOf`
- All layout primitives: `Box`, `Column`, `Row`, `LazyColumn`, `Scaffold`
- Material 3 components: `TopAppBar`, `NavigationBar`, `Button`, `Card`, `TextField`
- Modifier API
- `StateFlow` / `collectAsStateWithLifecycle`

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

## iOS UIKit/SwiftUI to compose-ios

The Compose UI renders inside a `UIViewController` on iOS via `ComposeUIViewController`. Native UIKit/SwiftUI is replaced with Compose composables.

### Integration with existing iOS app

```swift
// In AppDelegate or SceneDelegate
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

Use a multiplatform navigation library instead of UINavigationController or SwiftUI NavigationStack.

| Library | Notes |
|---------|-------|
| `compose-navigation` multiplatform | Official Jetpack Navigation adapted for CMP. Recommended. |
| `Voyager` | Community library; simpler API. |
| `Decompose` | Supports back-stack and lifecycle across platforms. More complex setup. |

### Components requiring native interop on iOS

Keep these native via `UIKitView` or `UIKitInteropLayout`:
- Video playback surfaces (DRM requirement — must stay native)
- Maps (`MKMapView`)
- WebViews (`WKWebView`)
- Camera and AR views

```kotlin
@Composable
fun NativeVideoPlayer(playerController: AVPlayerViewController) {
    UIKitView(
        factory = { playerController.view },
        modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f)
    )
}
```

### Lifecycle management

iOS lifecycle events (foreground/background/memory pressure) must be forwarded to the Compose runtime. Use `ComposeUIViewController` with lifecycle callbacks or `LifecycleOwner` from the `lifecycle-core` KMP library.

---

## React to compose-web/Wasm

This is the highest-risk migration path. Migrate web last. Use a phased approach.

### Risk factors

| Risk | Impact |
|------|--------|
| Compose Wasm is Alpha/Beta | Breaking API changes between releases |
| No React-to-Compose component mapping | Every component must be reimplemented, not mechanically converted |
| SSR is unsupported in Compose Wasm | Cannot achieve server-side rendering for SEO or initial page load performance |
| Web developer skill gap | React/JavaScript team skills do not transfer; KMP/Kotlin expertise required |
| Bundle size | Kotlin/Wasm bundles are large; test on slow connections |

### Component mapping reference

| React concept | CMP equivalent |
|---------------|---------------|
| `const Component = () => <div>` | `@Composable fun Component()` |
| `useState` | `remember { mutableStateOf(value) }` |
| `useEffect` | `LaunchedEffect(key)` or `SideEffect` |
| `useContext` | `CompositionLocal` |
| `useMemo` | `remember(key) { computation }` |
| `useReducer` | `StateFlow` + `ViewModel` |
| Redux store | `StateFlow` in a shared ViewModel |
| React Router | `compose-navigation` multiplatform |
| CSS modules | `MaterialTheme` + `Modifier` |
| `React.lazy` + `Suspense` | No direct equivalent; use `LaunchedEffect` with loading state |

### Phased web migration (recommended)

1. Phase 1: Migrate shared business logic to KMP. Web calls KMP via Kotlin/JS interop. No UI change.
2. Phase 2: Migrate low-risk, self-contained screens to Compose Web. Keep core flows in React.
3. Phase 3: Migrate remaining screens after Compose Wasm reaches production stability.

---

## Theming across platforms

Define the theme once in commonMain:

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

For platform-specific theming differences, use expect/actual:

```kotlin
// commonMain
expect fun platformSpecificRippleRadius(): Dp

// androidMain
actual fun platformSpecificRippleRadius(): Dp = 24.dp

// iosMain
actual fun platformSpecificRippleRadius(): Dp = 20.dp
```

---

## Navigation

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

Deep links must be registered in AndroidManifest.xml (Android) and Info.plist (iOS) and handled at the nav host level.

---

## Platform-specific UI via expect/actual

```kotlin
// commonMain
@Composable
expect fun VideoPlayerSurface(
    modifier: Modifier,
    onPlayerReady: (PlatformPlayer) -> Unit
)

// androidMain — ExoPlayer
@Composable
actual fun VideoPlayerSurface(modifier: Modifier, onPlayerReady: (PlatformPlayer) -> Unit) {
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
actual fun VideoPlayerSurface(modifier: Modifier, onPlayerReady: (PlatformPlayer) -> Unit) {
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

## Testing

Use `compose-test` multiplatform for UI tests that run across targets:

```kotlin
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

Use `Modifier.testTag("borrow-button")` for all interactive elements. The Test Agent relies on stable test tags for compose-test automation.

Screenshot tests must run per-platform. Use Paparazzi for Android. Screenshots from iOS must be taken on a physical device or simulator — they cannot be generated from JVM-only test runs.

---

## Known limitations

| Limitation | Platform | Workaround |
|------------|---------|-----------|
| No `Dispatchers.IO` on iOS | iOS | Use `Dispatchers.Default` for background work |
| Video player must be native | iOS, Android | `UIKitView` on iOS, `AndroidView` on Android; define `PlatformPlayer` interface in KMP |
| DRM playback cannot be in CMP | All | Native Framework layer; DRM output feeds CMP player state via observable |
| System fonts not accessible via Compose | iOS | Use custom font files bundled in compose-resources |
| `LocalContext` not available in commonMain | All | Use expect/actual to provide context-equivalent per platform |
| Compose Wasm does not support SSR | Web | Keep initial page load in React or static HTML |
| compose-ios memory usage is higher than native SwiftUI | iOS | Profile with Instruments; lazy-load heavy screens |

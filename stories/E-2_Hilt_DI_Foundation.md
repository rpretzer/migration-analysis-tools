# Wire Hilt DI foundation into BaseActivity and BaseFragment

**Title:** Wire Hilt DI foundation into BaseActivity and BaseFragment

**Story:**
As a developer working on the modernization roadmap, I want Hilt DI wired into the app's base classes so that all Phase 1 work can depend on constructor injection instead of the service locator.

**Context / Background:**
FrameworkServiceFactory.getInstance() is called in BaseActivity and BaseFragment to obtain FrameworkService. This is the single point of coupling identified as the highest-severity architectural finding. Replacing these two call sites with Hilt @Inject is the minimal change that unblocks coroutines, Repositories, and ViewModels. Individual controllers and tasks are not touched in this story — that is Phase 1 scope.

**In scope:**
- [ ] Declare FrameworkService as a Hilt @Singleton module
- [ ] Add @AndroidEntryPoint to BaseActivity and BaseFragment
- [ ] Replace the FrameworkServiceFactory.getInstance() calls in BaseActivity and BaseFragment with @Inject fields
- [ ] Verify the injected instance is the same singleton the rest of the app already uses

**Out of scope:**
- [ ] Migrating individual controllers, tasks, or Activities/Fragments to @Inject (that is Phase 1)
- [ ] Deleting FrameworkServiceFactory (it is still used by controllers; deletion is the Phase 2 cleanup step)
- [ ] Migrating any other service group (auth, networking, analytics) to Hilt modules

**Acceptance Criteria:**

```
Given the app is built with Hilt wired into BaseActivity and BaseFragment
When the app is launched
Then it starts successfully and all existing screens are reachable without crashes
```

```
Given BaseActivity is annotated with @AndroidEntryPoint
When the activity is created
Then FrameworkService is injected via @Inject, not obtained from FrameworkServiceFactory
```

```
Given BaseFragment is annotated with @AndroidEntryPoint
When the fragment is created
Then FrameworkService is injected via @Inject, not obtained from FrameworkServiceFactory
```

```
Given the Hilt module declares FrameworkService as @Singleton
When FrameworkService is injected into both a BaseActivity and a BaseFragment in the same app session
Then both receive the same object instance (verified via identity check in a debug log or test)
```

```
Given FrameworkServiceFactory still exists in the codebase
When a code search is run for FrameworkServiceFactory.getInstance()
Then zero results appear in BaseActivity or BaseFragment; results in other classes are expected and acceptable
```

**Non-functional requirements:**
- Performance: Hilt injection must not add measurable latency to Activity or Fragment creation. Smoke-test the app launch time before and after.
- Accessibility: Not applicable to this story.
- Observability: Not applicable to this story.
- Testing: A smoke test covering app launch and navigation to every top-level screen is required. An identity-check unit test confirms the @Singleton contract.

**Dependencies:**
- Roadmap item 0.1 (assessment) is complete.
- Hilt is not yet on the classpath; it must be added as a Gradle dependency in this story.

**Assumptions:**
- Dagger (already bundled but unwired) is not resurrected. Hilt wraps Dagger 2 internally; no raw Dagger @Module or @Inject annotations are written by hand.
- BaseActivity and BaseFragment are the only two classes that need @AndroidEntryPoint in Phase 0. All other entry points are added in Phase 1 as controllers are migrated.

**Effort estimate:** 5
**Estimation drivers:** First DI change in the app; smoke-test surface is the entire app; Medium risk per roadmap; sets the DI pattern that all Phase 1 work builds on.

# Audit and consolidate ui8/ legacy package

**Title:** Audit and consolidate ui8/ legacy package

**Story:**
As a developer maintaining the codebase, I want the ui8/ package audited and cleaned up so that dead code is removed and any live screens are in the correct package.

**Context / Background:**
The ui8/ package contains 10 classes that appear to be survivors from an older app version, including a comic reader activity and custom view classes. The main comic reader and all modern screens live in ui/. This story determines which classes are actually reachable from the current navigation graph, deletes the unreachable ones, and migrates the reachable ones into ui/.

**In scope:**
- [ ] Audit all 10 classes in ui8/ for reachability from the current navigation graph
- [ ] Delete all unreachable classes
- [ ] Migrate all reachable screens into the main ui/ package
- [ ] Verify migrated screens function identically after the package move

**Out of scope:**
- [ ] Refactoring the migrated screens to use ViewModels or Compose (that is future scope)
- [ ] Changes to controller or Repository logic

**Acceptance Criteria:**

```
Given all 10 classes in ui8/ have been audited
When the audit results are documented
Then every class is classified as reachable or unreachable, with the navigation path (or lack thereof) that justifies the classification
```

```
Given unreachable classes have been identified
When the code is committed
Then all unreachable classes are deleted from the codebase
```

```
Given reachable screens have been migrated to ui/
When the app is exercised and those screens are navigated to
Then they function identically to their pre-migration behaviour
```

```
Given the consolidation is complete
When a code search is run for ui8
Then zero references to the ui8/ package remain anywhere in the codebase
```

**Non-functional requirements:**
- Performance: Not applicable to this story.
- Accessibility: Migrated screens must retain all existing accessibility attributes (contentDescriptions, importantForAccessibility, etc.) after the package move.
- Observability: Not applicable to this story.
- Testing: Smoke-test every migrated screen manually. If any migrated screen has existing unit tests, they must pass after the package move.

**Dependencies:**
- Roadmap item 0.1 (assessment) is complete.

**Assumptions:**
- Reachability is determined by tracing navigation paths from all declared Activities and fragments. If a class is only reachable via a code path that is itself dead, it is classified as unreachable.
- The comic reader activity in ui8/ is likely dead given that the main comic reader is in ui/. This assumption is verified during the audit.

**Effort estimate:** 3
**Estimation drivers:** Small scope (10 classes); discovery-heavy (reachability audit) but execution is mechanical; low risk per roadmap.

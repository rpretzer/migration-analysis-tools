# Training Process

How a new team member repeats this analysis on another app or module. Written for clarity for offshore and mixed-experience teams. Every step references the specific CLAUDE.md section and the output artifact it produces.

---

## Prerequisites

- [ ] **Tooling installed:** Android Studio (latest stable), JADX (for APK decompilation if source is not available), a terminal with `unzip` and `file` commands. Xcode is only needed if the iOS app is in scope.
- [ ] **Code or APK access:** Either the source repository on the correct branch, or the release APK downloaded from the distribution channel. Do not use a third-party mirror APK without verifying the SHA-256 hash against the official release.
- [ ] **Ability to build and run the app locally:** The Android app must compile in Android Studio and launch on an emulator or device. If it does not, stop and resolve build issues before proceeding — the analysis depends on reading compiled output and layout resources.
- [ ] **Familiarity with CLAUDE.md:** Read CLAUDE.md from top to bottom. The objectives and output formats defined there are the contract. Every artifact you produce must conform to them.
- [ ] **Access to the analysis workspace:** The `analysis/` and `docs/` directories in the project repo. You will write your outputs there.

---

## Step-by-Step Workflow

### 1. Read the codebase structure

**CLAUDE.md reference:** §3 (How to read and reason about the code)
**Output artifact:** `analysis/PROJECT_STRUCTURE.md`

What to do:
- If you have source code, map the top-level directory structure first: modules, targets, Gradle files, and the main manifest.
- If you have only an APK, decompile it with JADX. Verify the APK is a real APK (run `file <name>.apk`; it should say "Java archive" or "Zip archive", not "HTML document"). Note: APKTool may not be available or functional — JADX alone is sufficient for source, resources, and manifest.
- Identify the package name, version, SDK levels, and process count from AndroidManifest.xml.
- List every package under the app's root package. For each package, note: approximate class count, what it does (one sentence), and whether it touches platform APIs directly.
- Identify third-party libraries by scanning the decompiled source tree for known package prefixes (e.g., `okhttp3`, `com.google`, `com.bugsnag`).
- Flag any security concerns you see in the manifest (hardcoded keys, test activities in release, deprecated permissions).
- Flag architectural patterns you observe: service locator, factory, callback chains, AsyncTask usage, presence or absence of DI annotations.

Write your findings into `analysis/PROJECT_STRUCTURE.md`. Use the same section headings as the Hoopla example in this repo.

### 2. Classify modules (KMP vs native)

**CLAUDE.md reference:** §4 (KMP migration evaluation)
**Output artifact:** `analysis/MODULE_CLASSIFICATIONS.md`

What to do:
- For every package identified in step 1, classify it into exactly one of three buckets:
  - **KMP candidate:** Mostly business logic, data models, networking, validation. Limited platform-API coupling. Would benefit from sharing across iOS and Android.
  - **Native modernize:** Tied to platform UI or OS integrations but the tech is outdated (e.g., deprecated fragments, legacy navigation, old async patterns).
  - **Native refactor / observability:** Must stay platform-specific but needs better logging, metrics, or structural cleanup.
- For each classification, write: module name, bucket, rationale (2–4 sentences), risks or unknowns, and suggested next steps.
- Pay special attention to packages that look like business logic but have hidden platform dependencies (e.g., a "controller" that directly constructs HTTP requests using a platform-specific HTTP client). Those are not KMP candidates until the platform dependency is abstracted.

Write your findings into `analysis/MODULE_CLASSIFICATIONS.md`.

### 3. Perform WCAG AA review

**CLAUDE.md reference:** §5 (Accessibility / WCAG AA audit)
**Output artifact:** `analysis/WCAG_AUDIT.md`

What to do:
- Go through every layout XML file in the decompiled resources. For each screen or flow, check the four WCAG pillars as they apply to native mobile:
  - **Perceivable:** Are text sizes in `sp` (not `pt` or `dp`)? Do images have `contentDescription`? Are colours hardcoded or theme-based? Do colours meet 4.5:1 contrast for normal text, 3:1 for large text?
  - **Operable:** Are tap targets at least 48x48 dp? Is there a logical focus order for keyboard/switch users? Are gestures the only way to perform any action?
  - **Understandable:** Do form fields have persistent labels (not just hints)? Are error messages specific and actionable?
  - **Robust:** Do custom views override `onInitializeAccessibilityNodeInfo`? Do state-changing controls announce their new state?
- Assign each finding a severity: Critical (blocks all users), High (blocks users who rely on assistive tech), Medium (degrades the experience), Low (cosmetic or deprecation).
- Group findings by severity and propose a remediation priority order (Phase 0 = before next release, Phase 1 = next sprint cycle, Phase 2 = backlog).

Write your findings into `analysis/WCAG_AUDIT.md`. Number every finding. Include the specific layout file and line number (or element ID) for every issue.

### 4. Assess tests and architecture

**CLAUDE.md reference:** §6 (Testing), §7 (Architectural audit)
**Output artifacts:** `analysis/ARCHITECTURE_AUDIT.md` (architecture), coverage baseline documented in the roadmap or a separate file

What to do for architecture:
- Identify the current architectural pattern: what plays the role of Model, View, and Controller/Presenter? Is there a Repository or data-access layer? Is there dependency injection?
- For each architectural gap, note: what the current state is, why it is a problem (what does it block or risk), and what the target state should be.
- Propose a migration sequence: order the gaps so that each fix unblocks the next. The sequence is the single most important output of this step — it becomes the roadmap's dependency backbone.

What to do for tests:
- Check whether CI runs any tests. If it does, note what kind (unit, integration, UI) and what coverage tooling is in place.
- If no tests exist, that is the baseline. Document it as "near-zero" and flag it in the roadmap as a Phase 0 item (establishing the baseline and thresholds).

Write your architecture findings into `analysis/ARCHITECTURE_AUDIT.md`. Number every finding. Include key file locations.

### 5. Write stories and estimates

**CLAUDE.md reference:** §10 (Roadmap), §11 (Story template), §12 (Stories with Gherkin ACs), §13 (Effort estimation), §14 (Jira import), §15 (Critical path analysis)
**Output artifacts:** `docs/ROADMAP.md`, `stories/*.md`, `docs/JIRA_IMPORT.md`, `docs/CRITICAL_PATH_ANALYSIS.md`

What to do:
- **Roadmap first.** Group your findings from steps 1–4 into three phases (Phase 0: foundations, Phase 1: KMP + modernization, Phase 2: optimization). For each item, define: description, success criteria, dependencies, timeframe, and risk level. Draw the dependency graph.
- **Critical path analysis.** Before committing to any timeline, trace every dependency chain in the roadmap. Identify the longest serial chain. Run the scenario analysis (full scope, subset, subset-plus-stretch). This is the feasibility gate — do not skip it. See `docs/CRITICAL_PATH_ANALYSIS.md` in this repo for the expected output format.
- **Stories.** For each roadmap item, write one or more stories using the template in `docs/USER_STORY_TEMPLATE.md`. Group stories into epics that map to the five CLAUDE.md §12 categories: KMP migration candidates, native modernization, refactors/observability, accessibility fixes, test/architecture improvements. Include Gherkin acceptance criteria (Given/When/Then). Write each story into its own file in `stories/`.
- **Estimates.** Add a Fibonacci story-point estimate to each story. Include a note on what drives the estimate (complexity, uncertainty, dependencies, cross-platform impact). If you are unsure, err on the side of a higher number — estimates are refined in sprint planning, not in the analysis.
- **Jira import.** Populate `docs/JIRA_IMPORT.md` with all epics and stories in the Jira-importable format. Include Issue Type, Summary, Description, Story Points, Labels, Component, Phase, and links to supporting docs.

---

## Chain-of-thought log

**CLAUDE.md reference:** §8 (Chain-of-thought documentation)
**Output artifact:** `analysis/ANALYSIS_LOG.md`

Throughout the process, maintain a log of:
- Questions you asked about the code and the answers you derived.
- Tradeoffs you considered and why you chose one path over another.
- Assumptions you made and what would change if they turn out to be wrong.

Append a new entry for each significant decision. Keep entries concise. The log is for introspection and future fine-tuning — future analysts reading it should be able to understand your reasoning without access to your conversation history.

---

## Example: First Week

This is a concrete walk-through of what days 1–5 look like when applying this process to a new app. Adjust the pace to your experience level.

**Day 1 — Structure and orientation**
- Read CLAUDE.md. Understand the five output categories and the artifact locations.
- Obtain the APK or source. Verify it is valid (file type check). Decompile if needed.
- Map the top-level package structure. Count classes per package. Note the manifest: package name, processes, activities, services.
- Flag any immediate security concerns (hardcoded keys, test activities in production).
- Write the first draft of `PROJECT_STRUCTURE.md`. It does not need to be complete — you will revise it as you learn more.
- Start `ANALYSIS_LOG.md` Entry 1 with your initial questions and what you found.

**Day 2 — Module classification and initial architecture read**
- Go through each package and classify it (KMP candidate / native modernize / native refactor). Write `MODULE_CLASSIFICATIONS.md`.
- Read the code paths that matter most: the main Activity, the base classes, the service-locator or DI entry point, the async layer, and the top-level controllers. Note the architectural patterns you see.
- Start `ARCHITECTURE_AUDIT.md` with the findings so far. You will add more as you dig deeper.

**Day 3 — WCAG audit**
- Go through every layout XML. Check for the issues listed in step 3 above. This is the most time-intensive step — layout files are numerous but the checks are mechanical.
- Write `WCAG_AUDIT.md` with all findings numbered and prioritised.
- Update `ANALYSIS_LOG.md` if you made any assumptions during the audit (e.g., "I assumed this custom view is not tappable because there is no OnClickListener in the layout; needs code verification").

**Day 4 — Roadmap and critical path**
- Synthesise the findings from days 1–3 into a roadmap. Group into three phases. Define dependencies between items.
- Run the critical path analysis. Identify the longest serial chain. Run the three scenarios. Determine whether the roadmap fits the team's proposed timeline.
- Write `ROADMAP.md` and `CRITICAL_PATH_ANALYSIS.md`.

**Day 5 — Stories, estimates, and Jira import**
- Write all stories using the template. Group into epics. Add Gherkin acceptance criteria and Fibonacci estimates.
- Populate `JIRA_IMPORT.md`.
- Do a final review pass: every roadmap item has a story, every story has acceptance criteria, every story has an estimate, and the Jira import document is complete.
- Present the deliverables to the team for review.

---

## Common pitfalls

- **Do not start writing stories before the roadmap is complete.** Stories are derived from roadmap items. Writing them first leads to gaps and inconsistent scope.
- **Do not skip the critical path analysis.** It is the single step that separates an optimistic plan from a realistic one. A roadmap without it is a wish list.
- **Do not classify a module as a KMP candidate without tracing its dependencies.** A class that looks like pure business logic may call a platform API two levels deep. Trace it.
- **Do not assume test coverage is zero without measuring it.** Run the coverage tool. If no tool exists, that is a Day 1 finding, not an assumption.
- **Do not ignore the ebook reader (or equivalent complex subsystem).** Note it, scope it out explicitly with a rationale, and create a follow-up item for it. Ignoring it silently leads to scope creep.

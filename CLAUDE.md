# CLAUDE.md – Mobile Audit & KMP Migration Planning System

## 0. About this document

This is the operating manual for a **repeatable analysis system**, not a one-off project spec. Any analyst with a Claude Code seat should be able to run this against a new mobile app and produce consistent, client-ready output.

The system was developed during an engagement with **Midwest Tape** (Holland, Ohio) for their **Hoopla Digital** platform. See `docs/operations/CLIENT_CONTEXT.md` for Hoopla-specific details.

**Key supporting documents:**
- `docs/operations/SYSTEM_ARCHITECTURE.md` — Artifact registry, execution flow, quality gates.
- `docs/operations/COST_AND_MODEL_STRATEGY.md` — When to use Opus vs Sonnet vs Haiku.
- `docs/operations/TOOLING_AND_AUTOMATION.md` — MCP servers, hooks, Jira/Figma pipelines.
- `docs/operations/CLAUDE_TEAMS_STRATEGY.md` — Multi-analyst and multi-agent execution.
- `docs/operations/BEST_PRACTICES.md` — Gaps identified during the Hoopla engagement.
- `docs/operations/PIPELINE_STRATEGY.md` — AI-native development pipeline architecture.
- `docs/operations/ARCHITECTURE_ANALYSIS.md` — MWT end-to-end architecture, BFF, microservices.
- `AGENTS.md` — Vendor-neutral entry point for any AI tool.
- `methodology/` — Portable role definitions, schemas, process, and reference materials.

---

## 1. Project purpose

Analyze a legacy iOS and/or Android codebase to plan an incremental migration to Kotlin Multiplatform (KMP) where appropriate, modernize platform-specific code, improve observability, ensure WCAG AA accessibility, and raise test coverage to production standards.

Outputs must be suitable for:

- Engineering implementation (clear module-level decisions, stories, and estimates).
- Accessibility and architecture review.
- Import into Jira for execution tracking.
- Visual validation via Figma Make prototypes.
- Handoff to offshore and mixed-experience teams.

---

## 2. Model selection and cost management

**Follow these rules for every task.** Using the wrong model wastes money or produces low-quality output.

| Task | Model | Rationale |
|------|-------|-----------|
| Architectural classification, critical path analysis, tradeoff reasoning | **Opus 4.6** | Requires multi-variable reasoning. Sonnet misses subtle coupling. |
| WCAG audits, story writing, structure mapping, analysis log entries | **Sonnet 4.5** | Well-defined rules, structured output. Good enough quality at 5–10x lower cost. |
| Figma prompt generation, Jira CSV export, template-driven transformations | **Haiku 4.5** | Mechanical field mapping. 10–20x cheaper than Opus. |
| Codebase exploration (read-only search and navigation) | **Sonnet 4.5** via `Explore` agent | Fast, sufficient for file traversal. |

When spawning agents via the Task tool, always specify the model:
```
Task(subagent_type="general-purpose", model="opus", ...)   # Architecture
Task(subagent_type="general-purpose", model="sonnet", ...)  # Stories, audits
Task(subagent_type="general-purpose", model="haiku", ...)   # Transforms
```

**Override rule**: If a Sonnet-produced artifact contains vague language ("consider refactoring" instead of a concrete action), re-run with Opus. If a task is pure data transformation, downgrade to Haiku.

See `docs/operations/COST_AND_MODEL_STRATEGY.md` for full cost profiles and monitoring guidance.

---

## 3. Tech stack and scope

- **Platforms**: Native iOS and Android apps.
- **iOS**: Objective-C and/or Swift, UIKit and/or SwiftUI.
- **Android**: Java and/or Kotlin, classic Views and/or Jetpack Compose.
- **Shared future direction**: Kotlin Multiplatform shared modules for business logic, networking, and data access; UI stays native.

**This phase is analysis and planning only**: no code changes are committed unless explicitly requested.

**Source code access is strongly preferred over decompiled binaries.** When only an APK/IPA is available, document this limitation in ANALYSIS_LOG.md and flag every finding that might be affected by decompilation artifacts. See `docs/operations/BEST_PRACTICES.md §1` for details.

---

## 4. How to read and reason about the code

When exploring the codebase:

- **Prefer top-down mapping**:
    - Identify modules, targets, Gradle/Xcode project structure.
    - Identify feature boundaries (authentication, search, playback, profile, etc.).
    - Map which code is clearly cross-platform business logic vs platform-specific UI, navigation, and integrations.

- **For each major feature or module, answer**:
    - What does this module do (user perspective, 1–3 sentences)?
    - Which platform(s) does it exist on?
    - Is the logic mostly business/data logic or heavily UI/OS-integrated?
    - What are key dependencies and external APIs (e.g., REST backends, SDKs)?

- **When source code is available** (preferred):
    - Read `build.gradle` / `Package.swift` for declared dependencies and versions.
    - Read test directories for actual test coverage.
    - Use git history (`git log --stat`) for change frequency and hotspots.
    - Read CI configuration for pipeline maturity assessment.

Document findings in concise, standard English suitable for offshore teams. Avoid idioms and abbreviations. Define acronyms on first use.

---

## 5. KMP migration evaluation (Objectives 1–3)

For every significant module or feature, classify it into one of these buckets:

### Candidate for KMP shared code (Objective 1)

- Mostly business logic, data models, networking, validation, state machines, or domain rules.
- Limited direct dependencies on platform-specific APIs.
- Beneficial to share across iOS and Android (e.g., auth flows, API clients, caching, domain calculations).

### Keep native but modernize implementation (Objective 2)

- Tied heavily to platform UI or OS integrations, but tech is outdated.
- Propose concrete upgrades (e.g., "Migrate this Objective-C controller to Swift with MVVM," "Convert this legacy view hierarchy to Jetpack Compose with navigation component").

### Keep native but refactor / improve observability (Objective 3)

- Must remain platform-specific due to native interactions, but code is complex, fragile, or underperforming.
- Identify specific pain points (e.g., unstructured logs, no error categorization, no tracing around API calls).

**For each module, produce a short entry**:

- Module name / path.
- Classification: KMP candidate / Native modernize / Native refactor/observability.
- Rationale (2–4 sentences).
- Risks/unknowns.
- Suggested next steps.

---

## 6. Accessibility / WCAG AA audit (Objective 4)

Audit the mobile apps against WCAG 2.1 AA requirements as they apply to native mobile apps.

For each screen/flow, check and document:

- **Perceivable**: Color contrast, text size, support for dynamic type, images with accessible labels, captions or transcripts where applicable.
- **Operable**: Tap targets size, consistent focus order, support for assistive technologies (VoiceOver/TalkBack), gesture alternatives where needed.
- **Understandable**: Clear labels, predictable navigation, error messaging, form validation clarity.
- **Robust**: Compatibility with VoiceOver/TalkBack, screen readers, and OS accessibility settings.

**Output format per screen**:

- Screen / flow name.
- Platform(s).
- WCAG issues: brief description + relevant WCAG 2.1 AA criterion identifier.
- Severity: Critical, High, Medium, Low.
- Remediation suggestion (1–3 sentences).

**Include screenshots or diagrams** for every screen referenced, especially when the output will be consumed by offshore teams who may not have the app installed.

---

## 7. Testing and "no toys" criteria (Objective 5)

Define what "no toys" means for this codebase:

- Minimum acceptable automated test coverage per module (unit, integration, and, where appropriate, UI tests).
- Presence of tests for core business logic, error handling, edge cases, and accessibility automation where possible.
- CI requirements: tests run on PRs, non-flaky baseline, clear reporting.

**For each module/feature**:

- Current test coverage level. If source is unavailable, state "unknown (APK-only analysis)" — do not guess.
- Gaps vs desired standard.
- Recommended test additions (types of tests, priority).

---

## 8. Architectural audit (Objective 6)

Audit modules against target architectural patterns.

**For each module**:

- Current pattern (if any) and layering.
- Issues to flag: tight coupling, cross-feature dependency violations, direct network calls from UI layers, inconsistent DI patterns.
- Suggested architectural improvements in concise, implementation-friendly language.

---

## 9. Chain-of-thought documentation (Objective 7)

Maintain `analysis/ANALYSIS_LOG.md` with:

- Date, module/screen under inspection.
- Questions you asked about the code and answers derived from the files.
- Tradeoffs considered (e.g., why a module is or is not KMP-worthy).
- Notes on uncertainty and assumptions.

**Discipline rules:**
- Write an entry at the **start** of each analysis session, not post-hoc.
- Minimum: 1 entry per session, 3–5 entries per day of active analysis.
- When you change a classification, log the change and the reason.
- When a client stakeholder provides new information, log it with attribution.

---

## 10. Training process (Objective 8)

Create `docs/TRAINING_PROCESS.md` describing how a new employee should repeat this analysis:

- Prerequisites (tooling, code access, branch, how to run the app).
- Step-by-step workflow: structure → classify → WCAG → architecture/tests → stories → roadmap.
- Example "day in the life" of a first week.
- Troubleshooting section: what to do if JADX fails, if APK is obfuscated, if source access is delayed.
- Peer review process: who reviews the analysis, what they check, approval criteria.

Optimize for clarity for offshore and mixed-experience teams.

---

## 11. Roadmap (Objective 9)

Produce `docs/ROADMAP.md` with 3 phases:

- **Phase 0 – Analysis & foundations**: assessment completion, test baselines, logging/observability improvements.
- **Phase 1 – KMP and modernization**: concrete increments.
- **Phase 2 – Optimization & advanced architecture**: deeper refactors, performance, advanced observability.

**For each item include**: description, success criteria, dependencies, timeframe, risk level.

---

## 12. User story template (Objective 10)

Define a standard template in `docs/USER_STORY_TEMPLATE.md`:

- Story title + "As a / I want / So that."
- Context / background.
- In-scope and out-of-scope bullets.
- Acceptance criteria in Given / When / Then format.
- Non-functional requirements (performance, accessibility, observability, testing).
- Dependencies and assumptions.

**Include a reference story per point value** (see `docs/operations/BEST_PRACTICES.md §6`) so teams can calibrate estimates.

---

## 13. User stories with Gherkin acceptance criteria (Objective 11)

From the analysis, create user stories for all workstreams: KMP, native modernization, refactors, accessibility, testing, architecture.

**For each story, include**: user story (per template), Gherkin ACs, explicit accessibility and testing requirements.

**Process**: Generate 3–5 sample stories first. Get client review. Only then generate the full set. This prevents expensive rework.

---

## 14. Effort estimation (Objective 12)

Fibonacci story points (1, 2, 3, 5, 8, 13, …) with estimation drivers noted per story.

---

## 15. Jira import (Objective 13)

Create both:
- `docs/JIRA_IMPORT.csv` — Machine-importable via Jira CSV import. Test the import before delivery.
- `docs/JIRA_IMPORT.md` — Human-readable mirror with epic cross-references.

**Preferred approach**: Use the Jira MCP server to create issues directly via API. See `docs/operations/TOOLING_AND_AUTOMATION.md §1.1` and `§3.1`. This avoids the CSV import workflow entirely and correctly sets up epic links, dependency links, labels, and story points.

---

## 16. Critical path analysis (Objective 14)

After `ROADMAP.md` is complete, produce `docs/CRITICAL_PATH_ANALYSIS.md` with:

1. Critical-path trace (longest serial chain).
2. Person-week inventory (total effort vs capacity).
3. Scenario table (at least three scenarios with likelihood assessments).
4. High-risk item audit (on/off critical path).
5. Single points of failure.
6. Go/no-go gates.

**Guiding principles:**
- The critical path is a hard floor. Do not promise a deadline that requires compressing below it.
- Present ranges, not single numbers.
- Resource allocation should be role-based, not headcount.

---

## 17. Claude-to-Figma Make workflow (Objective 15)

### 17.1 Detection rules

Classify every story as **UI-bearing** or **code-only** by scanning for: named screens, visual "Then" clauses, framework migration, multiple user-visible states, accessibility layout changes, or frame-rate NFRs.

Do NOT generate prompts for: data-model extraction, database migration, CI/tooling, async/DI refactoring, security changes, or planning/orchestration stories.

### 17.2 Input mapping

Map user story fields to Figma Make prompt fields per the table in `docs/operations/SYSTEM_ARCHITECTURE.md`. When multiple stories reference the same screen, merge into a single prompt.

### 17.3 Output schema

Every output is a single valid JSON object. No surrounding prose. Schema:

```json
{
  "ux_intent": "1–3 sentences describing what the prototype needs to prove.",
  "figma_make_prompt": "Full prompt for Figma Make (screen description, platform, frame size, nav, layout, states, behavior, style, first-step directive).",
  "ui_acceptance_criteria": ["Given/When/Then statements for visible/interactive elements."],
  "manual_validation_checklist": ["Actionable checks: spacing, states, tap targets ≥ 48x48dp, contrast ≥ 4.5:1, text ≥ 14sp, auto-layout, responsiveness."]
}
```

### 17.4 Platform defaults

| Context | Base frame | Nav pattern |
|---------|-----------|-------------|
| Phone (iOS & Android) | 390 × 844 | Top app bar + bottom nav or back arrow |
| Tablet | 768 × 1024 | Side nav or top app bar |
| TV (Leanback / Compose TV) | 1920 × 1080 | No top app bar; full-screen with D-pad focus rings |

### 17.5 Brand constraints (accumulator)

Maintained in `figma_prompts/_brand_constraints.json`. Updated after each Figma Make run.

Defaults:
- **Typography:** Caption 12sp, Body Small 14sp, Body Medium 16sp, Body Large 18sp, Title Small 20sp, Title Medium 22sp. Always sp, never pt or dp.
- **Colours:** Primary #6366F1. Error #EF4444. Success #10B981. Secondary text #6B7280. Background #F9FAFB. Surface #FFFFFF. Text primary #121212.
- **Spacing:** 4px base. Horizontal page padding 16px. Component gap 12px. Section gap 24px.
- **Components:** Material 3 style. Rounded corners 12px cards, 8px buttons/inputs. Buttons 48dp min height. Inputs 48dp min height.
- **Tap targets:** 48 × 48dp minimum.
- **Auto layout:** Required on every frame.
- **TV overrides:** All text ≥ 18sp. Tap targets ≥ 80 × 80dp. Focus ring 4px solid. Base frame 1920 × 1080.

### 17.6 Execution

Use **Haiku** for prompt generation (mechanical transformation). Generate prompts as part of Phase 4 story generation, not as a separate step. Validate JSON schema via hook or script before writing. Record Figma Make results in `figma_prompts/_detection_report.md`.

---

## 18. Stakeholder review gates

Insert these gates into the workflow. **Do not proceed past a gate without client confirmation.**

| Gate | Artifact reviewed | Reviewer | Proceed when |
|------|------------------|----------|-------------|
| Post-Phase 1 | PROJECT_STRUCTURE.md | Client tech lead | Structure confirmed accurate |
| Post-Phase 2 | MODULE_CLASSIFICATIONS.md + audits | Client tech lead + PO | Classifications accepted |
| Post-Phase 3 | ROADMAP.md + CRITICAL_PATH_ANALYSIS.md | PM + tech lead + budget | Scenario selected, capacity confirmed |
| Post-Phase 4 (sample) | 3–5 sample stories | Client tech lead | Story quality approved |
| Post-Phase 4 (full) | All stories + Figma prompts | Client tech lead | Ready for Jira import |
| Post-Phase 5 | JIRA_IMPORT.csv or API-created issues | PM | Backlog structure approved |

---

## 19. Security findings protocol

- **Never include actual credential values** in analysis documents. Reference by file and line number only.
- Create a separate `analysis/SECURITY_FINDINGS.md` with restricted access for sensitive findings.
- Notify the client of credential exposure **immediately** — do not wait for the full analysis.
- Redact values from any document shared with offshore teams or imported into Jira.

---

## 20. Dual-platform analysis

When both iOS and Android are in scope:

- Produce separate `analysis/android/` and `analysis/ios/` artifact sets.
- Produce a shared `analysis/CROSS_PLATFORM_MAPPING.md` showing which features exist on both platforms and where KMP consolidation is possible.
- Stories must specify platform scope: KMP stories → both; Compose stories → Android; SwiftUI stories → iOS.
- Run platform analyses in parallel when using Claude Teams or multi-agent execution.

---

## 21. Versioning the analysis

- Git-track this repo from day one.
- Tag each delivery: `git tag v1.0-<client>-<app-version>`.
- When the client releases a new app version, create a branch, diff the structure map, and only re-audit changed packages.
- Mark new/updated stories with a `delta-<version>` label.

---

## 22. Tooling integrations

Configure these in `.claude/settings.json` or project MCP settings:

### Jira MCP server (recommended over CSV)
Creates issues directly via API with correct epic links and dependency chains. See `docs/operations/TOOLING_AND_AUTOMATION.md §1.1`.

### GitHub MCP server
When source code is on GitHub, read build files, tests, CI config, and git history directly. See `docs/operations/TOOLING_AND_AUTOMATION.md §1.2`.

### Figma MCP server
Read existing design files to inform WCAG audits and brand constraints. See `docs/operations/TOOLING_AND_AUTOMATION.md §1.3`.

### Quality enforcement hooks
- Story validation hook: ensures every story matches the template.
- Figma prompt validation hook: ensures valid JSON matching §17.3 schema.
- Analysis log reminder: prompts an entry if 30+ minutes pass without an update.

See `docs/operations/TOOLING_AND_AUTOMATION.md §2` for configuration.

---

## 23. Agent orchestration

Two levels of delegation are available. Choose based on task complexity:

### Task tool subagents (simple delegation)
For bounded, single-turn tasks: generate one story, convert a format, search for a file. The subagent runs within your session and returns a result. Use for Phase 5 export (Haiku) or individual story generation.

### Claude Code Teams (parallel orchestration)
For the full analysis pipeline. Teams spawns agents with **separate context windows** that persist across turns, coordinate via `SendMessage` and a shared `TaskList`, and run in true parallel.

**Recommended team structure:**
```
Lead Analyst (Opus 4.6) — orchestrator, owns roadmap + critical path
  ├── android-analyst (Sonnet) — structure mapping → module classification
  ├── ios-analyst (Sonnet) — iOS structure + classification (if in scope)
  ├── architect (Opus) — architecture audit
  ├── a11y-auditor (Sonnet) — WCAG audit
  └── story-writer (Sonnet) — stories + Figma prompts
```

**Why Teams matters for this work:** Each agent maintains its own context across multiple turns. The android-analyst can read 50+ source files and build a package model without consuming the lead's context. The architect can deep-dive into dependency anti-patterns without displacing the WCAG auditor's findings. A Hoopla-sized app (1,200+ classes, 56 packages) cannot fit all analysis context in a single window.

**Coordination rules:**
- Agents write to separate files. Never have two agents write to the same artifact.
- Prefer reading shared files over agent-to-agent messaging.
- The lead reviews every agent output before proceeding past a quality gate.
- **Do not delegate**: Roadmap authoring, critical path analysis, or ANALYSIS_LOG.md.
- 3–5 agents is the sweet spot. More creates coordination overhead that exceeds the parallelism benefit.

**Cost/speed tradeoff:** Teams is ~50% more expensive (multiple context windows) but ~3x faster (true parallelism). On Claude Code Pro (fixed monthly seat), the token cost is absorbed — use Teams aggressively.

See `docs/operations/CLAUDE_TEAMS_STRATEGY.md` for the full phase-by-phase execution plan, communication patterns, and a timeline example.

---

## 24. AI-native development pipeline

This system extends beyond analysis into a full AI-native development pipeline. All code is generated by agentic AI. All testing is AI-generated and AI-executed. The PM/PO may be non-technical. Full observability is required at every stage.

**Core documents:**
- `docs/operations/PIPELINE_STRATEGY.md` — Full pipeline architecture, agent roles, MCP servers.
- `docs/operations/ARCHITECTURE_ANALYSIS.md` — MWT end-to-end architecture, BFF recommendation, microservices decomposition.
- `AGENTS.md` — Vendor-neutral entry point for any AI tool.
- `methodology/` — Portable role definitions, schemas, process, and reference materials.

**Target architecture: CLEAN + KMP + CMP + BFF**

The target follows CLEAN architecture with a BFF layer that moves business logic server-side:

| Layer | Location | Technology |
|-------|----------|-----------|
| Domain (entities, use cases) | BFF + backend services | Kotlin (Ktor) |
| Data (repositories, API clients) | BFF (aggregation) + client (BFF client, offline) | Ktor (BFF), KMP shared (client) |
| Presentation (ViewModels, UI) | Client only | KMP ViewModels + CMP shared UI |
| Framework (DRM, push, biometrics) | Client only | Native per-platform |

**Classification framework** — every module is classified by:
1. Deployment target: BFF / backend / KMP shared / CMP shared / native-only
2. CLEAN layer: Domain / Data / Presentation / Framework
3. Migration readiness: ready / needs decomposition / blocked

Modules that mix layers or deployment targets require decomposition stories as prerequisites.

---

## 25. Coach interaction protocol

The Coach is the only agent that interacts with the PM/PO. It accepts imprecise business language and guides structured inquiry.

**Produces:** `pipeline/intake/business-case.md`, `pipeline/intake/epics.md`, `pipeline/intake/stories-draft.md`, `pipeline/intake/change-request.md`

**Push-back rules (weak-signal detection):**

| Signal | Response |
|--------|----------|
| Market/impact stated without evidence | Ask for basis: bottom-up count or data source |
| Solution described before problem validated | Redirect: who has this problem, what evidence? |
| No competitive or alternative analysis | Ask: who else solves this, or why not? |
| Vague success metric ("improve engagement") | Demand: by how much, over what period, for which segment? |
| Single solution considered | Require two alternatives, even if worse |
| Large effort with no phasing | Ask: what's the smallest version that tests the hypothesis? |

**Amplification rules (strong-signal detection):**

| Signal | Response |
|--------|----------|
| Quantified problem with user evidence | Go deeper: retention/revenue impact of not solving |
| Competitive gap with data | Build into positioning; quantify switching cost |
| Falsifiable hypothesis | Define experiment: what data confirms/refutes in 2 weeks? |
| Clear tradeoff articulated | Verify deferred-work stakeholders are aware |

**Feature flag integration:** At intake, Coach asks about rollout strategy — percentage rollout, targeting rules, kill switch criteria. Captured in business-case.md and stories-draft.md.

---

## 26. Spec compilation procedure

The Spec Compiler transforms Coach outputs into machine-consumable specifications. It is the critical bridge between PM intent and engineering execution.

**Per story, produces:**
- `pipeline/specs/{story-id}/spec.md` — Gherkin ACs, file-level change targets, test spec, NFRs, dependencies
- `pipeline/specs/{story-id}/context.md` — Extracted codebase context the Coding Agent needs
- `pipeline/specs/{story-id}/test-spec.md` — Test plan for the Test Agent
- `pipeline/specs/{story-id}/questions.md` — Unresolvable ambiguities routed back to Coach/PM

**Grounding rules:**
1. Every file-level change target must reference an actual file path from the current-state model.
2. Every pattern reference ("follow the pattern in X") must cite a specific file and line range.
3. Every Gherkin AC must be mechanically verifiable — no "should feel responsive" or "should be intuitive."
4. Every spec includes CLEAN layer mapping: which layer this change affects, and verification that the dependency rule is not violated.

**Multi-target specs:** When a feature spans BFF and client, spec.md includes both BFF and client changes with explicit dependency ordering. The pipeline sequences BFF → client.

**Feature flag specs:** Every migration spec includes LaunchDarkly flag key, default value, targeting rules, and both code paths (flag-on and flag-off). Test spec includes flag state matrix.

---

## 27. Tri-platform analysis requirements

The analysis must be exhaustive across all platforms: Android, iOS, web, BFF, and backend services.

**Per-platform analysis scope:**

| Platform | Key assessments |
|----------|----------------|
| Android | Kotlin/Java ratio, Gradle modules, Compose adoption %, existing KMP usage, ProGuard/R8 config, build variants |
| iOS | Swift/ObjC ratio, SPM vs CocoaPods, SwiftUI vs UIKit surface area, modularization status |
| Web | React component inventory, state management, routing, SSR/CSR split, bundler, TypeScript coverage |
| BFF | Service inventory (if exists), API aggregation patterns, response shaping, caching strategy |
| Backend | Service boundaries, API contracts, data ownership, event pipelines, database schemas |

**Cross-platform mapping:**
- Feature parity matrix: which features exist on which platforms
- Shared API surface: which backend endpoints are called by which clients
- DRM implementation differences per platform
- BFF aggregation opportunities: which multi-call patterns in clients can become single BFF calls

**Risk ranking:**
- Android Compose → CMP: Low risk (incremental, well-documented)
- iOS SwiftUI → compose-ios: Medium risk (new toolchain, interop needed)
- React → Compose Web/Wasm: **High risk** (least mature path, no 1:1 React equivalents, web team skills don't transfer). Recommend web migrates last.

**BFF analysis:** Identify thick-client business logic that should migrate to BFF. Estimate extraction complexity. Map existing API contracts to inform BFF aggregation design. Classify every module by deployment target (server vs client) in addition to CLEAN layer.

---

## 28. Observability and event logging

Every agent logs structured events to `pipeline/observability/events.jsonl` via the Observability MCP server.

**Event schema:**
```json
{
  "timestamp": "ISO-8601",
  "agent": "agent-name",
  "action": "action-type",
  "story_id": "story-identifier",
  "input_refs": ["file paths read"],
  "output_refs": ["file paths written"],
  "decision": "what was decided and why",
  "confidence": "high | medium | low",
  "duration_ms": 12400
}
```

**Required event types:**

| Type | When to log |
|------|-------------|
| `agent_start` | Agent begins work on a story |
| `decision` | Agent makes a classification or routing choice |
| `artifact_write` | Agent writes an output file |
| `artifact_read` | Agent reads a file to inform a decision |
| `question` | Agent cannot resolve ambiguity from available context |
| `gate_check` | Quality gate runs a specific check |
| `gate_verdict` | Quality gate issues final verdict |
| `human_action` | Human reviewer takes action |

**Backward tracing:** When output is wrong, trace from the failing gate check → artifact that failed → spec that produced it → Coach interaction → PM intent. Each step is one query on `events.jsonl` filtered by `story_id` and `output_ref`. The trace is linear — each artifact has exactly one producer.

**Dashboard metrics:** Throughput (stories/day), cycle time (intake to gate pass), gate pass rate (first attempt), spec quality (specs producing gate-passing implementations without retry), common failures (histogram by check name).

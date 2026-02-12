# Best Practices — Gaps and Additions

Practices that the original CLAUDE.md does not address, identified during the Hoopla analysis and relevant to real-world execution.

---

## 1. Source code access vs. decompiled code

### The problem
The Hoopla analysis was performed on a decompiled APK (JADX). This has significant limitations:
- No build.gradle: dependency versions are inferred from classpath, not declared.
- No test files: test coverage assessment is guesswork ("expected: near zero" is an assumption).
- No git history: can't identify hotspots, change velocity, or ownership.
- No CI config: can't assess current pipeline maturity.
- Obfuscation can hide class names and relationships.

### Best practice
**Always request source code access first.** Decompiled analysis is a fallback, not the default.

When source is available:
- Read `build.gradle` / `build.gradle.kts` for actual dependency declarations.
- Read test directories for actual coverage.
- Use `git log --stat` for change frequency.
- Read CI config (.github/workflows, Jenkinsfile, etc.) for pipeline assessment.

When only APK/IPA is available:
- Document the limitation prominently in ANALYSIS_LOG.md.
- Flag every finding that might be wrong due to decompilation artifacts.
- Do not estimate test coverage — state "unknown, APK-only analysis."

---

## 2. iOS analysis

### The gap
The CLAUDE.md assumes both platforms, but the Hoopla analysis only covers Android. No iOS structure mapping, module classification, WCAG audit, or stories exist.

### Best practice
For dual-platform projects:
1. Analyze both platforms in parallel (see `CLAUDE_TEAMS_STRATEGY.md §3.2`).
2. Produce separate `analysis/` artifacts per platform: `analysis/android/PROJECT_STRUCTURE.md`, `analysis/ios/PROJECT_STRUCTURE.md`.
3. Produce a shared `analysis/CROSS_PLATFORM_MAPPING.md` that shows which features exist on both platforms and where KMP can consolidate.
4. Stories should specify platform scope. A KMP story applies to both; a Compose story is Android-only; a SwiftUI story is iOS-only.

For iOS specifically:
- Use Xcode project structure (`.xcodeproj` / `.xcworkspace` / SPM `Package.swift`).
- Map targets, schemes, and frameworks.
- Assess Swift vs. Objective-C percentage.
- Check for SwiftUI adoption level.

---

## 3. Stakeholder review gates

### The gap
The current process produces artifacts but has no formal review gates where the client confirms findings before the next phase proceeds.

### Best practice
Insert review gates at these points:

| Gate | What is reviewed | Who reviews | Decision |
|------|-----------------|-------------|----------|
| Post-Phase 1 | PROJECT_STRUCTURE.md | Client tech lead | Confirm structure is accurate; flag any missing modules or features |
| Post-Phase 2 | MODULE_CLASSIFICATIONS.md | Client tech lead + product owner | Confirm KMP vs. native decisions; challenge any classification the client disagrees with |
| Post-Phase 3 | ROADMAP.md + CRITICAL_PATH_ANALYSIS.md | Client PM + tech lead + budget owner | Select scenario (A/B/C); confirm team capacity assumptions; approve timeline |
| Post-Phase 4 | Sample stories (3–5) | Client tech lead | Confirm story quality and detail level before generating the full set |
| Post-Phase 5 | JIRA_IMPORT.csv | Client PM | Approve import; confirm epic structure matches their Jira workflow |

**Do not generate 30 stories before the client has validated the approach on 3–5 examples.** This prevents expensive rework.

---

## 4. Versioning and diffing

### The gap
No strategy for what happens when the app updates mid-analysis or post-delivery.

### Best practice
- Git-track the analysis repo from day one.
- Tag each delivery: `git tag v1.0-hoopla-4.42.1`.
- When the client releases a new version:
  1. Create a branch: `update/v4.43.0`.
  2. Re-run Phase 1 (structure mapping) on the new binary/source.
  3. Diff against the previous structure map. Only re-audit changed packages.
  4. Update affected stories. Mark new stories with a `delta-v4.43.0` label.
  5. Update JIRA_IMPORT with the delta.

---

## 5. Security findings handling

### The gap
The Hoopla analysis found hardcoded API keys with actual values in `PROJECT_STRUCTURE.md`. This is a security risk if the analysis repo is shared broadly.

### Best practice
- **Never include actual credential values in analysis documents.** Reference them by location only: "API key at AndroidManifest.xml line 47."
- If credentials are found, create a separate `SECURITY_FINDINGS.md` with restricted access.
- Notify the client immediately — don't wait for the full analysis to complete.
- Redact the values from any document that will be shared with offshore teams or imported into Jira.

---

## 6. Estimation calibration

### The gap
Story point estimates are uncalibrated. They use Fibonacci scale but without a reference story defining what "1 point" means for this team.

### Best practice
- Define a **reference story** for each point value. Example:
  - 1 point: E-1 (Rotate credentials) — mechanical change, one file, low risk.
  - 3 point: E-3 (Test coverage baseline) — CI configuration, moderate scope, low risk.
  - 5 point: D-1 (WCAG Critical fixes) — many files but mechanical, low risk.
  - 8 point: A-1 (KMP bean extraction) — moderate complexity, cross-platform compilation, some uncertainty.
  - 13 point: B-1 (Coroutines migration) — high complexity, wide blast radius, critical path.
- Include this reference scale in the `docs/USER_STORY_TEMPLATE.md`.
- Revisit after the first sprint: if actual velocity diverges from estimates by >30%, recalibrate.

---

## 7. Analysis log discipline

### The gap
The ANALYSIS_LOG.md has a single post-hoc entry. It should be a running journal.

### Best practice
- Write an entry at the start of each analysis session (not at the end).
- Minimum content per entry: date, what was analyzed, key decision made, assumptions introduced.
- When you change your mind about a classification, log the change and the reason.
- When a client stakeholder provides new information, log it with attribution.
- Target: 1 entry per analysis session, 3–5 per day of active analysis.

---

## 8. Offshore team considerations

### The gap
The CLAUDE.md mentions offshore teams but doesn't address common failure modes.

### Best practice
- **Write for non-native English readers**: Avoid idioms, abbreviations, and cultural references. "TBD" → "to be determined." "LGTM" → "approved."
- **Include screenshots or diagrams** for every screen referenced in the WCAG audit. Offshore teams may not have the app installed.
- **Define acronyms on first use** in every document (don't assume they read the other docs).
- **Time zone awareness**: Note when review gates require synchronous discussion vs. asynchronous approval.
- **Acceptance criteria must be testable by someone who has never seen the app**: Gherkin scenarios should describe the UI state, not reference "the current behavior."

---

## 9. Figma Make prompt completion

### The gap
17 Figma prompt JSON files were identified as needed but never generated.

### Best practice
- Generate prompts as part of Phase 4, not as a separate step.
- Use the detection report as a checklist — don't mark Phase 4 complete until every triggered screen has a JSON file.
- Validate each JSON against the §16.3 schema before writing.
- After pasting into Figma Make, record the result (success/failure/adjustments needed) in the detection report.

---

## 10. What "done" looks like

An analysis is complete when:
1. Every artifact in `SYSTEM_ARCHITECTURE.md §2` exists and passes its quality gate.
2. The client has reviewed and approved at each gate in §3 above.
3. JIRA_IMPORT.csv has been successfully imported (or issues created via API).
4. Figma Make prototypes exist for all UI-bearing stories.
5. ANALYSIS_LOG.md has entries covering every major decision.
6. The analysis repo is tagged and the client has access.

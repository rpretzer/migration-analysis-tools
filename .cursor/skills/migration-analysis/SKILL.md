---
name: migration-analysis
description: Analyzes legacy iOS/Android codebases for Kotlin Multiplatform (KMP) migration planning. Use when mapping mobile app structure, classifying modules for KMP vs native, producing migration roadmaps, or generating analysis artifacts (PROJECT_STRUCTURE, MODULE_CLASSIFICATIONS, ROADMAP, stories). Follows the repeatable methodology in CLAUDE.md.
---

# Migration Analysis

## Model selection

| Task | Model |
|------|-------|
| Architecture, critical path, tradeoff reasoning | Opus |
| WCAG audits, story writing, structure mapping | Sonnet |
| Figma prompts, Jira CSV, template transforms | Haiku |

## Artifact pipeline

1. **Phase 1**: `analysis/PROJECT_STRUCTURE.md` — package map, dependencies, processes
2. **Phase 2**: `MODULE_CLASSIFICATIONS.md`, `ARCHITECTURE_AUDIT.md`, `WCAG_AUDIT.md`
3. **Phase 3**: `docs/ROADMAP.md`, `docs/CRITICAL_PATH_ANALYSIS.md`
4. **Phase 4**: `stories/*.md`, `figma_prompts/*.json`
5. **Phase 5**: `docs/JIRA_IMPORT.csv`, `docs/JIRA_IMPORT.md`

Maintain `analysis/ANALYSIS_LOG.md` throughout — entry per session, not post-hoc.

## Code exploration

- Top-down: modules → features → cross-platform vs platform-specific
- Per module: what it does, platforms, business vs UI logic, dependencies
- Prefer source over decompiled APK; document limitations if APK-only

## References

- Full methodology: `CLAUDE.md`
- Artifact registry: `docs/operations/SYSTEM_ARCHITECTURE.md`
- Cost rules: `docs/operations/COST_AND_MODEL_STRATEGY.md`
- Best practices: `docs/operations/BEST_PRACTICES.md`

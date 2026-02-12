# System Architecture — Repeatable Migration Analysis Toolkit

This document describes how the codebase-migration-analysis project operates as a **repeatable system** that any analyst can run against any mobile app, not a one-off Hoopla analysis.

---

## 1. System overview

The system is a Claude Code-driven analysis pipeline that takes a mobile app as input and produces a complete migration plan as output. It is designed to be run by a single analyst with Claude Code, or by a team using Claude Teams with parallel agents.

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT LAYER                               │
│  APK/IPA + source repo (preferred) + client context              │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ANALYSIS PIPELINE                            │
│                                                                  │
│  Phase 1: Structure & Inventory                                  │
│    → PROJECT_STRUCTURE.md                                        │
│                                                                  │
│  Phase 2: Classification & Audit                                 │
│    → MODULE_CLASSIFICATIONS.md                                   │
│    → ARCHITECTURE_AUDIT.md                                       │
│    → WCAG_AUDIT.md                                               │
│                                                                  │
│  Phase 3: Planning                                               │
│    → ROADMAP.md                                                  │
│    → CRITICAL_PATH_ANALYSIS.md                                   │
│                                                                  │
│  Phase 4: Story Generation                                       │
│    → stories/*.md (Gherkin acceptance criteria)                  │
│    → figma_prompts/*.json (UI-bearing stories)                   │
│                                                                  │
│  Phase 5: Export                                                 │
│    → JIRA_IMPORT.csv (machine-importable)                        │
│    → JIRA_IMPORT.md (human-readable mirror)                      │
│                                                                  │
│  Chain-of-thought: ANALYSIS_LOG.md (continuous, not post-hoc)    │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OUTPUT LAYER                               │
│  Jira backlog · Figma prototypes · Roadmap deck · Training doc   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Artifact registry

Every run of the system produces the same set of artifacts. This table is the canonical checklist.

| # | Artifact | Path | Producer phase | Quality gate |
|---|----------|------|---------------|--------------|
| 1 | Project structure map | `analysis/PROJECT_STRUCTURE.md` | 1 | Peer-reviewed; every package accounted for |
| 2 | Module classifications | `analysis/MODULE_CLASSIFICATIONS.md` | 2 | Every package classified; rationales non-generic |
| 3 | Architecture audit | `analysis/ARCHITECTURE_AUDIT.md` | 2 | Findings cite code locations; target state defined |
| 4 | WCAG audit | `analysis/WCAG_AUDIT.md` | 2 | Every screen covered; WCAG criterion IDs present |
| 5 | Roadmap | `docs/ROADMAP.md` | 3 | All items have dependencies, timeframes, risk levels |
| 6 | Critical path analysis | `docs/CRITICAL_PATH_ANALYSIS.md` | 3 | Scenarios grounded in person-week math |
| 7 | User story template | `docs/USER_STORY_TEMPLATE.md` | 3 | Used consistently across all stories |
| 8 | Individual stories | `stories/<ID>_<Name>.md` | 4 | Gherkin ACs; NFRs for a11y, perf, observability, testing |
| 9 | Figma detection report | `figma_prompts/_detection_report.md` | 4 | Every story classified; borderline decisions documented |
| 10 | Figma prompts | `figma_prompts/<screen>.json` | 4 | Valid JSON; matches §16.3 schema |
| 11 | Jira import (CSV) | `docs/JIRA_IMPORT.csv` | 5 | Importable without manual editing |
| 12 | Jira import (readable) | `docs/JIRA_IMPORT.md` | 5 | Mirrors CSV; includes epic cross-refs |
| 13 | Analysis log | `analysis/ANALYSIS_LOG.md` | Continuous | Entry per analysis session, not post-hoc |
| 14 | Training process | `docs/TRAINING_PROCESS.md` | 5 | Tested by at least one non-author |

---

## 3. Roles in the system

| Role | What they do | Tools they need |
|------|-------------|-----------------|
| **Lead Analyst** | Runs the full pipeline. Makes architectural classification decisions. Writes roadmap and critical path. | Claude Code (Opus for architecture, Sonnet for bulk analysis) |
| **Story Writer** | Takes MODULE_CLASSIFICATIONS and ROADMAP as input, produces stories with Gherkin ACs and Figma prompts. | Claude Code (Sonnet for stories, Haiku for Figma prompt templating) |
| **Reviewer** | Validates artifacts against the quality gates in §2. Checks that findings are code-grounded, not boilerplate. | Read access to analysis repo + client codebase |
| **Client Liaison** | Confirms assumptions (API versions, deprecated features, team capacity). Reviews roadmap scenarios. | Access to ROADMAP.md and CRITICAL_PATH_ANALYSIS.md |

---

## 4. Running the system for a new client

### Prerequisites
1. Obtain the app binary (APK for Android, IPA for iOS) or, preferably, source code access.
2. Create a new project directory: `<client>-migration-analysis/`.
3. Copy `CLAUDE.md` into the new directory. Update §16.5 brand constraints for the client.
4. Copy `docs/USER_STORY_TEMPLATE.md` and `docs/TRAINING_PROCESS.md` as starting points.

### Execution order
1. **Decompile/clone** — Get code into a readable state.
2. **Structure mapping** — Run Phase 1 (single agent, Opus model for architectural reasoning).
3. **Parallel audits** — Run Phase 2 as parallel agents: one for module classification, one for architecture, one for WCAG. Each produces its own artifact.
4. **Roadmap** — Sequentially after Phase 2 (needs all audit outputs as input).
5. **Critical path** — Sequentially after roadmap.
6. **Story generation** — Parallelizable by epic. Each epic's stories can be generated by a separate agent.
7. **Figma prompts** — Run detection and generation after stories exist.
8. **Jira export** — Final step; reads all stories.

### Quality gates between phases
- Phase 1 → 2: Structure map reviewed; no unclassified packages.
- Phase 2 → 3: All audits complete; assumptions logged.
- Phase 3 → 4: Roadmap reviewed by client liaison; scenario selected.
- Phase 4 → 5: Stories pass template validation; Figma prompts are valid JSON.

---

## 5. What "operationalized" means

The system is operationalized when:
1. A new analyst can produce equivalent-quality output for a different app without the original author present.
2. The output format is stable enough for downstream tooling (Jira import, Figma Make) to consume without manual transformation.
3. Quality is enforced by structure (artifact registry, quality gates, peer review), not by individual expertise.
4. Cost is predictable: model selection rules prevent $200 runs where $20 would suffice.

See `COST_AND_MODEL_STRATEGY.md` for model selection rules, `TOOLING_AND_AUTOMATION.md` for integration pipelines, and `CLAUDE_TEAMS_STRATEGY.md` for multi-agent execution.

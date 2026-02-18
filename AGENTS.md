# AGENTS.md — AI-Native Product Development Pipeline

**Vendor-neutral entry point for AI tools.** This file tells any AI agent what this repository is, how the pipeline works, and where to find detailed instructions.

---

## Project overview

This repository contains a **repeatable analysis and development pipeline** for mobile/web application migration. The current engagement is with Midwest Tape for their Hoopla Digital platform (digital media lending for public libraries).

The system:
1. Analyzes existing codebases across three platforms (Android, iOS, web) plus BFF and backend services.
2. Produces structured migration plans, user stories, and specifications.
3. Generates code via agentic AI (zero hand-written code).
4. Tests all generated code via agentic AI (zero manual testing).
5. Maintains full observability — every decision is traceable from PM intent to deployed code.

---

## Target architecture

**CLEAN + KMP + CMP + BFF**

- **Backend-for-Frontend (BFF)**: Three BFF layers (Mobile, Web, TV/STB) aggregate backend services into screen-level responses. Business logic executes server-side.
- **Kotlin Multiplatform (KMP)**: Shared client module for networking, offline sync, and simplified data models. Scope is reduced because BFF handles most business logic.
- **Compose Multiplatform (CMP)**: Shared UI across Android, iOS (compose-ios), and web (compose-web/wasm).
- **Native-only (sparing)**: DRM playback, push notifications, biometrics, OS media controls. Always behind domain-layer interfaces.

Dependency rule: inner layers (Domain) never depend on outer layers (Framework). All platform-specific code is behind abstractions.

---

## Pipeline stages

```
INTAKE → COMPILATION → IMPLEMENTATION → TESTING → QUALITY GATE → HUMAN REVIEW
```

| Stage | Agent | Input | Output |
|-------|-------|-------|--------|
| Intake | Coach | PM/PO conversation | business-case.md, epics.md, stories-draft.md |
| Compilation | Spec Compiler | stories-draft + current-state model | spec.md, context.md, test-spec.md per story |
| Implementation | Coding Agent | spec.md + context.md | Code on branch + changes.md |
| Testing | Test Agent | test-spec.md + code branch | tests + results.md + coverage.md + verdict.md |
| Quality Gate | Quality Gate Agent | All story artifacts | report.md + verdict (PASS/FAIL/REVIEW_NEEDED) |
| Human Review | Tech lead | report.md | Approve PR or request changes |

Features spanning BFF and client decompose into sub-stories: `{id}-bff` → `{id}-client` → `{id}-backend`.

---

## Agent roles

Seven agent roles defined in `methodology/roles/`:

| Role | Purpose | Model preference |
|------|---------|-----------------|
| **Coach** | PM/PO-facing orchestrator. Guides structured inquiry. Never generates code. | Opus |
| **Spec Compiler** | Transforms human-readable stories into machine-consumable specs. | Sonnet |
| **Codebase Analyst** | Maintains durable current-state model across all platforms + BFF + backend. | Sonnet |
| **Coding Agent** | Generates code from specs. Mechanical execution, no creative interpretation. | Sonnet |
| **Test Agent** | Generates and runs tests independently from Coding Agent. Second opinion. | Sonnet |
| **Quality Gate Agent** | Final validator. Structured checks against schemas and observability trail. | Opus |
| **Observability Agent** | Maintains audit trail. Backward tracing when output is wrong. | Sonnet |

---

## Key directories

| Directory | Purpose |
|-----------|---------|
| `methodology/` | Portable, vendor-neutral role definitions, artifact schemas, process flow, reference materials |
| `methodology/roles/` | 7 agent role definitions |
| `methodology/schemas/` | 8 artifact schema definitions |
| `methodology/process/` | Pipeline flow, quality gates, calibration protocol, failure handling |
| `methodology/reference/` | Gherkin patterns, WCAG checklist, KMP/CMP/CLEAN/DRM patterns, platform analysis, estimation |
| `pipeline/` | Runtime artifacts: intake, specs, implementation, tests, gates, state, observability |
| `pipeline/state/` | Current-state model (android/, ios/, web/, bff/, backend/) |
| `pipeline/observability/` | Audit trail (events.jsonl), traces, dashboard |
| `.github/agents/` | GitHub Copilot agent definitions (prototype platform) |
| `.github/skills/` | GitHub Copilot skill folders |
| `.claude/agents/` | Claude Code agent definitions (target platform) |
| `.claude/skills/` | Claude Code skill folders |
| `analysis/` | Existing analysis artifacts from initial Hoopla engagement |
| `stories/` | Existing user stories with Gherkin ACs |
| `docs/operations/` | System documentation: pipeline strategy, architecture analysis, cost strategy, tooling |

---

## Implementation-specific instructions

| Platform | Instruction file |
|----------|-----------------|
| Claude Code | `CLAUDE.md` (full operating manual, §0-28) |
| GitHub Copilot | `.github/agents/*.agent.md` (per-agent instructions) |

---

## MCP servers

Seven MCP servers expose context and tools to agents:

1. **Current-State** — Reads `pipeline/state/`. Module lookup, dependency graph, test coverage, WCAG status, platform mapping.
2. **Observability** — Append-only event log. Structured tracing for backward analysis.
3. **Pipeline** — Story status tracking. Stage transitions with validation.
4. **Validation** — Wraps validation scripts. Schema checking for stories, specs, Figma prompts, test results, gate reports.
5. **Integration** — Jira and GitHub issue management. LaunchDarkly flag management.
6. **Design System** — Design tokens, component specs, Figma layout reading, Figma Make prompt generation. Zeroheight integration (aspirational).
7. **Analytics** — Placeholder until repo access. Custom analytics inventory and instrumentation validation.

---

## Quick start for a new agent

1. Read this file for orientation.
2. Read your role definition in `methodology/roles/{your-role}.md`.
3. Read the pipeline flow in `methodology/process/pipeline-flow.md`.
4. Check the current-state model in `pipeline/state/` for codebase context.
5. Log all decisions to the observability server using the event schema in `methodology/schemas/observability-event.schema.json`.
6. Validate your outputs against the relevant schema in `methodology/schemas/` before writing.

---

_System design (c) RSP Management Solutions LLC._

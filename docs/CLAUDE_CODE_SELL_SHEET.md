# AI-Native Product Development with Claude Code

**One-sheet for leadership** | RSP Management Solutions LLC | Midwest Tape / Hoopla Digital

---

## What we built

A **repeatable, AI-native product development pipeline** that takes a product manager's business intent and produces tested, reviewed, deployment-ready code — with full observability at every step.

The system analyzes existing codebases across all platforms (Android, iOS, web, backend), produces migration plans, generates implementation code, tests it, and validates quality — all through structured AI agents with human review at defined gates.

---

## The problem this solves

Hoopla Digital has **7+ client platforms** (Android, iOS, web, Roku, Fire TV, Apple TV, Samsung) sharing duplicated business logic. Today:

- A circulation rule change requires coordinated releases across all 7 platforms
- Business logic lives in thick clients — each with different code quality, release cycles, and testing maturity
- Feature velocity is constrained by manual QA capacity, not by development speed
- Offshore team onboarding takes weeks because tribal knowledge isn't codified
- Architecture decisions and their rationale aren't systematically captured

**The bottleneck isn't writing code. It's the gap between what product wants and what engineering delivers — and the manual validation on both ends.**

---

## What the pipeline does

| Stage | What happens | Human involvement |
|-------|-------------|-------------------|
| **Intake** | PM describes a feature in plain language. Coach agent guides structured inquiry, pushes back on vague inputs, produces business case and user stories. | PM confirms stories match intent |
| **Compilation** | Spec Compiler transforms stories into machine-consumable specifications grounded in the actual codebase. | None (auto-validated) |
| **Implementation** | Coding Agent generates code from specs. No creative interpretation — stops on ambiguity. | None |
| **Testing** | Independent Test Agent validates implementation against spec. Tests both happy path and edge cases, both feature-flag-on and flag-off states. | None |
| **Quality Gate** | Quality Gate Agent runs structured checks. Produces report telling reviewer exactly what to inspect. | Tech lead reviews flagged items only |
| **Merge** | Approved PR merges. BFF deploys server-side; client changes go through standard release. | Standard approval |

**Every decision is logged and traceable.** When output is wrong, trace backward from the failing check through the spec to the original PM input to find where the deficiency entered.

---

## Why Claude Code specifically

This pipeline requires capabilities that exist in Claude Code today and do not exist in competing tools.

### 1. Model selection per task — cost control without quality sacrifice

| Task type | Model | Cost per 1M tokens |
|-----------|-------|-------------------|
| Architecture decisions, quality judgment | Opus (strongest reasoning) | Higher |
| Code generation, audits, story writing | Sonnet (strong, fast) | 5-10x lower |
| Template transforms, CSV export | Haiku (fast, cheap) | 10-20x lower |

**Result:** Full analysis costs ~$65 with model optimization vs ~$300 using a single model. No other platform offers this granularity within a unified workflow.

### 2. Multi-agent orchestration with persistent context

Claude Code Teams spawns agents with **separate context windows** that persist across turns. Each agent maintains its own working memory:

- The codebase analyst can read 1,200+ classes and build a module model without consuming the lead's context
- The architect can deep-dive into dependency patterns without displacing the accessibility auditor's findings
- Agents coordinate via shared files and messaging — true parallel work, not sequential handoffs

**GitHub Copilot agents** work on one issue at a time, in one repo, with no inter-agent communication. They cannot maintain a durable model of codebase state across tasks.

### 3. Tool use and MCP integration

Claude Code agents use 7 MCP servers exposing structured context: current-state model, observability events, pipeline status, validation, external integrations (Jira, LaunchDarkly), design system, and analytics.

**This is not "AI autocomplete."** It's a structured pipeline where each agent has defined inputs, outputs, and quality gates — like a software factory, not a pair programmer.

### 4. Instruction depth

Claude Code's `CLAUDE.md` operating manual is 28 sections of domain-specific guidance — classification frameworks, push-back rules, quality gate definitions, estimation references. The system operates from a methodology, not from ad-hoc prompting.

GitHub Copilot custom agents have a 30,000 character limit per agent. Claude Code has no practical limit.

---

## Evidence from the Hoopla engagement

| Metric | Value |
|--------|-------|
| Android app analyzed | 1,204 classes, 56 packages, decompiled APK (no source access) |
| Stories produced | 30 user stories with Gherkin acceptance criteria |
| Architecture analysis | Full BFF recommendation with 9 bounded contexts identified |
| Figma prompts identified | 17 UI screens mapped to Figma Make prompts |
| Time to full analysis | ~3 working days (single analyst + Claude Code) |
| Estimated manual equivalent | 2-3 weeks (experienced architect, full-time) |
| Methodology artifacts | 27 portable files: roles, schemas, process, reference materials |

The analysis identified that **a BFF layer would reduce KMP shared code scope from ~60% to ~30%** of client code — a finding that changes the migration strategy fundamentally. This required multi-variable architectural reasoning (Opus) across the full codebase context.

---

## What "demo-ready" means today

The system is ready for introduction into an environment with source code access:

- Pipeline architecture designed and documented
- 7 agent roles defined with portable methodology
- 7 MCP servers implemented
- Quality gates, calibration protocol, and failure handling specified
- Coach agent demo available (interactive chat interface)
- GitHub Copilot agent definitions ready for deployment
- Claude Code agent definitions ready for deployment

**Next step:** Connect to the Hoopla source repositories (Android, iOS, web, backend) and run the Codebase Analyst to produce a verified current-state model. Then run 5 calibration stories end-to-end.

---

## Cost model

| Component | Monthly cost | Notes |
|-----------|-------------|-------|
| Claude Code Pro (per seat) | $100-200/seat | Fixed monthly; token usage absorbed |
| GitHub Copilot Business | $19/seat | Required for GitHub agent prototype |
| MCP server hosting | $0 | Local processes, no infrastructure |
| Jira/Confluence | Existing | No additional cost |

**Comparison to manual process:** One senior architect at $180/hr doing this analysis manually = $14,400 for 2 weeks. Claude Code does it in 3 days for ~$65 in API costs (on top of the seat fee). The pipeline then continues producing value: every story that flows through saves review time, catches spec gaps early, and maintains the audit trail automatically.

---

## Risk mitigation

| Risk | Mitigation |
|------|-----------|
| AI generates wrong code | Two independent agents (Coding + Test) + Quality Gate + human review. Calibration protocol validates first 5 stories with full human oversight. |
| PM input is vague | Coach agent has structured push-back rules. Won't produce stories from insufficient input. |
| Vendor lock-in | Methodology layer is portable. Agent definitions exist for both GitHub Copilot and Claude Code. Core logic is in methodology/, not in any vendor format. |
| Cost overrun | Model selection rules enforce Haiku for transforms, Sonnet for bulk work, Opus only for judgment. Fixed seat pricing absorbs token costs. |
| Team adoption | Training process documented. Offshore-friendly language. Calibration protocol builds confidence incrementally. |

---

_Prepared by RSP Management Solutions LLC for Midwest Tape leadership review._

# Codebase Analyst Agent — Claude Code Implementation

## Model
Sonnet 4.5 — one instance per platform in Teams mode (android-analyst, ios-analyst, web-analyst).

## Role
Maintains durable current-state model. See `methodology/roles/codebase-analyst.md` for canonical definition and `.github/agents/codebase-analyst.agent.md` for full instructions.

## Claude-specific behavior
- In Teams mode, spawn one analyst per platform for true parallel analysis
- Each analyst maintains its own context window with platform-specific code
- Uses CLAUDE.md §27 for tri-platform analysis requirements
- Can read 50+ source files without consuming the lead's context

## Tools
Read, Search, Grep, Glob, Write, Bash (for analysis scripts: dependency graphs, coverage reports) — read-only for app code.

## MCP servers
- Current-State Server (**write**): all tools — primary writer of current-state model
- Observability Server (write): log_event
- Design System Server (read): get_design_tokens
- Analytics Server (**write**): inventories existing analytics

## Outputs
All written to `pipeline/state/`:
- Per-platform: android/, ios/, web/ (project structure, module inventory, patterns)
- BFF/backend: bff/, backend/ (service inventory, data ownership)
- Cross-cutting: module-classifications.md, architecture-audit.md, wcag-audit.md, api-contract-inventory.md, test-coverage.md, cross-platform-mapping.md, feature-flags-inventory.md, dependency-graph.json

## Skills
Load `.claude/skills/kmp-migration/`, `.claude/skills/cmp-migration/`, `.claude/skills/wcag-audit/`, `.claude/skills/platform-analysis/`, `.claude/skills/clean-architecture/`, `.claude/skills/drm-patterns/`.

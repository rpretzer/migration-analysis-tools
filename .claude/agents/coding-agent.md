# Coding Agent — Claude Code Implementation

## Model
Sonnet 4.5 — mechanical execution from specs, no architectural judgment needed.

## Role
Generates code from compiled specs. See `methodology/roles/coding-agent.md` for canonical definition and `.github/agents/coding-agent.agent.md` for full instructions.

## Claude-specific behavior
- Runs as a teammate, picking up stories from TaskList
- Creates feature branches (not limited to copilot/* naming)
- Can run builds via Bash to verify compilation
- Stops on high-risk ambiguity — writes to assumptions.md and notifies lead via SendMessage

## Tools
Read, Search, Grep, Glob, Edit, Write, Bash (compile, run linter) — full tool access.

## MCP servers
- Current-State Server (read): get_module, get_dependency_graph, get_architecture_patterns
- Observability Server (write): log_event
- Pipeline Server (read): get_story_status
- Design System Server (read): get_design_tokens, get_component_spec

## Outputs
- Code on feature branch
- `pipeline/impl/{story-id}/changes.md`
- `pipeline/impl/{story-id}/assumptions.md`

## Skills
Load `.claude/skills/clean-architecture/`, `.claude/skills/kmp-migration/`, `.claude/skills/cmp-migration/`.

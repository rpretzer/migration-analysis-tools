# Spec Compiler Agent — Claude Code Implementation

## Model
Sonnet 4.5 — structured output, well-defined compilation rules.

## Role
Transforms Coach outputs into machine-consumable specs. See `methodology/roles/spec-compiler.md` for canonical definition and `.github/agents/spec-compiler.agent.md` for full instructions.

## Claude-specific behavior
- Runs as a teammate in Claude Code Teams, receiving stories from the Coach via TaskList
- Uses CLAUDE.md §26 for compilation procedure
- Can maintain full codebase context across turns (no char limit)
- Self-validates against `methodology/schemas/compiled-spec.schema.md`

## Tools
Read, Search, Grep, Glob, Edit, Write — no Bash (does not execute code).

## MCP servers
- Current-State Server (read): get_module, get_dependency_graph, get_architecture_patterns, get_platform_mapping
- Observability Server (write): log_event
- Pipeline Server (read/write): get_story_status, advance_story
- Validation Server (read): validate_spec
- Design System Server (read): get_design_tokens, get_component_spec

## Outputs
Per story in `pipeline/specs/{story-id}/`:
- spec.md, context.md, test-spec.md, questions.md

## Skills
Load `.claude/skills/spec-compilation/`, `.claude/skills/gherkin-writing/`, `.claude/skills/clean-architecture/`.

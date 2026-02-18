# Observability Agent — Claude Code Implementation

## Model
Sonnet 4.5 — event log analysis and trace generation.

## Role
Audit trail and backward tracing. See `methodology/roles/observability-agent.md` for canonical definition and `.github/agents/observability-agent.agent.md` for full instructions.

## Claude-specific behavior
- Passive by default — activated on demand via SendMessage from lead
- Read-only access to all pipeline artifacts
- Produces traces and root cause analyses
- Can query events.jsonl across the full event history (no context limit)

## Tools
Read, Search, Grep, Glob — read-only, no modifications.

## MCP servers
- Observability Server (**read**): get_trace, get_events, get_dashboard
- Pipeline Server (read): get_pipeline_status, get_story_status

## Outputs
- `pipeline/observability/trace/{story-id}.md`
- `pipeline/observability/issues/{issue-id}.md`
- `pipeline/observability/dashboard.md`

## Skills
Load `.claude/skills/observability-logging/`.

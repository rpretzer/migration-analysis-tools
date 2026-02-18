# Coach Agent — Claude Code Implementation

## Model
Opus 4.6 — requires multi-variable reasoning for push-back calibration and domain context.

## Role
PM/PO-facing orchestrator. See `methodology/roles/coach.md` for canonical definition and `.github/agents/coach.agent.md` for the full instruction set.

## Claude-specific behavior
- This agent runs as the lead in a Claude Code Teams session
- Uses CLAUDE.md §25 for push-back and amplification protocols
- Has access to the full conversation history with the PM (no 30k char limit)
- Can reference any section of CLAUDE.md for domain context

## Tools
Read, Search, WebSearch, WebFetch — no Edit, no Bash. Coach never writes code.

## MCP servers
- Observability Server (write): log_event
- Integration Server (write): create_issue
- Pipeline Server (read): get_pipeline_status, get_blocked_stories
- Analytics Server (read): get_usage_metrics (when available)

## Outputs
All written to `pipeline/intake/`:
- business-case.md
- epics.md
- stories-draft.md
- change-request.md (for mid-pipeline changes)

## Skills
Load `.claude/skills/story-authoring/` when drafting stories.

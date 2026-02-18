# Quality Gate Agent — Claude Code Implementation

## Model
Opus 4.6 — quality judgment requires multi-variable reasoning across specs, code, tests, and observability.

## Role
Final automated validator. See `methodology/roles/quality-gate.md` for canonical definition and `.github/agents/quality-gate.agent.md` for full instructions.

## Claude-specific behavior
- Uses Opus for nuanced quality judgment (not delegatable to Sonnet)
- Runs validation scripts via Bash
- Advances stories in pipeline via Pipeline MCP server
- Updates Jira via Integration MCP server after verdict

## Tools
Read, Search, Grep, Glob, Bash (run validation scripts) — no Edit, no Write to application code.

## MCP servers
- Current-State Server (read): get_module, get_test_coverage, get_wcag_status
- Observability Server (write + read): log_event, get_trace, get_events
- Pipeline Server (read/write): get_story_status, advance_story
- Validation Server (read): validate_spec, validate_test_results, validate_gate_report
- Integration Server (write): update_issue, sync_status

## Outputs
Written to `pipeline/gates/{story-id}/`:
- report.md (structured quality report)
- verdict.md (GATE_PASS / GATE_FAIL / GATE_REVIEW_NEEDED)

## Skills
Load `.claude/skills/quality-gate-checks/`.

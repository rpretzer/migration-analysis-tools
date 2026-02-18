# Test Agent — Claude Code Implementation

## Model
Sonnet 4.5 — test generation and validation, structured output.

## Role
Independent test validation. See `methodology/roles/test-agent.md` for canonical definition and `.github/agents/test-agent.agent.md` for full instructions.

## Claude-specific behavior
- Runs as a teammate, separate from Coding Agent
- Uses Bash to execute test suites and read coverage reports
- Never modifies implementation code — only adds tests
- Reports verdict to lead via SendMessage

## Tools
Read, Search, Grep, Glob, Edit, Write, Bash (run tests, read coverage) — does not modify implementation files.

## MCP servers
- Current-State Server (read): get_module, get_test_coverage
- Observability Server (write): log_event
- Pipeline Server (read): get_story_status
- Validation Server (read): validate_test_results
- Design System Server (read): get_design_tokens

## Outputs
Written to `pipeline/test/{story-id}/`:
- Additional test files (on the branch)
- results.md, coverage.md, verdict.md

## Skills
Load `.claude/skills/gherkin-writing/`, `.claude/skills/clean-architecture/`.

# Tooling and Automation

Practical integrations that extend the analysis pipeline beyond Claude Code's built-in tools.

---

## 1. MCP servers for external integrations

Model Context Protocol (MCP) servers let Claude Code interact with external services directly, replacing manual copy-paste workflows.

### 1.1 Jira MCP server

**Purpose**: Create Jira issues directly from story artifacts instead of CSV import.

**Setup**:
```json
// .claude/settings.json or ~/.claude.json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-atlassian"],
      "env": {
        "JIRA_URL": "https://<client>.atlassian.net",
        "JIRA_EMAIL": "<service-account>@<domain>",
        "JIRA_API_TOKEN": "<token>"
      }
    }
  }
}
```

**Workflow change**: Instead of generating `JIRA_IMPORT.csv` and manually importing, Claude Code can:
1. Create epics first, capture their keys.
2. Create stories with correct epic links, labels, and story points.
3. Set up issue links (blocks/blocked-by) matching roadmap dependencies.
4. Attach story markdown as issue descriptions with Gherkin ACs inline.

**Cost note**: Use Haiku for the actual API calls (structured data transformation). Use Sonnet to prepare the story content beforehand.

### 1.2 GitHub MCP server

**Purpose**: If the client's source code is on GitHub, read code directly instead of decompiling APKs.

**Setup**:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<token>"
      }
    }
  }
}
```

**Benefits**:
- Access actual build.gradle, not inferred dependencies.
- Read test files to assess coverage accurately.
- See git history for change velocity and hotspot analysis.
- Access CI configuration for test baseline assessment.

### 1.3 Figma MCP server (for reading existing designs)

**Purpose**: If the client has existing Figma files, read component inventories and design tokens to inform the WCAG audit and Figma Make prompt generation.

**Setup**:
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-figma"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "<token>"
      }
    }
  }
}
```

### 1.4 Filesystem MCP server (for decompiled code)

Already built into Claude Code, but worth noting: when analyzing decompiled APKs, the local filesystem tools (Read, Glob, Grep) are the primary interface. No additional MCP server is needed.

---

## 2. Claude Code hooks for quality enforcement

Hooks run automatically in response to tool calls. Use them to enforce artifact quality without manual checking.

### 2.1 Story validation hook

Validates that every story file matches the template schema before it is written.

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "command": "python3 scripts/validate_story.py $FILE_PATH",
        "description": "Validate story matches template"
      }
    ]
  }
}
```

The validation script checks:
- Required sections present (Title, Story, Context, In scope, Out of scope, ACs, NFRs, Dependencies, Assumptions, Estimate).
- At least one Gherkin scenario.
- NFR subsections for accessibility and testing are non-empty for UI stories.
- Estimate is a Fibonacci number.

### 2.2 Figma prompt JSON validation hook

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "command": "python3 scripts/validate_figma_prompt.py $FILE_PATH",
        "description": "Validate Figma prompt matches §16.3 schema"
      }
    ]
  }
}
```

### 2.3 Analysis log reminder hook

If 30+ minutes pass without an ANALYSIS_LOG.md update, remind the analyst. (Implemented as a pre-tool hook that checks file modification time.)

---

## 3. Jira automation beyond import

### 3.1 Direct API workflow (recommended over CSV)

```bash
# Install Jira CLI (or use the MCP server)
pip install jira-cli

# Create epics from JIRA_IMPORT.md
python3 scripts/jira_sync.py --mode create-epics --input docs/JIRA_IMPORT.md

# Create stories with links
python3 scripts/jira_sync.py --mode create-stories --input stories/ --link-epics

# Set up dependency links
python3 scripts/jira_sync.py --mode create-links --input docs/ROADMAP.md
```

### 3.2 Jira automation rules (client-side)

Recommend the client configure these Jira automation rules after import:

1. **Phase gate**: When all stories in Phase 0 are Done, auto-transition Phase 1 epics to "Ready for Dev."
2. **Blocked detection**: When a story's blocker is reopened, auto-add a "blocked" label.
3. **Sprint auto-assign**: Map Phase/Priority to sprint slots based on the critical path analysis.

### 3.3 Actual CSV generation

The current `JIRA_IMPORT.md` is markdown, not CSV. Generate an actual importable CSV:

```bash
python3 scripts/md_to_jira_csv.py --input docs/JIRA_IMPORT.md --output docs/JIRA_IMPORT.csv
```

Or have Claude Code generate it directly using Haiku (cost: ~$0.03).

---

## 4. Figma Make pipeline

### 4.1 Current gap

The `figma_prompts/_detection_report.md` identifies 17 screens needing prompts, but the actual JSON files were never generated. This is the largest deliverable gap.

### 4.2 Automated generation workflow

```
For each UI-bearing story in _detection_report.md:
  1. Read the story file (stories/<ID>.md)
  2. Extract UI-relevant fields per §16.2 mapping
  3. Apply brand constraints from §16.5
  4. Generate JSON per §16.3 schema
  5. Write to figma_prompts/<screen-name>.json
  6. Validate JSON schema
```

**Model selection**: Haiku for generation (template-driven), Sonnet for reviewing edge cases (merged screens, complex states).

### 4.3 Figma Make API integration

Figma Make currently requires manual prompt pasting. When an API becomes available:
1. Add an MCP server for Figma Make.
2. Automate: story → prompt JSON → Figma Make API → prototype URL → attach URL to Jira story.
3. Until then, the manual step is: copy `figma_make_prompt` field from JSON, paste into Figma Make.

### 4.4 Brand constraint accumulator

Maintain `figma_prompts/_brand_constraints.json` as a machine-readable file:

```json
{
  "typography": {
    "caption": "12sp",
    "body_small": "14sp",
    "body_medium": "16sp",
    "title_small": "20sp"
  },
  "colors": {
    "primary": "#6366F1",
    "error": "#EF4444",
    "success": "#10B981"
  },
  "spacing": {
    "base_unit": "4px",
    "page_padding": "16px",
    "component_gap": "12px"
  },
  "tap_target_min": "48x48dp",
  "corner_radius_card": "12px",
  "corner_radius_button": "8px"
}
```

Update this file after each Figma Make run with any confirmed token overrides.

---

## 5. CI/CD for the analysis itself

Treat the analysis repo like code:

### 5.1 Git workflow
```bash
git init
git add -A
git commit -m "Initial analysis: Hoopla Android v4.42.1"
```

### 5.2 Pre-commit hooks
- Validate all story files match template.
- Validate all Figma prompt JSONs.
- Check that ANALYSIS_LOG.md has been updated since last commit.
- Verify JIRA_IMPORT.md story count matches `stories/` directory count.

### 5.3 Branch strategy for updates
When the client releases a new app version:
```
main (v4.42.1 analysis)
  └── update/v4.43.0
        ├── diff PROJECT_STRUCTURE.md
        ├── update MODULE_CLASSIFICATIONS.md (changed packages only)
        ├── update affected stories
        └── merge to main
```

---

## 6. Recommended scripts to build

| Script | Purpose | Language | Priority |
|--------|---------|----------|----------|
| `scripts/validate_story.py` | Validate story markdown against template | Python | P0 |
| `scripts/validate_figma_prompt.py` | Validate Figma prompt JSON against §16.3 schema | Python | P0 |
| `scripts/md_to_jira_csv.py` | Convert JIRA_IMPORT.md to importable CSV | Python | P0 |
| `scripts/jira_sync.py` | Create Jira issues via API from story files | Python | P1 |
| `scripts/generate_figma_prompts.py` | Batch-generate Figma prompt JSONs from stories | Python | P1 |
| `scripts/diff_structure.py` | Compare two PROJECT_STRUCTURE.md versions | Python | P2 |
| `scripts/cost_tracker.py` | Log model usage and costs per analysis phase | Python | P2 |

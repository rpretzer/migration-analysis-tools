# Cost and Model Strategy

How to balance cost, speed, and quality across the analysis pipeline by selecting the right model for each task.

---

## 1. Model selection matrix

| Task type | Recommended model | Rationale | Approximate cost per run |
|-----------|------------------|-----------|-------------------------|
| **Architectural classification** (KMP vs native, module boundaries, dependency analysis) | Opus 4.6 | Requires deep reasoning about tradeoffs, cross-cutting concerns, and long dependency chains. Sonnet misses subtle coupling issues. | $3–8 per module set |
| **Critical path analysis** (scenario modeling, probability assessment, resource allocation) | Opus 4.6 | Probabilistic reasoning and multi-variable constraint satisfaction. Quality difference between Opus and Sonnet is significant here. | $5–10 per analysis |
| **WCAG audit** (screen-by-screen accessibility review) | Sonnet 4.5 | Pattern-matching against known WCAG criteria. Well-defined rules. Opus adds cost without proportional quality gain. | $1–3 per screen batch |
| **Story writing** (Gherkin ACs, NFRs, scope bullets) | Sonnet 4.5 | Template-driven; structured output. Sonnet follows the template reliably. | $0.50–1.50 per story |
| **Figma prompt generation** (JSON output from story fields) | Haiku 4.5 | Mechanical field mapping. No reasoning required beyond template adherence. Haiku is 10–20x cheaper than Opus. | $0.02–0.05 per prompt |
| **Jira CSV generation** (transforming stories into CSV rows) | Haiku 4.5 | Pure data transformation. No judgment needed. | $0.01–0.03 per batch |
| **Code structure mapping** (package inventory, dependency listing) | Sonnet 4.5 | Systematic file traversal with moderate reasoning. Sonnet is thorough enough. | $2–5 per app |
| **Architecture audit** (pattern detection, anti-pattern identification) | Opus 4.6 | Requires understanding of architectural intent vs. implementation reality. Sonnet identifies symptoms; Opus identifies root causes. | $3–8 per audit |
| **Analysis log entries** | Sonnet 4.5 | Documenting decisions already made. Summarization, not reasoning. | $0.10–0.30 per entry |
| **Detection report** (Figma trigger classification) | Haiku 4.5 | Binary classification against a rule set. Fast and cheap. | $0.05–0.10 per batch |

---

## 2. Cost profile by scenario

### Full analysis — single app (like Hoopla)

| Component | Model | Estimated cost |
|-----------|-------|---------------|
| Structure mapping | Sonnet | $3 |
| Module classification | Opus | $6 |
| Architecture audit | Opus | $6 |
| WCAG audit | Sonnet | $4 |
| Roadmap | Opus | $5 |
| Critical path | Opus | $8 |
| 30 stories | Sonnet | $30 |
| 17 Figma prompts | Haiku | $1 |
| Jira export | Haiku | $0.50 |
| Analysis log | Sonnet | $1 |
| **Total** | | **~$65** |

### With Opus for everything (no optimization)
Estimated total: **~$250–400**

### Savings from model selection: 75–85%

---

## 3. When to override the defaults

**Upgrade to Opus when:**
- A Sonnet-produced artifact contains vague or generic language ("consider refactoring" instead of "replace FrameworkServiceFactory.getInstance() with @Inject FrameworkService in BaseActivity").
- The task involves reasoning about trade-offs between two legitimate approaches.
- The output will be presented to stakeholders or used for budget decisions.

**Downgrade to Haiku when:**
- The task is pure transformation (JSON → CSV, markdown → JSON).
- The template is rigid and the input is well-structured.
- You are iterating on format, not content (e.g., fixing JSON schema compliance).

**Stay on Sonnet when:**
- The task has clear rules but requires some judgment.
- You need reliability over brilliance (story writing, WCAG checks against known criteria).

---

## 4. Claude Code agent delegation

When using Claude Code's Task tool to spawn subagents:

```
# Architectural reasoning — use Opus
Task(subagent_type="general-purpose", model="opus", ...)

# Bulk story writing — use Sonnet (default)
Task(subagent_type="general-purpose", model="sonnet", ...)

# Figma prompt generation — use Haiku
Task(subagent_type="general-purpose", model="haiku", ...)

# Codebase exploration — use Sonnet (Explore agents are read-only)
Task(subagent_type="Explore", model="sonnet", ...)
```

---

## 5. Claude Teams cost implications

Claude Teams (formerly Claude for Work Teams) charges per-seat, not per-token, for the Teams tier. This changes the calculus:

- **Teams tier**: Fixed monthly cost per seat. Model selection matters for speed and quality, not cost. Use Opus freely for architectural work.
- **API tier**: Token-based pricing. Model selection directly impacts cost. Follow the matrix above.
- **Claude Code Pro**: $100/month with Opus access. For a single analyst running one full analysis per month, this is cheaper than API pricing.

**Recommendation**: For recurring use (monthly client analyses), Claude Code Pro seats for analysts are the most cost-effective path. Reserve API-tier usage for automated pipelines (Jira sync, Figma prompt batch generation) where Haiku keeps costs near-zero.

---

## 6. Speed optimization

Beyond model selection, speed improvements come from:

1. **Parallel agents**: Phase 2 audits (module classification, architecture, WCAG) have no dependencies on each other. Run them as parallel Task agents.
2. **Batch story generation**: Group stories by epic. Spawn one agent per epic.
3. **Caching**: Structure mapping output is stable. Don't re-run Phase 1 when iterating on Phase 3+.
4. **Incremental updates**: When the client's app updates, diff the structure map against the previous version. Only re-audit changed packages.

---

## 7. Monitoring costs

Track per-session costs by reviewing Claude Code's usage summary at session end. Log the following for each project:

| Date | Phase | Model used | Approximate tokens | Wall-clock time | Notes |
|------|-------|-----------|-------------------|-----------------|-------|
| | | | | | |

This data informs future estimates and identifies tasks where model downgrade is safe.

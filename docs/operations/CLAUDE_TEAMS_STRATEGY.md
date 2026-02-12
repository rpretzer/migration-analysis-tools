# Claude Code Teams Strategy — Multi-Agent Orchestration

This document covers Claude Code's **Teams beta feature**: multiple agents running in parallel with separate context windows, coordinated via message passing and a shared task list. This is distinct from the Task tool's subagent delegation, where a child agent runs within the parent's session.

---

## 1. Teams vs Task tool subagents — when to use which

| Capability | Task tool (subagents) | Teams (orchestrated agents) |
|-----------|----------------------|----------------------------|
| Context window | Shares parent's context. Result returned to parent. | Each agent has its own full context window. No context sharing. |
| Coordination | Parent spawns, waits for result, continues. | Agents coordinate via SendMessage and shared TaskList. |
| Parallelism | Can run in background, but parent orchestrates sequentially. | True parallel execution. Multiple agents working simultaneously. |
| State persistence | Subagent dies after returning. Can be resumed by ID. | Agents persist across turns. Go idle, get woken by messages. |
| Model selection | Specified at spawn time. | Each agent can use a different model. |
| Visibility | Parent sees full result. User sees parent's summary. | User sees all agent activity. Lead agent sees idle notifications and messages. |
| Cost | Single context window (efficient for small tasks). | Multiple context windows (each agent consumes its own tokens). |
| Best for | Quick research, single-file generation, exploration. | Multi-phase analysis where agents need sustained context over many turns. |

### Decision rule

**Use Teams when:**
- The work has 3+ independent streams that each require multiple turns of reasoning.
- Agents need to maintain their own sustained context (e.g., an agent mapping 56 packages needs to remember what it already classified).
- The total work would exceed a single context window.
- You want true parallelism, not sequential delegation.

**Use Task subagents when:**
- The work is a single bounded task (generate one story, search for a file, convert a format).
- The result fits in a single message back to the parent.
- No inter-agent coordination is needed.

---

## 2. Team topology for migration analysis

### 2.1 Recommended team structure

```
Lead Analyst (Opus 4.6) — orchestrator, owns roadmap + critical path
  │
  ├── android-analyst (Sonnet 4.5) — Android structure + module classification
  ├── ios-analyst (Sonnet 4.5) — iOS structure + module classification (if in scope)
  ├── architect (Opus 4.6) — Architecture audit
  ├── a11y-auditor (Sonnet 4.5) — WCAG audit
  └── story-writer (Sonnet 4.5) — Story generation + Figma prompts
```

The lead analyst:
1. Creates the team and task list.
2. Assigns tasks to agents based on phase dependencies.
3. Reviews agent output via messages (agents send summaries when done).
4. Writes the roadmap and critical path personally (single-author artifacts).
5. Shuts down agents when the analysis is complete.

### 2.2 Why separate context windows matter

Each agent maintains its own context across multiple turns. This means:

- **The android-analyst** can read 50+ source files, build a mental model of the package structure, and then classify modules — all without polluting the lead's context window with 1,200 classes worth of code.
- **The architect** can deep-dive into dependency graphs and anti-patterns without the WCAG auditor's findings consuming its context.
- **The story-writer** can reference the full template, all module classifications, and the roadmap simultaneously while generating stories — context that would overflow a subagent's single-turn window.

This is critical for Hoopla-sized apps. The Android APK alone has 1,204 classes across 56 packages. A single context window cannot hold the full structure map AND the architecture audit AND the WCAG findings AND the story generation context.

---

## 3. Execution plan — phase by phase

### Phase 1: Structure mapping

```
Lead creates team:
  TeamCreate(team_name="hoopla-analysis")

Lead creates tasks:
  TaskCreate(subject="Map Android project structure", ...)
  TaskCreate(subject="Map iOS project structure", ...)  # if in scope

Lead spawns agents:
  Task(subagent_type="general-purpose", model="sonnet", team_name="hoopla-analysis",
       name="android-analyst", prompt="Read your task from the task list. Map the Android
       project structure per CLAUDE.md §4. Write output to analysis/PROJECT_STRUCTURE.md.
       When done, mark your task complete and message me with a summary.")

  Task(subagent_type="general-purpose", model="sonnet", team_name="hoopla-analysis",
       name="ios-analyst", prompt="...")  # if in scope
```

**Gate**: Lead reviews structure maps. Confirms with client. Proceeds to Phase 2.

### Phase 2: Parallel audits

This is where Teams provides the biggest advantage. Three independent audits run simultaneously:

```
Lead creates tasks:
  TaskCreate(subject="Classify all modules for KMP/native/observability", ...)
  TaskCreate(subject="Architecture audit against MVVM target", ...)
  TaskCreate(subject="WCAG 2.1 AA audit of all screens", ...)

Lead assigns and messages agents:
  TaskUpdate(taskId="2", owner="android-analyst")
  SendMessage(type="message", recipient="android-analyst",
    content="Phase 1 is approved. Your next task is module classification.
    Read analysis/PROJECT_STRUCTURE.md as input. Classify every package per
    CLAUDE.md §5. Write to analysis/MODULE_CLASSIFICATIONS.md.",
    summary="Start module classification")

  # Spawn new agents for architecture and WCAG (or reassign existing)
  Task(subagent_type="general-purpose", model="opus", team_name="hoopla-analysis",
       name="architect", prompt="Join the team. Read your assigned task.
       Perform architecture audit per CLAUDE.md §8. Reference PROJECT_STRUCTURE.md.
       Write to analysis/ARCHITECTURE_AUDIT.md.")

  Task(subagent_type="general-purpose", model="sonnet", team_name="hoopla-analysis",
       name="a11y-auditor", prompt="Join the team. Read your assigned task.
       Perform WCAG audit per CLAUDE.md §6. Reference PROJECT_STRUCTURE.md.
       Write to analysis/WCAG_AUDIT.md.")
```

All three agents work simultaneously. Each has its own context window holding the structure map plus its audit-specific reasoning. The lead is notified as each completes.

**Time savings**: ~3x faster than sequential. A single-agent approach takes 3 sessions; Teams does it in 1.

### Phase 3: Roadmap + critical path (lead only)

```
Lead reads all three audit outputs.
Lead writes ROADMAP.md and CRITICAL_PATH_ANALYSIS.md personally.
These artifacts require integrated reasoning across all audits — not delegable.
```

### Phase 4: Story generation (parallel by epic)

```
Lead creates tasks per epic:
  TaskCreate(subject="Write stories for Epic A (KMP)", ...)
  TaskCreate(subject="Write stories for Epic B (Modernization)", ...)
  TaskCreate(subject="Write stories for Epic C-E (Observability/A11y/Foundations)", ...)

Lead spawns or messages story-writer, or spawns multiple:
  Task(subagent_type="general-purpose", model="sonnet", team_name="hoopla-analysis",
       name="story-writer-kmp", prompt="Write all stories for Epic A per CLAUDE.md §13.
       Reference MODULE_CLASSIFICATIONS.md and ROADMAP.md. Use the template in
       USER_STORY_TEMPLATE.md. Write each to stories/A-<N>_<Name>.md.")

  Task(subagent_type="general-purpose", model="sonnet", team_name="hoopla-analysis",
       name="story-writer-modernization", prompt="Write all stories for Epic B...")
```

After stories are complete, a Haiku agent generates Figma prompts:

```
  Task(subagent_type="general-purpose", model="haiku", team_name="hoopla-analysis",
       name="figma-generator", prompt="Read figma_prompts/_detection_report.md.
       For each triggered story, generate a Figma Make prompt JSON per CLAUDE.md §17.3.
       Write to figma_prompts/<screen-name>.json.")
```

### Phase 5: Export

```
  Task(subagent_type="general-purpose", model="haiku", team_name="hoopla-analysis",
       name="jira-exporter", prompt="Read all stories in stories/ and generate
       docs/JIRA_IMPORT.csv in Jira CSV import format. Also update docs/JIRA_IMPORT.md.")
```

### Shutdown

```
Lead sends shutdown requests:
  SendMessage(type="shutdown_request", recipient="android-analyst", content="Analysis complete.")
  SendMessage(type="shutdown_request", recipient="architect", content="Analysis complete.")
  ...
TeamDelete()
```

---

## 4. Cost implications of Teams

Teams uses separate context windows, so cost scales with agent count × context size:

| Configuration | Estimated cost (Hoopla-sized app) | Wall-clock time |
|--------------|----------------------------------|-----------------|
| Single agent, all Opus | ~$300 | 6–8 hours |
| Single agent, model-optimized (§2 of COST_AND_MODEL_STRATEGY.md) | ~$65 | 4–6 hours |
| Teams (5 agents), model-optimized | ~$90–120 | 1.5–2.5 hours |
| Teams (5 agents), all Opus | ~$400+ | 1.5–2.5 hours |

**Teams is ~50% more expensive per run** (multiple context windows) but **~3x faster** (true parallelism). The tradeoff is worth it when:
- Time-to-delivery matters (client wants results in a day, not a week).
- The app is large enough that a single context window cannot hold all analysis context.
- You are on a Claude Code Pro seat (fixed monthly cost, not per-token).

**On Claude Code Pro ($100/month)**, Teams parallelism is free — you're paying for the seat, not the tokens. Use Teams aggressively.

---

## 5. Inter-agent communication patterns

### 5.1 Lead → Agent: Task assignment

```
SendMessage(type="message", recipient="android-analyst",
  content="Your next task is module classification. The structure map is at
  analysis/PROJECT_STRUCTURE.md. Classify every package per CLAUDE.md §5.
  Write output to analysis/MODULE_CLASSIFICATIONS.md. Message me when done
  with a summary of how many packages were classified into each bucket.",
  summary="Assign module classification task")
```

### 5.2 Agent → Lead: Completion with summary

The agent marks its task complete via TaskUpdate, then sends a message:

```
SendMessage(type="message", recipient="lead",
  content="Module classification complete. 56 packages classified:
  - 12 KMP candidates (bean/, webservices/, auth/, ...)
  - 28 Native modernize (ui/, controller/, ...)
  - 6 Native refactor/observability (audio/, video/, ...)
  - 10 Keep as-is (util/, widget/, ...)
  Output written to analysis/MODULE_CLASSIFICATIONS.md.",
  summary="Module classification done: 56 packages")
```

### 5.3 Agent → Agent: Cross-referencing (rare, use sparingly)

If the architect needs the a11y-auditor's findings for the WCAG section of the architecture audit:

```
SendMessage(type="message", recipient="a11y-auditor",
  content="I need to know which screens have Critical accessibility findings
  for the architecture audit. Can you share the Critical findings from your
  WCAG audit?",
  summary="Request Critical WCAG findings")
```

**Prefer reading shared files** over agent-to-agent messaging. If both agents write to the `analysis/` directory, they can read each other's output without messaging overhead.

### 5.4 Lead monitors via TaskList

The lead periodically checks progress:

```
TaskList()
→ Shows which tasks are pending, in_progress, or completed
→ Shows which agents are idle (waiting for work) vs active
```

---

## 6. What NOT to do with Teams

1. **Don't create more agents than independent work streams.** 3–5 agents is the sweet spot. 10+ agents creates coordination overhead that exceeds the parallelism benefit.

2. **Don't have agents write to the same file.** Each artifact should have one owner. If two agents need to contribute to the same document, have them write to separate files and let the lead merge.

3. **Don't delegate roadmap or critical path.** These require synthesizing ALL audit findings into a coherent plan. No single agent has the full picture — only the lead (who reads all agent outputs) can do this.

4. **Don't use Teams for small apps.** If the app has <20 screens and <30 packages, a single agent with Task subagents is faster and cheaper.

5. **Don't broadcast when you can direct-message.** Broadcasts wake every agent. Most communication is between the lead and one specific agent.

---

## 7. Opus 4.6 specific advantages for orchestration

Opus 4.6 as the lead agent is important because:

1. **Multi-source synthesis**: The lead must read 3+ agent outputs (structure map, module classifications, architecture audit, WCAG audit) and synthesize them into a roadmap. Opus 4.6 holds this cross-document context better than Sonnet.

2. **Orchestration judgment**: Deciding when to re-assign work, when an agent's output needs revision, and when to proceed past a quality gate requires meta-reasoning about the analysis process, not just the analysis content.

3. **Critical path math**: Joint probability calculations, scenario modeling, and resource allocation tables require quantitative reasoning that Opus 4.6 handles reliably.

4. **Agent prompt crafting**: Writing effective prompts for specialist agents (what context to include, what format to request, what quality bar to set) benefits from Opus's instruction-following precision.

Sonnet agents are fine for the specialist work because their tasks are well-scoped with clear inputs and outputs. The lead's job is inherently less structured.

---

## 8. Example: Full Hoopla analysis with Teams

Estimated timeline with 5 agents on Claude Code Pro:

| Time | Lead (Opus) | android-analyst (Sonnet) | architect (Opus) | a11y-auditor (Sonnet) | story-writer (Sonnet) |
|------|------------|------------------------|-----------------|---------------------|---------------------|
| 0:00 | Create team, spawn agents, assign Phase 1 | Start structure mapping | Idle | Idle | Idle |
| 0:30 | Review structure map | Done → idle | Idle | Idle | Idle |
| 0:45 | Assign Phase 2 tasks | Start module classification | Start architecture audit | Start WCAG audit | Idle |
| 1:30 | Review module classifications | Done → idle | Still working | Still working | Idle |
| 1:45 | Review architecture audit | Idle | Done → idle | Still working | Idle |
| 2:00 | Review WCAG audit | Idle | Idle | Done → idle | Idle |
| 2:15 | Write ROADMAP.md | Idle | Idle | Idle | Idle |
| 2:45 | Write CRITICAL_PATH_ANALYSIS.md | Idle | Idle | Idle | Idle |
| 3:00 | Assign story tasks | Reassign to Epic A stories | Idle | Reassign to Epic D stories | Start Epic B stories |
| 4:00 | Review stories, assign Figma prompts | Done | Idle | Done | Done |
| 4:15 | Review Figma prompts, generate Jira export | Shutdown | Shutdown | Shutdown | Shutdown → spawn haiku for export |
| 4:30 | Final review, deliver | — | — | — | — |

**Total: ~4.5 hours wall-clock** vs ~8 hours single-agent.

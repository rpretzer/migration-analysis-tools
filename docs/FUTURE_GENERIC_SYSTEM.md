# Future Consideration: Generalizing Structured Analysis for Product Management

**Status:** Design thinking — not yet a project.
**Author:** RSP Management Solutions LLC

---

## The pattern we built

The migration analysis system follows a specific shape:

1. **Ingest** a body of evidence (codebase, APK, existing docs)
2. **Apply a structured framework** (CLAUDE.md) that defines what questions to ask, what artifacts to produce, and what quality looks like
3. **Produce artifacts** that are consistent, actionable, and import-ready for execution tools (Jira, Figma, financial models)
4. **Validate** outputs against machine-checkable quality gates
5. **Archive and version** everything so decisions are traceable

The codebase-specific parts (KMP classification, WCAG audit, Gherkin stories) are instances of a general capability: *take a domain, define the inquiry structure, and let the system guide a rigorous analysis that produces artifacts someone can act on.*

The question is: what does that look like when the domain is product management instead of engineering?

---

## What a PM analysis system would need to do

A product manager evaluating a market opportunity or shaping a major feature is doing something structurally similar to what we do with a codebase:

| Migration system | PM system |
|-----------------|-----------|
| Read the codebase | Read the market signal (customer feedback, usage data, competitor analysis, sales pipeline data) |
| Classify modules | Classify opportunity dimensions (market size, competitive position, technical feasibility, strategic fit) |
| Identify risks | Identify assumptions that could kill the idea |
| Produce stories | Produce a product brief, PRD, or opportunity assessment |
| Estimate effort | Estimate investment required and expected return |
| Build business case | Build business case (we already have this tool) |
| Validate artifacts | Validate that the thinking is rigorous, not just enthusiastic |

The hard part is the second-to-last row. With code, quality is somewhat objective — a module either has tests or it doesn't, a screen either meets WCAG AA or it doesn't. With product thinking, quality is about *rigor of reasoning*, which is harder to gate mechanically.

---

## The core design problem: encoding how a good PM thinks

A good PM does not just generate ideas. They:

1. **Start with the problem, not the solution.** Who has this problem? How badly? How do they solve it today? What's broken about that?
2. **Size the opportunity before designing anything.** How many people have this problem? What would they pay (or what engagement would they generate)? Is this a growing or shrinking population?
3. **Identify the riskiest assumption.** Every opportunity has a "if this isn't true, nothing else matters" assumption. Good PMs find it early and test it cheaply.
4. **Distinguish "interesting" from "important."** Many ideas are interesting. Few are important enough to displace something already on the roadmap.
5. **Think in tradeoffs, not features.** Adding X means not doing Y. What is Y? Is X more valuable than Y? For whom?
6. **Define success before building.** What metric moves? By how much? In what timeframe? If we can't answer this, we don't understand the opportunity well enough to invest.

This thinking pattern can be encoded as a framework — not as a rigid checklist, but as a *directed inquiry* that the system walks through, pushing back when answers are thin and encouraging depth when signals are strong.

---

## Proposed architecture: the meta-system

### Layer 1: The inquiry engine (generic, reusable)

A domain-agnostic core that:

- Accepts a **domain definition** (what kind of analysis is this?)
- Loads a **framework template** (what questions must be answered, in what order, to what standard?)
- Walks the user through **structured inquiry**, where each answer can trigger follow-up questions, deeper investigation, or a redirect
- **Pushes back** on weak inputs: "You said the market is large, but you haven't cited a number. What's your basis for that claim?"
- **Encourages depth** on strong signals: "This competitive gap is significant. Let's quantify it. What would closing it mean in retention terms?"
- Produces a **tailored CLAUDE.md** for the specific work — keeping common elements (artifact formats, quality gates, archiving) while adding domain-specific sections
- Generates **artifacts** appropriate to the domain

### Layer 2: Domain frameworks (pluggable)

Each domain gets a framework definition. Examples:

**Market opportunity assessment:**
- Problem definition and evidence
- Market sizing (TAM/SAM/SOM with methodology)
- Competitive landscape and positioning
- Customer segmentation and willingness to pay
- Strategic fit scoring against company priorities
- Riskiest assumption identification
- Recommended next step (kill, spike, invest, park)

**Major feature shaping:**
- Problem statement with user evidence (not stakeholder opinion)
- Jobs-to-be-done analysis
- Solution space exploration (at least 3 approaches)
- Effort/impact/confidence scoring
- Dependency and cannibalization analysis
- Success metrics and measurement plan
- Go/no-go criteria

**New product evaluation:**
- Market thesis with falsifiable claims
- Business model canvas
- Unit economics projection
- Build/buy/partner analysis
- Minimum viable scope definition
- 90-day validation plan

### Layer 3: Quality gates (the "push back" mechanism)

This is the critical differentiator. The system doesn't just collect answers — it evaluates them.

**Weak-signal detectors:**

| Signal | System response |
|--------|----------------|
| Market size stated without source | "What's the basis for this number? Is it bottom-up (count of customers x price) or top-down (industry report)? Bottom-up is more credible." |
| Solution described before problem is validated | "You've jumped to a solution. Let's go back: who has this problem, and what evidence do you have that they'd change their behavior for a solution?" |
| No competitive analysis | "Who else solves this problem today? If nobody, why not — is it because the problem isn't real, or because it's genuinely unsolved?" |
| Success metric is vague ("improve engagement") | "By how much? Over what period? For which user segment? If you can't set a target, you can't evaluate whether the investment worked." |
| Single solution considered | "You've described one approach. What are two others? Even if they're worse, articulating alternatives sharpens the rationale for your preferred option." |
| Large effort with no phasing | "This is a multi-quarter investment. What's the smallest version that tests the core hypothesis? What would you ship in 4 weeks to learn something?" |

**Strong-signal amplifiers:**

| Signal | System response |
|--------|----------------|
| Clear, quantified problem with user evidence | "This is well-grounded. Let's go deeper: what's the retention or revenue impact of not solving this?" |
| Identified competitive gap with data | "Strong finding. Let's build this into the positioning section and quantify the switching cost for users currently on the competitor." |
| Falsifiable hypothesis stated | "Good — this is testable. Let's define the experiment: what data would confirm or refute this within 2 weeks?" |
| Clear tradeoff articulated | "You've identified what you'd defer. Let's make sure the stakeholders who own that deferred work are aware and aligned." |

### Layer 4: Artifact generation

Each domain framework defines its output artifacts:

| Domain | Artifacts |
|--------|-----------|
| Market opportunity | Opportunity scorecard, competitive matrix, market sizing model, recommendation memo |
| Feature shaping | Product brief, PRD, success metrics dashboard spec, phased delivery plan |
| New product | Business model canvas, unit economics spreadsheet, validation plan, investor-ready summary |

All artifacts follow the same principles as the migration system:
- Machine-checkable quality gates where possible
- Consistent templates across engagements
- Version-controlled with archive history
- Import-ready for downstream tools (Jira, spreadsheets, slide decks)

---

## How the tailored CLAUDE.md gets created

The meta-system would work in two phases:

**Phase 1: Framework selection and customization (1 session)**

The system asks a series of scoping questions:

1. What type of analysis is this? (market opportunity / feature shaping / new product / other)
2. What's the company context? (B2B/B2C, stage, industry, team size)
3. What evidence do you already have? (customer interviews, usage data, competitive intel, financial data)
4. What decision does this analysis need to support? (go/no-go, prioritization, resource allocation, board presentation)
5. Who is the audience? (engineering leadership, executive team, board, investors)
6. What tools does the team use? (Jira, Linear, Notion, Google Sheets, Figma)

From these answers, the system generates a tailored CLAUDE.md that:
- Includes the relevant domain framework sections
- Sets quality gate thresholds appropriate to the decision stakes
- Defines artifact formats that match the audience and tools
- Configures push-back sensitivity (higher for large investments, lower for exploratory spikes)
- Includes company-specific context (product names, market segment, strategic priorities)

**Phase 2: Guided analysis (1–5 sessions)**

The analyst (PM, strategist, or consultant) works through the framework with the system. The system:
- Tracks which sections are complete, incomplete, or weak
- Asks follow-up questions when inputs don't meet quality gates
- Surfaces contradictions ("You said the market is price-sensitive, but your pricing model assumes premium willingness-to-pay")
- Generates artifacts incrementally as sections are completed
- Produces a final package when all gates are passed

---

## What stays the same from the migration system

| Component | Reuse |
|-----------|-------|
| Archive and versioning (`archive.py`) | Identical — outputs are versioned the same way |
| Business case generator | Identical — already domain-agnostic |
| Post-launch evaluation | Identical — measures actuals vs projections regardless of domain |
| Cost tracker | Identical — tracks AI usage per session |
| Quality gate pattern (scripts that validate artifacts) | Same pattern, different rules per domain |
| Onboarding guide structure | Same structure, different content |
| Jira/Linear export | Same pattern, different issue types (Epics become Initiatives, Stories become Tasks or Experiments) |
| CLAUDE.md as operating manual | Same concept — the meta-system generates one per engagement |

## What's new

| Component | Description |
|-----------|-------------|
| Framework library | Pluggable domain definitions (market, feature, product, custom) |
| Inquiry engine | Walks through frameworks with push-back and encouragement logic |
| CLAUDE.md generator | Creates tailored operating manuals from scoping answers |
| Weak-signal / strong-signal rules | Domain-specific quality heuristics |
| Evidence registry | Tracks what claims are supported by data vs assumption |
| Contradiction detector | Surfaces logical inconsistencies across sections |

---

## Risks and open questions

1. **Push-back calibration.** Too aggressive and the system feels adversarial. Too gentle and it's just a form-filler. The right calibration probably varies by user experience level and decision stakes. May need a "coaching intensity" dial.

2. **Evidence quality assessment.** The system can detect *absence* of evidence easily. Detecting *quality* of evidence (is this a representative sample? is this data current?) is harder and may require domain-specific heuristics.

3. **Creative vs analytical tension.** Early-stage product thinking benefits from divergent, creative exploration. The structured framework is inherently convergent. The system needs a clear "explore" phase before it starts gating quality.

4. **Organizational politics.** A system that pushes back on weak ideas will sometimes push back on ideas that have executive sponsorship. This is a feature, not a bug, but it needs to be positioned carefully. The output should be "here's what the analysis shows" rather than "this is a bad idea."

5. **Domain framework maintenance.** Each framework encodes a model of good thinking in that domain. These models need to evolve as the team learns what works. The framework library needs its own versioning and iteration process.

---

## Suggested next step

Build a single framework (market opportunity assessment) as a proof of concept. Test it on a real opportunity the team is currently evaluating. Compare the output quality and time-to-decision against the team's current process. If the structured inquiry produces sharper analysis faster, expand to feature shaping and new product evaluation.

The migration analysis system took ~3 days to build from concept to working system with 10 scripts, 30 stories, and full documentation. A single PM framework would be comparable in scope. The meta-system that generates frameworks dynamically is a Phase 2 effort.

---

_System design (c) RSP Management Solutions LLC._

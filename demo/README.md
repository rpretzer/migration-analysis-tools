# Hoopla Digital — Product Development Coach Demo

A standalone, browser-based chat interface for demonstrating the Product Development Coach agent to leadership. No build step, no dependencies, no server-side code.

---

## What this is

The Coach is a product thinking partner tuned specifically to Hoopla Digital's business model, technical platform, and constraints. It:

- Pushes back on vague problem statements, unmeasured success criteria, and solutions presented before the problem is defined.
- Amplifies strong ideas by helping frame them as quantified problem statements, competitive gaps, and falsifiable hypotheses.
- Generates structured artifacts — business cases, epics, and draft user stories — when the thinking is solid.
- Asks about feature flag and rollout strategy before finalizing any story.
- Redirects implementation questions to the Spec Compiler (separate tool).

The goal of the demo is to show leadership what a disciplined product intake conversation looks like and how quickly a well-formed idea can move to actionable artifacts.

---

## How to run

1. Open a terminal and navigate to this directory:

   ```
   cd /path/to/codebase-migration-analysis/demo
   ```

2. Start a local HTTP server using one of these options:

   **Option A — Python (no install required on macOS/Linux):**
   ```
   python3 -m http.server 8080
   ```

   **Option B — Node.js serve:**
   ```
   npx serve -p 8080
   ```

3. Open your browser and go to:
   ```
   http://localhost:8080
   ```

4. On first load, a settings modal will appear asking for your Anthropic API key. Enter a key starting with `sk-ant-`. The key is stored in browser session memory only and is never written to disk or sent anywhere except directly to the Anthropic API.

---

## Requirements

- A modern browser (Chrome, Firefox, Safari, Edge — any recent version)
- An Anthropic API key with access to `claude-sonnet-4-5-20250929`
- Internet access (the page makes direct API calls to `api.anthropic.com`)

**Note on model selection:** This demo uses Claude Sonnet for cost efficiency. Production deployments of the Coach for architectural reasoning tasks should use Claude Opus 4.6. See `docs/operations/COST_AND_MODEL_STRATEGY.md` for the full model selection rationale.

---

## Demo script for leadership presentation

### Setup (before the audience arrives)
- Have the browser open at `localhost:8080` with the welcome screen visible.
- Have your API key ready to paste — the modal appears on first load.
- Clear any previous session by clicking "New Conversation."

### Recommended demo flow (15–20 minutes)

**Act 1 — Show the push-back behavior (5 min)**

Start with a deliberately vague idea to show the Coach does not just say yes:

> "We should add a social reading feature to Hoopla so patrons can share what they're reading."

Point out: the Coach will ask who the user is, what problem is being solved, what the data shows, and what success looks like. It will not jump to stories.

**Act 2 — Show artifact generation when the thinking is solid (8 min)**

Answer the Coach's questions with specifics. For example:

- "We have survey data showing 22% of patrons aged 18–34 say social discovery is a reason they would use Hoopla more."
- "The problem is that new patrons do not know what to borrow first — the catalog is too large."
- "Success is a 12% increase in borrows by new patrons within 60 days of the social feature going live."
- "We considered a curated staff-picks feed and an algorithmic recommendation engine, but both require more content metadata work before they're viable."

Then ask the Coach to generate a business case. Show the structured output.

**Act 3 — Show the feature flag prompt (2 min)**

Ask the Coach to generate user stories. Show that it asks about rollout strategy and kill-switch criteria before writing acceptance criteria.

**Act 4 — Export (1 min)**

Click "Export" and show the downloaded Markdown file. Explain that this goes into the analyst's working document set and is then imported to Jira.

---

## Sample conversation starters

These are pre-loaded as clickable chips on the welcome screen. You can also type any of them:

1. **Social reading** (good for showing push-back on vague value proposition):
   > "We want to add a social reading feature so library patrons can share what they're reading with friends."

2. **AI recommendations** (good for showing push-back on solution-before-problem):
   > "I think we should build an AI-powered recommendation engine for Hoopla. It would increase engagement."

3. **Mobile redesign** (good for showing scope clarification):
   > "We need to redesign the Hoopla mobile app. Users are complaining it feels outdated."

4. **Offline audiobooks** (good for showing DRM risk surface and competitive framing):
   > "Can we add offline downloads for audiobooks? A competitor just launched this."

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message |
| Shift + Enter | New line in message |
| Escape | Close settings modal (if already configured) |

---

## Troubleshooting

**"API key rejected" error:**
The key must start with `sk-ant-` and belong to an Anthropic account with active API access. Click Settings to re-enter the key.

**"Network error" message:**
The page makes direct browser-to-API calls. CORS is enabled by Anthropic for direct browser access using the `anthropic-dangerous-direct-browser-access` header. If you see a CORS error in the browser console, verify you are using a key with API access (not Claude.ai subscription access).

**Blank page or no response:**
Check the browser developer console (F12) for errors. Common causes: no internet access, browser extension blocking fetch calls, or a content security policy on a corporate network.

**Rate limit errors (429):**
The demo uses Sonnet which has a higher rate limit than Opus. If you hit limits during a live demo, wait 30 seconds and retry.

---

## File structure

```
demo/
  index.html   — Single-page application shell
  style.css    — All styles (light theme, responsive, no framework)
  app.js       — Chat logic, API calls, markdown rendering
  README.md    — This file
```

No build step. No npm. No framework. Open `index.html` via any HTTP server and it runs.

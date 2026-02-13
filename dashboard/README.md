# Analyst Dashboard

A browser-based dashboard for reviewing migration analysis progress, tracking objectives, and reading generated documents.

## Quick start

```bash
cd dashboard
npm install
npm start
```

Open http://localhost:3456 in your browser.

## Usage

- **Progress** — See which artifacts exist, which phases are complete, and what’s missing.
- **Objectives** — See which of the 15 objectives are met based on artifact presence.
- **Documents** — Browse and read markdown artifacts (analysis, docs, stories, figma_prompts).
- **Stories** — Browse stories with effort metadata; click to open.
- **Archives** — Browse archived snapshots and view previous versions of documents.

## Configuration

| Variable | Default | Description |
|----------|---------|--------------|
| `DASHBOARD_PORT` | 3456 | Port for the server |

Example:

```bash
DASHBOARD_PORT=4000 npm start
```

## Security

The dashboard is intended for local use only. It reads files from the project directory and does not expose them to the network beyond localhost. Do not run it on a publicly accessible host without additional security measures.

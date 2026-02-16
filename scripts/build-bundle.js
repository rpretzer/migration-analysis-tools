#!/usr/bin/env node
/**
 * Build a static bundle for client review.
 *
 * Output: bundle/ folder with standalone HTML viewer.
 * No server required — open index.html in a browser or host on any static site.
 *
 * Usage: node scripts/build-bundle.js
 */

const fs = require("fs").promises;
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BUNDLE_DIR = path.join(PROJECT_ROOT, "bundle");
const EXCLUDE = [
  "analysis/SECURITY_FINDINGS.md",
  "bundle",
  "dashboard/node_modules",
  ".git",
  "decompiled",
  "archive",
];

async function collectFiles(dir, prefix) {
  const fullPath = path.join(PROJECT_ROOT, dir);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (EXCLUDE.some((x) => rel.includes(x))) continue;
    if (e.isDirectory()) {
      files.push(...(await collectFiles(path.join(dir, e.name), rel)));
    } else if (/\.(md|json|csv)$/i.test(e.name)) {
      files.push(rel);
    }
  }
  return files;
}

async function readFile(rel) {
  const full = path.join(PROJECT_ROOT, rel);
  try {
    return await fs.readFile(full, "utf-8");
  } catch {
    return null;
  }
}

async function build() {
  const rootFiles = ["CLAUDE.md"];
  const dirs = ["analysis", "docs", "stories", "figma_prompts", ".cursor/skills"];
  const allPaths = new Set(rootFiles);
  for (const d of dirs) {
    try {
      const files = await collectFiles(d, d);
      files.forEach((f) => allPaths.add(f));
    } catch {
      /* dir may not exist */
    }
  }

  const data = {};
  for (const p of [...allPaths].sort()) {
    if (EXCLUDE.some((x) => p.includes(x))) continue;
    const content = await readFile(p);
    if (content != null) data[p] = content;
  }

  const artifacts = [
    { path: "analysis/PROJECT_STRUCTURE.md", name: "Project structure", phase: 1 },
    { path: "analysis/MODULE_CLASSIFICATIONS.md", name: "Module classifications", phase: 2 },
    { path: "analysis/ARCHITECTURE_AUDIT.md", name: "Architecture audit", phase: 2 },
    { path: "analysis/WCAG_AUDIT.md", name: "WCAG audit", phase: 2 },
    { path: "docs/ROADMAP.md", name: "Roadmap", phase: 3 },
    { path: "docs/CRITICAL_PATH_ANALYSIS.md", name: "Critical path", phase: 3 },
    { path: "docs/USER_STORY_TEMPLATE.md", name: "Story template", phase: 3 },
    { path: "analysis/ANALYSIS_LOG.md", name: "Analysis log", phase: 0 },
    { path: "docs/TRAINING_PROCESS.md", name: "Training process", phase: 5 },
    { path: "docs/JIRA_IMPORT.md", name: "Jira import", phase: 5 },
  ];

  const tree = { root: [], analysis: [], docs: [], stories: [], figma_prompts: [], skills: [] };
  for (const p of Object.keys(data)) {
    const ext = path.extname(p).toLowerCase();
    const item = { name: path.basename(p), path: p, type: "file" };
    if (p.startsWith("analysis/")) tree.analysis.push(item);
    else if (p.startsWith("docs/")) tree.docs.push(item);
    else if (p.startsWith("stories/")) tree.stories.push(item);
    else if (p.startsWith("figma_prompts/")) tree.figma_prompts.push(item);
    else if (p.startsWith(".cursor/skills/")) tree.skills.push(item);
    else if (!p.includes("/")) tree.root.push(item);
  }
  ["analysis", "docs", "stories", "figma_prompts", "skills"].forEach((k) => tree[k].sort((a, b) => a.name.localeCompare(b.name)));

  const stories = [];
  for (const p of tree.stories) {
    const content = data[p.path] || "";
    const effort = content.match(/\*\*Effort estimate:\*\*\s*(\d+)/);
    const title = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/);
    stories.push({
      path: p.path,
      filename: p.name,
      effort: effort ? parseInt(effort[1], 10) : null,
      title: title ? title[1].trim() : p.name,
    });
  }
  stories.sort((a, b) => a.filename.localeCompare(b.filename));

  const artifactStatus = artifacts.map((a) => ({
    ...a,
    exists: !!data[a.path],
  }));

  const objectives = [
    { id: 1, name: "KMP migration evaluation", complete: !!data["analysis/MODULE_CLASSIFICATIONS.md"] },
    { id: 2, name: "Keep native but modernize", complete: !!data["analysis/MODULE_CLASSIFICATIONS.md"] },
    { id: 3, name: "Keep native but refactor/observability", complete: !!data["analysis/MODULE_CLASSIFICATIONS.md"] },
    { id: 4, name: "WCAG AA accessibility audit", complete: !!data["analysis/WCAG_AUDIT.md"] },
    { id: 5, name: "Testing and 'no toys' criteria", complete: !!data["analysis/ARCHITECTURE_AUDIT.md"] },
    { id: 6, name: "Architectural audit", complete: !!data["analysis/ARCHITECTURE_AUDIT.md"] },
    { id: 7, name: "Chain-of-thought documentation", complete: !!data["analysis/ANALYSIS_LOG.md"] },
    { id: 8, name: "Training process", complete: !!data["docs/TRAINING_PROCESS.md"] },
    { id: 9, name: "Roadmap", complete: !!data["docs/ROADMAP.md"] },
    { id: 10, name: "User story template", complete: !!data["docs/USER_STORY_TEMPLATE.md"] },
    { id: 11, name: "User stories with Gherkin ACs", complete: tree.stories.length > 0 },
    { id: 12, name: "Effort estimation", complete: tree.stories.length > 0 },
    { id: 13, name: "Jira import", complete: !!(data["docs/JIRA_IMPORT.csv"] || data["docs/JIRA_IMPORT.md"]) },
    { id: 14, name: "Critical path analysis", complete: !!data["docs/CRITICAL_PATH_ANALYSIS.md"] },
    { id: 15, name: "Claude-to-Figma Make workflow", complete: tree.figma_prompts.length > 0 },
  ];

  const payload = JSON.stringify({
    data,
    tree,
    stories,
    artifacts: artifactStatus,
    objectives,
  });

  const styles = await fs.readFile(path.join(PROJECT_ROOT, "dashboard/public/styles.css"), "utf-8");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Migration Analysis — Client Review</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>${styles}</style>
</head>
<body>
  <div class="layout">
    <header class="header">
      <h1>Migration Analysis — Client Review</h1>
      <p style="margin:0;font-size:12px;color:var(--text-secondary)">Standalone bundle · No server required · Review at your own pace</p>
    </header>
    <aside class="sidebar">
      <nav class="sidebar-section">
        <h2>Overview</h2>
        <ul class="nav-list">
          <li><a href="#" data-panel="progress">Progress</a></li>
          <li><a href="#" data-panel="objectives">Objectives</a></li>
          <li><a href="#" data-panel="documents">Documents</a></li>
          <li><a href="#" data-panel="stories">Stories</a></li>
          <li><a href="#" data-panel="skills">Skills</a></li>
        </ul>
      </nav>
      <div class="sidebar-section">
        <h2>Quick links</h2>
        <ul class="nav-list" id="quick-links">
          <li><a href="#" data-path="CLAUDE.md">CLAUDE.md</a></li>
          <li><a href="#" data-path="analysis/ANALYSIS_LOG.md">Analysis log</a></li>
          <li><a href="#" data-path="docs/ROADMAP.md">Roadmap</a></li>
          <li><a href="#" data-path="docs/CRITICAL_PATH_ANALYSIS.md">Critical path</a></li>
          <li><a href="#" data-path="analysis/PROJECT_STRUCTURE.md">Project structure</a></li>
        </ul>
      </div>
    </aside>
    <main class="main">
      <section class="panel active" id="panel-progress">
        <h2>Progress</h2>
        <div class="phase-summary" id="phase-summary"></div>
        <div class="artifact-list" id="artifact-list"></div>
      </section>
      <section class="panel" id="panel-objectives">
        <h2>Objectives</h2>
        <div class="objective-list" id="objective-list"></div>
      </section>
      <section class="panel" id="panel-documents">
        <h2>Documents</h2>
        <p style="color:var(--text-secondary);margin-bottom:var(--component-gap)">Click a file to open it.</p>
        <div id="doc-browser"></div>
      </section>
      <section class="panel" id="panel-stories">
        <h2>Stories</h2>
        <div class="story-list" id="story-list"></div>
      </section>
      <section class="panel" id="panel-skills">
        <h2>Skills</h2>
        <p class="skills-intro">Project-specific AI assistant skills. Not applicable in this static review bundle.</p>
        <div class="skill-list" id="skill-list"></div>
      </section>
      <section class="panel" id="panel-viewer">
        <div class="doc-viewer">
          <div class="doc-viewer-header">
            <button type="button" class="btn btn-secondary" id="viewer-back">← Back</button>
            <span class="doc-path" id="viewer-path"></span>
          </div>
          <div class="doc-content" id="viewer-content"></div>
        </div>
      </section>
    </main>
  </div>
  <script>
    window.__BUNDLE_DATA__ = ${payload};
  </script>
  <script src="viewer.js"></script>
</body>
</html>`;

  await fs.mkdir(BUNDLE_DIR, { recursive: true });
  await fs.writeFile(path.join(BUNDLE_DIR, "index.html"), html);
  await fs.writeFile(path.join(BUNDLE_DIR, "viewer.js"), await fs.readFile(path.join(PROJECT_ROOT, "scripts/bundle-viewer.js"), "utf-8"));
  await fs.writeFile(path.join(BUNDLE_DIR, "README.md"), `# Migration Analysis — Client Review Bundle

This bundle contains the migration analysis for asynchronous review. No installation or server required.

## How to use

1. **Open in browser**: Double-click \`index.html\` or open it from your browser's File menu.
2. **Or host anywhere**: Upload this folder to any static hosting (Netlify, GitHub Pages, SharePoint, etc.) and share the URL.

## Contents

- **Progress** — Artifact checklist and phase completion
- **Objectives** — 15 objectives with status
- **Documents** — All analysis docs, roadmap, stories, and Figma prompts
- **Stories** — User stories with effort estimates

## Sharing

- **Zip**: Compress this folder and send via email or file share.
- **Cloud**: Upload to Google Drive, Dropbox, OneDrive, or your client's preferred platform.
- **Web**: Deploy to a static host and share the link.

---
*Generated by Migration Analysis System. For questions, contact your analyst.*
`);

  console.log(`Bundle built: ${BUNDLE_DIR}`);
  console.log(`  Files: ${Object.keys(data).length} documents`);
  console.log(`  Share: zip the bundle/ folder or upload to any static host`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

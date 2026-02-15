#!/usr/bin/env node
/**
 * Analyst Dashboard Server
 *
 * Serves the migration analysis dashboard with progress tracking,
 * document viewer, and archive browsing.
 *
 * Port: DASHBOARD_PORT env var or 3456
 */

const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const PORT = parseInt(process.env.DASHBOARD_PORT || "3456", 10);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Artifact registry from SYSTEM_ARCHITECTURE.md §2
const ARTIFACTS = [
  { id: 1, name: "Project structure map", path: "analysis/PROJECT_STRUCTURE.md", phase: 1, gate: "Peer-reviewed; every package accounted for" },
  { id: 2, name: "Module classifications", path: "analysis/MODULE_CLASSIFICATIONS.md", phase: 2, gate: "Every package classified; rationales non-generic" },
  { id: 3, name: "Architecture audit", path: "analysis/ARCHITECTURE_AUDIT.md", phase: 2, gate: "Findings cite code locations; target state defined" },
  { id: 4, name: "WCAG audit", path: "analysis/WCAG_AUDIT.md", phase: 2, gate: "Every screen covered; WCAG criterion IDs present" },
  { id: 5, name: "Roadmap", path: "docs/ROADMAP.md", phase: 3, gate: "All items have dependencies, timeframes, risk levels" },
  { id: 6, name: "Critical path analysis", path: "docs/CRITICAL_PATH_ANALYSIS.md", phase: 3, gate: "Scenarios grounded in person-week math" },
  { id: 7, name: "User story template", path: "docs/USER_STORY_TEMPLATE.md", phase: 3, gate: "Used consistently across all stories" },
  { id: 8, name: "Individual stories", path: "stories/", phase: 4, gate: "Gherkin ACs; NFRs for a11y, perf, observability, testing", isDir: true },
  { id: 9, name: "Figma detection report", path: "figma_prompts/_detection_report.md", phase: 4, gate: "Every story classified; borderline decisions documented" },
  { id: 10, name: "Figma prompts", path: "figma_prompts/", phase: 4, gate: "Valid JSON; matches §16.3 schema", isDir: true },
  { id: 11, name: "Jira import (CSV)", path: "docs/JIRA_IMPORT.csv", phase: 5, gate: "Importable without manual editing" },
  { id: 12, name: "Jira import (readable)", path: "docs/JIRA_IMPORT.md", phase: 5, gate: "Mirrors CSV; includes epic cross-refs" },
  { id: 13, name: "Analysis log", path: "analysis/ANALYSIS_LOG.md", phase: 0, gate: "Entry per analysis session, not post-hoc" },
  { id: 14, name: "Training process", path: "docs/TRAINING_PROCESS.md", phase: 5, gate: "Tested by at least one non-author" },
];

// Objectives from CLAUDE.md (numbered sections 5–17)
const OBJECTIVES = [
  { id: 1, name: "KMP migration evaluation", artifacts: ["analysis/MODULE_CLASSIFICATIONS.md"], phase: 2 },
  { id: 2, name: "Keep native but modernize", artifacts: ["analysis/MODULE_CLASSIFICATIONS.md"], phase: 2 },
  { id: 3, name: "Keep native but refactor/observability", artifacts: ["analysis/MODULE_CLASSIFICATIONS.md"], phase: 2 },
  { id: 4, name: "WCAG AA accessibility audit", artifacts: ["analysis/WCAG_AUDIT.md"], phase: 2 },
  { id: 5, name: "Testing and 'no toys' criteria", artifacts: ["analysis/ARCHITECTURE_AUDIT.md"], phase: 2 },
  { id: 6, name: "Architectural audit", artifacts: ["analysis/ARCHITECTURE_AUDIT.md"], phase: 2 },
  { id: 7, name: "Chain-of-thought documentation", artifacts: ["analysis/ANALYSIS_LOG.md"], phase: 0 },
  { id: 8, name: "Training process", artifacts: ["docs/TRAINING_PROCESS.md"], phase: 5 },
  { id: 9, name: "Roadmap", artifacts: ["docs/ROADMAP.md"], phase: 3 },
  { id: 10, name: "User story template", artifacts: ["docs/USER_STORY_TEMPLATE.md"], phase: 3 },
  { id: 11, name: "User stories with Gherkin ACs", artifacts: ["stories/"], phase: 4 },
  { id: 12, name: "Effort estimation", artifacts: ["stories/"], phase: 4 },
  { id: 13, name: "Jira import", artifacts: ["docs/JIRA_IMPORT.csv", "docs/JIRA_IMPORT.md"], phase: 5 },
  { id: 14, name: "Critical path analysis", artifacts: ["docs/CRITICAL_PATH_ANALYSIS.md"], phase: 3 },
  { id: 15, name: "Claude-to-Figma Make workflow", artifacts: ["figma_prompts/"], phase: 4 },
];

// Skills in .cursor/skills/
const SKILLS = [
  { name: "migration-analysis", path: ".cursor/skills/migration-analysis/SKILL.md", description: "Core workflow: model selection, artifact pipeline, code exploration. Use for structure mapping, roadmaps, analysis artifacts." },
  { name: "migration-kmp-classification", path: ".cursor/skills/migration-kmp-classification/SKILL.md", description: "Classify modules as KMP candidate vs native modernize vs native refactor. Use when deciding what to share vs keep platform-specific." },
  { name: "migration-story-writing", path: ".cursor/skills/migration-story-writing/SKILL.md", description: "User stories with Gherkin ACs. Use when writing stories for KMP, modernization, WCAG, or testing." },
  { name: "migration-wcag-audit", path: ".cursor/skills/migration-wcag-audit/SKILL.md", description: "WCAG 2.1 AA audit for mobile. Use when auditing screens for accessibility." },
];

const SKILLS_EXPLAINER = {
  cursor: {
    title: "Cursor",
    steps: [
      "Project skills live in .cursor/skills/ and are auto-discovered when you open this project.",
      "Cursor loads them on demand — the agent sees skill metadata first, then full content when relevant.",
      "To invoke: Ask for the task by name (e.g., \"Classify these modules for KMP\" or \"Write a migration story\") and the agent will use the matching skill.",
    ],
  },
  claudeCode: {
    title: "Claude Code",
    steps: [
      "Claude Code reads CLAUDE.md from the project root. Skills add focused workflows on top.",
      "To use: Reference the skill in your prompt (e.g., \"Follow migration-kmp-classification when classifying modules\") or paste the SKILL.md path so Claude loads it.",
      "Skills are in .cursor/skills/ — you can @-mention the file or add a reference in CLAUDE.md.",
    ],
  },
  other: {
    title: "Other tools (Windsurf, Codeium, Zed, etc.)",
    steps: [
      "Most AI coding tools support project rules or custom instructions.",
      "Copy the SKILL.md content into your tool's rules, instructions, or project context.",
      "Or add .cursor/skills/ to include paths so the tool reads skill files when needed.",
    ],
  },
};

function safePath(relativePath) {
  const resolved = path.resolve(PROJECT_ROOT, relativePath.replace(/\.\./g, ""));
  if (!resolved.startsWith(PROJECT_ROOT)) return null;
  return resolved;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function getArtifactStatus(artifact) {
  const fullPath = safePath(artifact.path);
  if (!fullPath) return { exists: false, mtime: null };

  if (artifact.isDir) {
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile() && !e.name.startsWith("."));
      if (files.length === 0) return { exists: false, mtime: null, count: 0 };
      let latest = 0;
      for (const f of files) {
        const stat = await fs.stat(path.join(fullPath, f.name));
        if (stat.mtimeMs > latest) latest = stat.mtimeMs;
      }
      return { exists: true, mtime: new Date(latest).toISOString(), count: files.length };
    } catch {
      return { exists: false, mtime: null, count: 0 };
    }
  }

  const exists = await fileExists(fullPath);
  if (!exists) return { exists: false, mtime: null };
  const stat = await fs.stat(fullPath);
  return { exists: true, mtime: stat.mtime.toISOString() };
}

async function listArchives() {
  const archiveDir = path.join(PROJECT_ROOT, "archive");
  try {
    const dirs = await fs.readdir(archiveDir, { withFileTypes: true });
    const snapshots = [];
    for (const d of dirs.filter((e) => e.isDirectory())) {
      const manifestPath = path.join(archiveDir, d.name, "manifest.json");
      let manifest = null;
      try {
        const raw = await fs.readFile(manifestPath, "utf-8");
        manifest = JSON.parse(raw);
      } catch {
        manifest = { snapshot: d.name, created: null, label: "", files: [] };
      }
      snapshots.push({ name: d.name, manifest });
    }
    snapshots.sort((a, b) => (b.name.localeCompare(a.name)));
    return snapshots;
  } catch {
    return [];
  }
}

function parseStoryMetadata(content, filename = "") {
  const meta = { effort: null, title: null, id: null };
  const effortMatch = content.match(/\*\*Effort estimate:\*\*\s*(\d+)/);
  if (effortMatch) meta.effort = parseInt(effortMatch[1], 10);
  const titleMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/);
  if (titleMatch) meta.title = titleMatch[1].trim();
  const idMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/);
  if (idMatch) meta.id = idMatch[1].trim().split(" ")[0];
  if (!meta.id && filename) meta.id = filename.replace(/\.md$/, "").split("_")[0];
  return meta;
}

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/artifacts", async (_req, res) => {
  try {
    const results = await Promise.all(
      ARTIFACTS.map(async (a) => ({
        ...a,
        ...(await getArtifactStatus(a)),
      }))
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/skills", (_req, res) => {
  res.json({ skills: SKILLS, explainer: SKILLS_EXPLAINER });
});

app.get("/api/objectives", async (_req, res) => {
  try {
    const results = [];
    for (const obj of OBJECTIVES) {
      let complete = true;
      for (const ap of obj.artifacts) {
        const fullPath = safePath(ap);
        if (!fullPath) {
          complete = false;
          break;
        }
        const exists = fullPath.endsWith("/")
          ? await fileExists(path.join(fullPath, "."))
          : await fileExists(fullPath);
        if (!exists) {
          complete = false;
          break;
        }
        if (ap.endsWith("/")) {
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          const files = entries.filter((e) => e.isFile() && !e.name.startsWith("."));
          if (files.length === 0) complete = false;
        }
      }
      results.push({ ...obj, complete });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/archives", async (_req, res) => {
  try {
    const snapshots = await listArchives();
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root-level key documents (not in a subdirectory)
const ROOT_DOCS = ["CLAUDE.md"];

app.get("/api/tree", async (_req, res) => {
  const dirs = ["analysis", "docs", "stories", "figma_prompts", "archive"];
  const tree = { root: [] };
  for (const name of ROOT_DOCS) {
    const fullPath = path.join(PROJECT_ROOT, name);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) tree.root.push({ name, type: "file", path: name });
    } catch {
      /* skip if missing */
    }
  }
  tree.root.sort((a, b) => a.name.localeCompare(b.name));
  // Skills from .cursor/skills/
  tree.skills = [];
  try {
    const skillsDir = path.join(PROJECT_ROOT, ".cursor", "skills");
    const skillDirs = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const d of skillDirs.filter((e) => e.isDirectory())) {
      const skillPath = path.join(skillsDir, d.name, "SKILL.md");
      if (await fileExists(skillPath)) {
        tree.skills.push({ name: `${d.name}/SKILL.md`, type: "file", path: `.cursor/skills/${d.name}/SKILL.md` });
      }
    }
    tree.skills.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    tree.skills = [];
  }
  for (const dir of dirs) {
    const fullPath = path.join(PROJECT_ROOT, dir);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const items = entries
        .filter((e) => !e.name.startsWith("."))
        .map((e) => ({
          name: e.name,
          type: e.isDirectory() ? "dir" : "file",
          path: `${dir}/${e.name}`,
        }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      tree[dir] = items;
    } catch {
      tree[dir] = [];
    }
  }
  // Archive subdirs (snapshots)
  const archivePath = path.join(PROJECT_ROOT, "archive");
  try {
    const archiveDirs = await fs.readdir(archivePath, { withFileTypes: true });
    tree.archive = archiveDirs
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, type: "dir", path: `archive/${e.name}` }))
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    tree.archive = [];
  }
  res.json(tree);
});

app.get("/api/read", async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || typeof filePath !== "string") {
    return res.status(400).json({ error: "path required" });
  }
  const fullPath = safePath(filePath);
  if (!fullPath) return res.status(400).json({ error: "invalid path" });
  try {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) return res.status(400).json({ error: "path is a directory" });
    const content = await fs.readFile(fullPath, "utf-8");
    const ext = path.extname(fullPath).toLowerCase();
    const isMarkdown = [".md", ".markdown"].includes(ext);
    const isJson = ext === ".json";
    res.json({
      path: filePath,
      content,
      format: isMarkdown ? "markdown" : isJson ? "json" : "text",
    });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "not found" });
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stories", async (_req, res) => {
  const storiesDir = path.join(PROJECT_ROOT, "stories");
  try {
    const entries = await fs.readdir(storiesDir, { withFileTypes: true });
    const stories = [];
    for (const e of entries.filter((f) => f.isFile() && f.name.endsWith(".md"))) {
      const content = await fs.readFile(path.join(storiesDir, e.name), "utf-8");
      const meta = parseStoryMetadata(content, e.name);
      meta.filename = e.name;
      meta.path = `stories/${e.name}`;
      stories.push(meta);
    }
    stories.sort((a, b) => (a.filename || "").localeCompare(b.filename || ""));
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/archive/:snapshot/tree", async (req, res) => {
  const snapshot = req.params.snapshot.replace(/\.\./g, "");
  const snapshotPath = path.join(PROJECT_ROOT, "archive", snapshot);
  const resolved = path.resolve(snapshotPath);
  if (!resolved.startsWith(path.join(PROJECT_ROOT, "archive"))) {
    return res.status(400).json({ error: "invalid snapshot" });
  }
  try {
    const manifestPath = path.join(snapshotPath, "manifest.json");
    const raw = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    const files = (manifest.files || []).map((f) => (typeof f === "string" ? f : f.path));
    res.json({ snapshot, files });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "not found" });
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/archive/:snapshot/read", async (req, res) => {
  const snapshot = req.params.snapshot.replace(/\.\./g, "");
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: "path required" });
  const fullPath = path.join(PROJECT_ROOT, "archive", snapshot, filePath.replace(/\.\./g, ""));
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(PROJECT_ROOT, "archive"))) {
    return res.status(400).json({ error: "invalid path" });
  }
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    const ext = path.extname(fullPath).toLowerCase();
    res.json({
      path: filePath,
      snapshot,
      content,
      format: [".md", ".markdown"].includes(ext) ? "markdown" : ext === ".json" ? "json" : "text",
    });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "not found" });
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Analyst Dashboard: http://localhost:${PORT}`);
  console.log(`Port config: DASHBOARD_PORT (default ${PORT})`);
});

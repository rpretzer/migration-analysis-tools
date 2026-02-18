#!/usr/bin/env node
/**
 * Development Pipeline Dashboard Server
 *
 * Two-tier dashboard: Analysis (what the system produces) + Pipeline (how it works).
 * Serves the Coach demo at /coach/.
 *
 * Port: DASHBOARD_PORT env var or 3456
 */

const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const PORT = parseInt(process.env.DASHBOARD_PORT || "3456", 10);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Analysis artifact registry
// ---------------------------------------------------------------------------
const ANALYSIS_ARTIFACTS = [
  { id: 1, name: "Project structure map", path: "analysis/PROJECT_STRUCTURE.md", phase: 1, gate: "Peer-reviewed; every package accounted for" },
  { id: 2, name: "Module classifications", path: "analysis/MODULE_CLASSIFICATIONS.md", phase: 2, gate: "Every package classified; rationales non-generic" },
  { id: 3, name: "Architecture audit", path: "analysis/ARCHITECTURE_AUDIT.md", phase: 2, gate: "Findings cite code locations; target state defined" },
  { id: 4, name: "WCAG audit", path: "analysis/WCAG_AUDIT.md", phase: 2, gate: "Every screen covered; WCAG criterion IDs present" },
  { id: 5, name: "Roadmap", path: "docs/ROADMAP.md", phase: 3, gate: "All items have dependencies, timeframes, risk levels" },
  { id: 6, name: "Critical path analysis", path: "docs/CRITICAL_PATH_ANALYSIS.md", phase: 3, gate: "Scenarios grounded in person-week math" },
  { id: 7, name: "User story template", path: "docs/USER_STORY_TEMPLATE.md", phase: 3, gate: "Used consistently across all stories" },
  { id: 8, name: "Individual stories", path: "stories/", phase: 4, gate: "Gherkin ACs; NFRs for a11y, perf, observability, testing", isDir: true },
  { id: 9, name: "Figma detection report", path: "figma_prompts/_detection_report.md", phase: 4, gate: "Every story classified; borderline decisions documented" },
  { id: 10, name: "Figma prompts", path: "figma_prompts/", phase: 4, gate: "Valid JSON; matches §17.3 schema", isDir: true },
  { id: 11, name: "Jira import (CSV)", path: "docs/JIRA_IMPORT.csv", phase: 5, gate: "Importable without manual editing" },
  { id: 12, name: "Jira import (readable)", path: "docs/JIRA_IMPORT.md", phase: 5, gate: "Mirrors CSV; includes epic cross-refs" },
  { id: 13, name: "Analysis log", path: "analysis/ANALYSIS_LOG.md", phase: 0, gate: "Entry per analysis session, not post-hoc" },
  { id: 14, name: "Training process", path: "docs/TRAINING_PROCESS.md", phase: 5, gate: "Tested by at least one non-author" },
];

// MCP server status registry — manually curated based on actual implementation audit.
// "substantive": Real logic, reads/writes data, makes API calls.
// "scaffolded": Infrastructure exists but blocked on missing dependencies (e.g. validation scripts).
// "placeholder": Returns NOT_CONFIGURED on every call; architecture only.
const MCP_SERVER_STATUS = {
  "analytics":      { status: "placeholder",  statusLabel: "Placeholder",  detail: "Architecture defined. Returns NOT_CONFIGURED. Awaiting analytics platform selection." },
  "current-state":  { status: "substantive",  statusLabel: "Implemented",  detail: "Reads and parses state files with regex parsing and filtering. 6 tools." },
  "design-system":  { status: "substantive",  statusLabel: "Implemented",  detail: "3-tier token priority, Material 3 specs, generates Figma prompt JSON. 6 tools." },
  "integration":    { status: "substantive",  statusLabel: "Implemented",  detail: "Live HTTP calls to Jira, GitHub, and LaunchDarkly APIs. Requires env vars. 8 tools." },
  "observability":  { status: "substantive",  statusLabel: "Implemented",  detail: "Append-only JSONL log, filtered queries, computes 5 real metrics. 4 tools." },
  "pipeline":       { status: "substantive",  statusLabel: "Implemented",  detail: "Atomic stage-machine state in status.json with transition validation. 4 tools." },
  "validation":     { status: "scaffolded",   statusLabel: "Scaffolded",   detail: "Script-runner infrastructure with 5 tools. 2 of 5 validation scripts operational (story, figma_prompt). 3 awaiting implementation." },
};

// Agent definitions with model preferences
const AGENT_DEFS = [
  { name: "Coach", model: "Opus", role: "methodology/roles/coach.md", github: ".github/agents/coach.agent.md", claude: ".claude/agents/coach.md", description: "Guides PM/PO through structured inquiry. Produces business cases, epics, and stories." },
  { name: "Spec Compiler", model: "Sonnet", role: "methodology/roles/spec-compiler.md", github: ".github/agents/spec-compiler.agent.md", claude: ".claude/agents/spec-compiler.md", description: "Transforms stories into machine-consumable specs grounded in codebase reality." },
  { name: "Codebase Analyst", model: "Sonnet", role: "methodology/roles/codebase-analyst.md", github: ".github/agents/codebase-analyst.agent.md", claude: ".claude/agents/codebase-analyst.md", description: "Maintains durable model of current codebase state across all platforms." },
  { name: "Coding Agent", model: "Sonnet", role: "methodology/roles/coding-agent.md", github: ".github/agents/coding-agent.agent.md", claude: ".claude/agents/coding-agent.md", description: "Generates code diffs from compiled specs. Stops on ambiguity." },
  { name: "Test Agent", model: "Sonnet", role: "methodology/roles/test-agent.md", github: ".github/agents/test-agent.agent.md", claude: ".claude/agents/test-agent.md", description: "Independent test generation and validation. Second opinion on implementation." },
  { name: "Quality Gate", model: "Opus", role: "methodology/roles/quality-gate.md", github: ".github/agents/quality-gate.agent.md", claude: ".claude/agents/quality-gate.md", description: "Final validator. Mechanically checks all outputs against schemas." },
  { name: "Observability", model: "Sonnet", role: "methodology/roles/observability-agent.md", github: ".github/agents/observability-agent.agent.md", claude: ".claude/agents/observability-agent.md", description: "Maintains audit trail. Backward tracing from any output to PM intent." },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safePath(relativePath) {
  const resolved = path.resolve(PROJECT_ROOT, relativePath.replace(/\.\./g, ""));
  if (!resolved.startsWith(PROJECT_ROOT)) return null;
  return resolved;
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
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
    } catch { return { exists: false, mtime: null, count: 0 }; }
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
    snapshots.sort((a, b) => b.name.localeCompare(a.name));
    return snapshots;
  } catch { return []; }
}

function parseStoryMetadata(content, filename = "") {
  const meta = { effort: null, title: null, id: null };
  const effortMatch = content.match(/\*\*Effort estimate:\*\*\s*(\d+)/);
  if (effortMatch) meta.effort = parseInt(effortMatch[1], 10);
  const titleMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/);
  if (titleMatch) meta.title = titleMatch[1].trim();
  if (!meta.id && filename) meta.id = filename.replace(/\.md$/, "").split("_")[0];
  return meta;
}

async function discoverSkills() {
  const skillsDir = path.join(PROJECT_ROOT, ".github", "skills");
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const skills = [];
    for (const d of entries.filter((e) => e.isDirectory())) {
      const instrPath = path.join(skillsDir, d.name, "instructions.md");
      const exists = await fileExists(instrPath);
      if (exists) {
        const content = await fs.readFile(instrPath, "utf-8");
        const descMatch = content.match(/^#\s+.+\n+(.+)/);
        const desc = descMatch ? descMatch[1].trim().slice(0, 200) : "";
        skills.push({
          name: d.name,
          path: `.github/skills/${d.name}/instructions.md`,
          description: desc,
        });
      }
    }
    skills.sort((a, b) => a.name.localeCompare(b.name));
    return skills;
  } catch { return []; }
}

async function discoverMcpServers() {
  const mcpDir = path.join(PROJECT_ROOT, "pipeline", "mcp-servers");
  try {
    const entries = await fs.readdir(mcpDir, { withFileTypes: true });
    const servers = [];
    for (const d of entries.filter((e) => e.isDirectory())) {
      const pkgPath = path.join(mcpDir, d.name, "package.json");
      let pkg = null;
      try {
        const raw = await fs.readFile(pkgPath, "utf-8");
        pkg = JSON.parse(raw);
      } catch { /* no package.json */ }
      const srcPath = path.join(mcpDir, d.name, "src", "index.js");
      const hasSrc = await fileExists(srcPath);
      const meta = MCP_SERVER_STATUS[d.name] || { status: hasSrc ? "substantive" : "placeholder", statusLabel: hasSrc ? "Implemented" : "Missing", detail: "" };
      servers.push({
        name: d.name,
        path: `pipeline/mcp-servers/${d.name}`,
        description: pkg?.description || "",
        hasSrc,
        status: meta.status,
        statusLabel: meta.statusLabel,
        detail: meta.detail,
      });
    }
    servers.sort((a, b) => a.name.localeCompare(b.name));
    return servers;
  } catch { return []; }
}

async function listMethodology() {
  const methDir = path.join(PROJECT_ROOT, "methodology");
  const categories = ["roles", "schemas", "process", "reference"];
  const result = {};
  for (const cat of categories) {
    const catDir = path.join(methDir, cat);
    try {
      const entries = await fs.readdir(catDir, { withFileTypes: true });
      result[cat] = entries
        .filter((e) => e.isFile() && !e.name.startsWith("."))
        .map((e) => ({ name: e.name, path: `methodology/${cat}/${e.name}` }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch { result[cat] = []; }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

app.use(express.static(path.join(__dirname, "public")));

// Serve Coach demo at /coach/
app.use("/coach", express.static(path.join(PROJECT_ROOT, "demo")));

// --- Overview ---
app.get("/api/overview", async (_req, res) => {
  try {
    const [artifacts, stories, skills, mcpServers, pipelineStatus] = await Promise.all([
      Promise.all(ANALYSIS_ARTIFACTS.map(async (a) => ({ ...a, ...(await getArtifactStatus(a)) }))),
      (async () => {
        const dir = path.join(PROJECT_ROOT, "stories");
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).length;
        } catch { return 0; }
      })(),
      discoverSkills(),
      discoverMcpServers(),
      (async () => {
        try {
          const raw = await fs.readFile(path.join(PROJECT_ROOT, "pipeline", "status.json"), "utf-8");
          return JSON.parse(raw);
        } catch { return { status: "unknown" }; }
      })(),
    ]);

    const done = artifacts.filter((a) => a.exists).length;
    const total = artifacts.length;
    const figmaDir = path.join(PROJECT_ROOT, "figma_prompts");
    let figmaCount = 0;
    try {
      const entries = await fs.readdir(figmaDir, { withFileTypes: true });
      figmaCount = entries.filter((e) => e.isFile() && e.name.endsWith(".json") && !e.name.startsWith("_")).length;
    } catch { /* ok */ }

    res.json({
      analysis: { done, total },
      stories: stories,
      figmaPrompts: figmaCount,
      agents: AGENT_DEFS.length,
      skills: skills.length,
      mcpServers: mcpServers.filter((s) => s.status === "substantive").length,
      mcpServersTotal: mcpServers.length,
      pipelineStatus: pipelineStatus.status || "unknown",
      pipelineNotes: pipelineStatus.notes || "",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Analysis artifacts ---
app.get("/api/artifacts", async (_req, res) => {
  try {
    const results = await Promise.all(
      ANALYSIS_ARTIFACTS.map(async (a) => ({ ...a, ...(await getArtifactStatus(a)) }))
    );
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Agents ---
app.get("/api/agents", async (_req, res) => {
  try {
    const agents = await Promise.all(
      AGENT_DEFS.map(async (a) => ({
        ...a,
        roleExists: await fileExists(safePath(a.role) || ""),
        githubExists: await fileExists(safePath(a.github) || ""),
        claudeExists: await fileExists(safePath(a.claude) || ""),
      }))
    );
    res.json(agents);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Skills ---
app.get("/api/skills", async (_req, res) => {
  try {
    const skills = await discoverSkills();
    res.json({ skills });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MCP servers ---
app.get("/api/mcp-servers", async (_req, res) => {
  try {
    const servers = await discoverMcpServers();
    res.json(servers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Methodology ---
app.get("/api/methodology", async (_req, res) => {
  try {
    const meth = await listMethodology();
    res.json(meth);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Pipeline status ---
app.get("/api/pipeline/status", async (_req, res) => {
  try {
    const raw = await fs.readFile(path.join(PROJECT_ROOT, "pipeline", "status.json"), "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    if (err.code === "ENOENT") return res.json({ status: "not_initialized" });
    res.status(500).json({ error: err.message });
  }
});

// --- Pipeline events ---
app.get("/api/pipeline/events", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
  try {
    const raw = await fs.readFile(path.join(PROJECT_ROOT, "pipeline", "observability", "events.jsonl"), "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const events = lines.slice(-limit).map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    res.json({ events, total: lines.length });
  } catch (err) {
    if (err.code === "ENOENT") return res.json({ events: [], total: 0 });
    res.status(500).json({ error: err.message });
  }
});

// --- Stories ---
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Figma prompts ---
app.get("/api/figma-prompts", async (_req, res) => {
  const figmaDir = path.join(PROJECT_ROOT, "figma_prompts");
  try {
    const entries = await fs.readdir(figmaDir, { withFileTypes: true });
    const prompts = [];
    for (const e of entries.filter((f) => f.isFile() && f.name.endsWith(".json") && !f.name.startsWith("_"))) {
      try {
        const raw = await fs.readFile(path.join(figmaDir, e.name), "utf-8");
        const data = JSON.parse(raw);
        prompts.push({
          filename: e.name,
          path: `figma_prompts/${e.name}`,
          uxIntent: data.ux_intent || "",
        });
      } catch {
        prompts.push({ filename: e.name, path: `figma_prompts/${e.name}`, uxIntent: "" });
      }
    }
    // Also include markdown files (detection report, brand constraints)
    for (const e of entries.filter((f) => f.isFile() && f.name.endsWith(".md"))) {
      prompts.push({ filename: e.name, path: `figma_prompts/${e.name}`, uxIntent: "" });
    }
    prompts.sort((a, b) => a.filename.localeCompare(b.filename));
    res.json(prompts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Archives ---
app.get("/api/archives", async (_req, res) => {
  try {
    const snapshots = await listArchives();
    res.json(snapshots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Document tree ---
app.get("/api/tree", async (_req, res) => {
  const dirs = ["analysis", "docs", "docs/operations", "stories", "figma_prompts", "methodology/roles", "methodology/schemas", "methodology/process", "methodology/reference", "pipeline"];
  const rootDocs = ["CLAUDE.md", "AGENTS.md"];
  const tree = { root: [] };

  for (const name of rootDocs) {
    const fullPath = path.join(PROJECT_ROOT, name);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) tree.root.push({ name, type: "file", path: name });
    } catch { /* skip */ }
  }
  tree.root.sort((a, b) => a.name.localeCompare(b.name));

  for (const dir of dirs) {
    const fullPath = path.join(PROJECT_ROOT, dir);
    const key = dir.replace(/\//g, "_");
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      tree[key] = entries
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
    } catch { tree[key] = []; }
  }

  res.json(tree);
});

// --- Read file ---
app.get("/api/read", async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || typeof filePath !== "string") return res.status(400).json({ error: "path required" });
  const fullPath = safePath(filePath);
  if (!fullPath) return res.status(400).json({ error: "invalid path" });
  try {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) return res.status(400).json({ error: "path is a directory" });
    const content = await fs.readFile(fullPath, "utf-8");
    const ext = path.extname(fullPath).toLowerCase();
    const isMarkdown = [".md", ".markdown"].includes(ext);
    const isJson = ext === ".json";
    res.json({ path: filePath, content, format: isMarkdown ? "markdown" : isJson ? "json" : "text" });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "not found" });
    res.status(500).json({ error: err.message });
  }
});

// --- Archive endpoints ---
app.get("/api/archive/:snapshot/tree", async (req, res) => {
  const snapshot = req.params.snapshot.replace(/\.\./g, "");
  const snapshotPath = path.join(PROJECT_ROOT, "archive", snapshot);
  const resolved = path.resolve(snapshotPath);
  if (!resolved.startsWith(path.join(PROJECT_ROOT, "archive"))) return res.status(400).json({ error: "invalid snapshot" });
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
  if (!resolved.startsWith(path.resolve(PROJECT_ROOT, "archive"))) return res.status(400).json({ error: "invalid path" });
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    const ext = path.extname(fullPath).toLowerCase();
    res.json({
      path: filePath, snapshot, content,
      format: [".md", ".markdown"].includes(ext) ? "markdown" : ext === ".json" ? "json" : "text",
    });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ error: "not found" });
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Development Pipeline Dashboard: http://localhost:${PORT}`);
  console.log(`Coach Demo: http://localhost:${PORT}/coach/`);
});

/**
 * Development Pipeline Dashboard — Client
 * Two-tier hub: Analysis + Pipeline
 */

const API = "/api";
let lastPanel = "overview";

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(s) {
  if (s == null) return "";
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: "short" }) + " " + d.toLocaleTimeString(undefined, { timeStyle: "short" });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function showPanel(id) {
  $$(".panel").forEach((p) => p.classList.remove("active"));
  $$(".nav-list a[data-panel]").forEach((a) => a.classList.remove("active"));
  const panel = $(`#panel-${id}`);
  const link = $(`.nav-list a[data-panel="${id}"]`);
  if (panel) panel.classList.add("active");
  if (link) link.classList.add("active");
  if (id !== "viewer") lastPanel = id;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
async function loadOverview() {
  try {
    const data = await fetchJson(`${API}/overview`);
    const grid = $("#overview-grid");
    grid.innerHTML = `
      <div class="metric-card" data-goto="progress">
        <div class="metric-label">Analysis Artifacts</div>
        <div class="metric-value">${data.analysis.done}/${data.analysis.total}</div>
        <div class="metric-detail">${data.analysis.done === data.analysis.total ? "All complete" : `${data.analysis.total - data.analysis.done} remaining`}</div>
      </div>
      <div class="metric-card" data-goto="stories">
        <div class="metric-label">User Stories</div>
        <div class="metric-value">${data.stories}</div>
        <div class="metric-detail">With Gherkin ACs</div>
      </div>
      <div class="metric-card metric-status" data-goto="observability">
        <div class="metric-label">Pipeline Status</div>
        <div class="metric-value">${escapeHtml(data.pipelineStatus)}</div>
        <div class="metric-detail">${escapeHtml(data.pipelineNotes || "")}</div>
      </div>
      <div class="metric-card" data-goto="agents">
        <div class="metric-label">Agents</div>
        <div class="metric-value">${data.agents}</div>
        <div class="metric-detail">Defined with roles + implementations</div>
      </div>
      <div class="metric-card" data-goto="skills">
        <div class="metric-label">Skills</div>
        <div class="metric-value">${data.skills}</div>
        <div class="metric-detail">Specialized instruction sets</div>
      </div>
      <div class="metric-card" data-goto="mcp">
        <div class="metric-label">MCP Servers</div>
        <div class="metric-value">${data.mcpServers}/${data.mcpServersTotal}</div>
        <div class="metric-detail">${data.mcpServers} substantive, ${data.mcpServersTotal - data.mcpServers} in progress</div>
      </div>
    `;
    grid.querySelectorAll("[data-goto]").forEach((card) => {
      card.addEventListener("click", () => showPanel(card.dataset.goto));
    });
  } catch (err) {
    $("#overview-grid").innerHTML = `<div class="empty-state">Failed to load overview: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Analysis: Progress
// ---------------------------------------------------------------------------
async function loadProgress() {
  const artifacts = await fetchJson(`${API}/artifacts`);
  const phaseSummary = {};
  artifacts.forEach((a) => {
    const phase = a.phase === 0 ? "Ongoing" : `Phase ${a.phase}`;
    if (!phaseSummary[phase]) phaseSummary[phase] = { total: 0, done: 0 };
    phaseSummary[phase].total++;
    if (a.exists) phaseSummary[phase].done++;
  });

  $("#phase-summary").innerHTML = Object.entries(phaseSummary)
    .map(([name, { total, done }]) => `
      <div class="phase-card">
        <h4>${name}</h4>
        <div class="count">${done}/${total}</div>
      </div>`)
    .join("");

  const listEl = $("#artifact-list");
  listEl.innerHTML = artifacts.map((a) => `
    <div class="artifact-card ${a.exists ? "exists" : "missing"}">
      <span class="artifact-status ${a.exists ? "exists" : "missing"}">${a.exists ? "✓" : "—"}</span>
      <div class="artifact-body">
        <h3>${escapeHtml(a.name)}</h3>
        <div class="path">${escapeHtml(a.path)}</div>
        <div class="gate">${escapeHtml(a.gate)}</div>
        ${a.exists && a.mtime ? `<div class="artifact-meta">Updated ${formatDate(a.mtime)}${a.count ? ` · ${a.count} files` : ""}</div>` : ""}
      </div>
      ${a.exists && !a.isDir ? `<button class="btn btn-secondary btn-small" data-open="${escapeHtml(a.path)}">Open</button>` : ""}
    </div>`)
    .join("");

  listEl.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openDocument(btn.dataset.open));
  });
}

// ---------------------------------------------------------------------------
// Analysis: Stories
// ---------------------------------------------------------------------------
async function loadStories() {
  const stories = await fetchJson(`${API}/stories`);
  const listEl = $("#story-list");
  if (stories.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No stories yet.</div>';
    return;
  }
  listEl.innerHTML = stories.map((s) => `
    <div class="story-card" data-path="${escapeHtml(s.path)}">
      <div class="story-effort" title="Effort: ${s.effort ?? "?"} pts">${s.effort ?? "?"}</div>
      <div class="story-info">
        <div class="title">${escapeHtml(s.title || s.filename || "Untitled")}</div>
        <div class="filename">${escapeHtml(s.filename)}</div>
      </div>
    </div>`)
    .join("");

  listEl.querySelectorAll(".story-card").forEach((card) => {
    card.addEventListener("click", () => openDocument(card.dataset.path));
  });
}

// ---------------------------------------------------------------------------
// Analysis: Figma Prompts
// ---------------------------------------------------------------------------
async function loadFigma() {
  try {
    const prompts = await fetchJson(`${API}/figma-prompts`);
    const listEl = $("#figma-list");
    if (prompts.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No Figma prompts yet.</div>';
      return;
    }
    listEl.innerHTML = prompts.map((p) => `
      <div class="figma-card" data-path="${escapeHtml(p.path)}">
        <div class="figma-icon">F</div>
        <div class="figma-info">
          <div class="figma-filename">${escapeHtml(p.filename)}</div>
          ${p.uxIntent ? `<div class="figma-intent">${escapeHtml(p.uxIntent)}</div>` : ""}
        </div>
      </div>`)
      .join("");

    listEl.querySelectorAll(".figma-card").forEach((card) => {
      card.addEventListener("click", () => openDocument(card.dataset.path));
    });
  } catch (err) {
    $("#figma-list").innerHTML = `<div class="empty-state">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Analysis: Documents
// ---------------------------------------------------------------------------
async function loadDocTree() {
  const browser = $("#doc-browser");
  try {
    const tree = await fetchJson(`${API}/tree`);
    const sections = [
      { key: "root", label: "Project Root" },
      { key: "analysis", label: "analysis/" },
      { key: "docs", label: "docs/" },
      { key: "docs_operations", label: "docs/operations/" },
      { key: "methodology_roles", label: "methodology/roles/" },
      { key: "methodology_schemas", label: "methodology/schemas/" },
      { key: "methodology_process", label: "methodology/process/" },
      { key: "methodology_reference", label: "methodology/reference/" },
    ];

    const items = sections
      .map(({ key, label }) => {
        const list = (tree[key] || []).filter((e) => e && e.type === "file");
        return { label, list };
      })
      .filter(({ list }) => list.length > 0);

    if (items.length === 0) {
      browser.innerHTML = '<div class="empty-state">No documents found.</div>';
      return;
    }

    browser.innerHTML = `<div class="doc-browser-grid">${items.map(({ label, list }) => `
      <div class="doc-browser-section">
        <h3>${escapeHtml(label)}</h3>
        <ul class="nav-list">
          ${list.map((e) => `<li><a href="#" data-path="${escapeHtml(e.path)}">${escapeHtml(e.name)}</a></li>`).join("")}
        </ul>
      </div>`).join("")}</div>`;

    browser.querySelectorAll("a[data-path]").forEach((a) => {
      a.addEventListener("click", (e) => { e.preventDefault(); openDocument(a.dataset.path); });
    });
  } catch (err) {
    browser.innerHTML = `<div class="empty-state">Failed to load documents: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Analysis: Archives
// ---------------------------------------------------------------------------
async function loadArchives() {
  const archives = await fetchJson(`${API}/archives`);
  const listEl = $("#archive-list");
  if (archives.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No archives yet.</div>';
    return;
  }
  listEl.innerHTML = archives.map((a) => {
    const m = a.manifest || {};
    const created = m.created ? formatDate(m.created) : "";
    const label = m.label ? ` — ${m.label}` : "";
    const fileCount = (m.files || []).length;
    return `
      <div class="archive-snapshot" data-snapshot="${escapeHtml(a.name)}">
        <h4>${escapeHtml(a.name)}${label}</h4>
        <div class="meta">${created} · ${fileCount} files</div>
        <div class="archive-files" style="display:none">
          ${(m.files || []).slice(0, 20).map((f) => {
            const p = typeof f === "string" ? f : f.path;
            return `<div><a href="#" data-snapshot="${escapeHtml(a.name)}" data-path="${escapeHtml(p)}">${escapeHtml(p)}</a></div>`;
          }).join("")}
          ${(m.files || []).length > 20 ? `<div>… and ${(m.files || []).length - 20} more</div>` : ""}
        </div>
      </div>`;
  }).join("");

  listEl.querySelectorAll(".archive-snapshot").forEach((snap) => {
    snap.addEventListener("click", (e) => {
      if (e.target.tagName === "A") return;
      const files = snap.querySelector(".archive-files");
      files.style.display = files.style.display === "none" ? "block" : "none";
    });
  });

  listEl.querySelectorAll(".archive-files a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openArchiveDocument(a.dataset.snapshot, a.dataset.path);
    });
  });
}

// ---------------------------------------------------------------------------
// Pipeline: Agents
// ---------------------------------------------------------------------------
async function loadAgents() {
  try {
    const agents = await fetchJson(`${API}/agents`);
    const listEl = $("#agent-list");
    listEl.innerHTML = agents.map((a) => `
      <div class="agent-card">
        <div class="agent-card-header">
          <span class="agent-name">${escapeHtml(a.name)}</span>
          <span class="agent-model ${a.model.toLowerCase()}">${escapeHtml(a.model)}</span>
        </div>
        <div class="agent-desc">${escapeHtml(a.description)}</div>
        <div class="agent-status">
          <span class="status-badge ${a.roleExists ? "ready" : "missing"}">${a.roleExists ? "Role ✓" : "Role —"}</span>
          <span class="status-badge ${a.githubExists ? "ready" : "missing"}">${a.githubExists ? "GitHub ✓" : "GitHub —"}</span>
          <span class="status-badge ${a.claudeExists ? "ready" : "missing"}">${a.claudeExists ? "Claude ✓" : "Claude —"}</span>
        </div>
        <div class="agent-actions">
          ${a.roleExists ? `<button class="btn btn-secondary btn-small" data-open="${escapeHtml(a.role)}">View Role</button>` : ""}
          ${a.githubExists ? `<button class="btn btn-secondary btn-small" data-open="${escapeHtml(a.github)}">GitHub Agent</button>` : ""}
        </div>
      </div>`)
      .join("");

    listEl.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => openDocument(btn.dataset.open));
    });
  } catch (err) {
    $("#agent-list").innerHTML = `<div class="empty-state">Failed to load agents: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Pipeline: Skills
// ---------------------------------------------------------------------------
async function loadSkills() {
  try {
    const { skills } = await fetchJson(`${API}/skills`);
    const listEl = $("#skill-list");
    if (skills.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No skills discovered.</div>';
      return;
    }
    listEl.innerHTML = skills.map((s) => `
      <div class="skill-card" data-path="${escapeHtml(s.path)}">
        <div class="skill-name">${escapeHtml(s.name)}</div>
        <div class="skill-desc">${escapeHtml(s.description)}</div>
      </div>`)
      .join("");

    listEl.querySelectorAll(".skill-card").forEach((card) => {
      card.addEventListener("click", () => openDocument(card.dataset.path));
    });
  } catch (err) {
    $("#skill-list").innerHTML = `<div class="empty-state">Failed to load skills: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Pipeline: MCP Servers
// ---------------------------------------------------------------------------
async function loadMcpServers() {
  try {
    const servers = await fetchJson(`${API}/mcp-servers`);
    const listEl = $("#mcp-list");
    if (servers.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No MCP servers found.</div>';
      return;
    }
    listEl.innerHTML = servers.map((s) => `
      <div class="mcp-card">
        <div class="mcp-card-header">
          <span class="mcp-name">${escapeHtml(s.name)}</span>
          <span class="mcp-impl-badge ${escapeHtml(s.status)}">${escapeHtml(s.statusLabel)}</span>
        </div>
        ${s.detail ? `<div class="mcp-desc">${escapeHtml(s.detail)}</div>` : s.description ? `<div class="mcp-desc">${escapeHtml(s.description)}</div>` : ""}
        <div class="mcp-path">${escapeHtml(s.path)}</div>
      </div>`)
      .join("");
  } catch (err) {
    $("#mcp-list").innerHTML = `<div class="empty-state">Failed to load MCP servers: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Pipeline: Methodology
// ---------------------------------------------------------------------------
async function loadMethodology() {
  try {
    const meth = await fetchJson(`${API}/methodology`);
    const browser = $("#methodology-browser");
    const categories = ["roles", "schemas", "process", "reference"];
    browser.innerHTML = categories.map((cat) => {
      const files = meth[cat] || [];
      if (files.length === 0) return "";
      return `
        <div class="methodology-section">
          <h3>${escapeHtml(cat)} (${files.length})</h3>
          <div class="methodology-files">
            ${files.map((f) => `<a href="#" class="methodology-file" data-path="${escapeHtml(f.path)}">${escapeHtml(f.name)}</a>`).join("")}
          </div>
        </div>`;
    }).join("");

    browser.querySelectorAll("[data-path]").forEach((a) => {
      a.addEventListener("click", (e) => { e.preventDefault(); openDocument(a.dataset.path); });
    });
  } catch (err) {
    $("#methodology-browser").innerHTML = `<div class="empty-state">Failed to load methodology: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Pipeline: Observability
// ---------------------------------------------------------------------------
async function loadObservability() {
  try {
    const [status, eventsData] = await Promise.all([
      fetchJson(`${API}/pipeline/status`),
      fetchJson(`${API}/pipeline/events?limit=20`),
    ]);

    const statusEl = $("#obs-status");
    statusEl.innerHTML = `
      <div class="obs-status-item"><span class="label">Pipeline version</span><span class="value">${escapeHtml(status.pipeline_version || "—")}</span></div>
      <div class="obs-status-item"><span class="label">Status</span><span class="value">${escapeHtml(status.status || "unknown")}</span></div>
      <div class="obs-status-item"><span class="label">Initialized</span><span class="value">${status.initialized ? formatDate(status.initialized) : "—"}</span></div>
      <div class="obs-status-item"><span class="label">Total events</span><span class="value">${eventsData.total}</span></div>
      ${status.notes ? `<div class="obs-status-item"><span class="label">Notes</span><span class="value">${escapeHtml(status.notes)}</span></div>` : ""}
    `;

    const eventsEl = $("#obs-events");
    if (eventsData.events.length === 0) {
      eventsEl.innerHTML = '<div class="empty-state">No events recorded yet.</div>';
      return;
    }
    eventsEl.innerHTML = eventsData.events.reverse().map((ev) => {
      const time = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      return `
        <div class="obs-event">
          <span class="ev-time">${escapeHtml(time)}</span>
          <span class="ev-agent">${escapeHtml(ev.agent || "")}</span>
          <span class="ev-action">${escapeHtml(ev.action || "")}</span>
          <span class="ev-detail">${escapeHtml(ev.decision || ev.story_id || "")}</span>
        </div>`;
    }).join("");
  } catch (err) {
    $("#obs-status").innerHTML = `<div class="empty-state">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Document Viewer
// ---------------------------------------------------------------------------
async function openDocument(path) {
  showPanel("viewer");
  $("#viewer-path").textContent = path;
  $("#viewer-content").innerHTML = '<div class="loading">Loading…</div>';
  try {
    const data = await fetchJson(`${API}/read?path=${encodeURIComponent(path)}`);
    renderContent(data.content, data.format, $("#viewer-content"));
  } catch (err) {
    $("#viewer-content").innerHTML = `<div class="empty-state">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

async function openArchiveDocument(snapshot, path) {
  showPanel("viewer");
  $("#viewer-path").textContent = `archive/${snapshot}/${path}`;
  $("#viewer-content").innerHTML = '<div class="loading">Loading…</div>';
  try {
    const data = await fetchJson(`${API}/archive/${encodeURIComponent(snapshot)}/read?path=${encodeURIComponent(path)}`);
    renderContent(data.content, data.format, $("#viewer-content"));
  } catch (err) {
    $("#viewer-content").innerHTML = `<div class="empty-state">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

function renderContent(content, format, el) {
  if (format === "markdown") {
    marked.setOptions({ gfm: true });
    el.innerHTML = marked.parse(content);
  } else if (format === "json") {
    try {
      const parsed = JSON.parse(content);
      el.innerHTML = `<pre><code>${escapeHtml(JSON.stringify(parsed, null, 2))}</code></pre>`;
    } catch {
      el.innerHTML = `<pre><code>${escapeHtml(content)}</code></pre>`;
    }
  } else {
    el.innerHTML = `<pre><code>${escapeHtml(content)}</code></pre>`;
  }
}

// ---------------------------------------------------------------------------
// Refresh all
// ---------------------------------------------------------------------------
async function refresh() {
  const loads = [
    loadOverview(),
    loadProgress(),
    loadStories(),
    loadFigma(),
    loadDocTree(),
    loadArchives(),
    loadAgents(),
    loadSkills(),
    loadMcpServers(),
    loadMethodology(),
    loadObservability(),
  ];
  const results = await Promise.allSettled(loads);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const names = ["overview", "progress", "stories", "figma", "docTree", "archives", "agents", "skills", "mcp", "methodology", "observability"];
      console.warn("Dashboard load failed:", names[i], r.reason);
    }
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Panel navigation
  $$(".nav-list a[data-panel]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showPanel(a.dataset.panel);
    });
  });

  // Quick links (data-path in sidebar)
  $$(".nav-quick a[data-path]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openDocument(a.dataset.path);
    });
  });

  // Viewer back button
  $("#viewer-back").addEventListener("click", () => showPanel(lastPanel));

  // Refresh
  $("#btn-refresh").addEventListener("click", async () => {
    $("#btn-refresh").disabled = true;
    await refresh();
    $("#btn-refresh").disabled = false;
  });

  await refresh();
});

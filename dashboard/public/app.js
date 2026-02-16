/**
 * Migration Analysis Dashboard — Client
 */

const API = "/api";

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

// Navigation
function showPanel(id) {
  $$(".panel").forEach((p) => p.classList.remove("active"));
  $$(".nav-list a").forEach((a) => a.classList.remove("active"));
  const panel = $(`#panel-${id}`);
  const link = $(`.nav-list a[data-panel="${id}"]`);
  if (panel) panel.classList.add("active");
  if (link) link.classList.add("active");
}

// Fetch helpers
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// Progress / Artifacts
async function loadProgress() {
  const artifacts = await fetchJson(`${API}/artifacts`);
  const phaseSummary = {};
  artifacts.forEach((a) => {
    const phase = a.phase === 0 ? "Ongoing" : `Phase ${a.phase}`;
    if (!phaseSummary[phase]) phaseSummary[phase] = { total: 0, done: 0 };
    phaseSummary[phase].total++;
    if (a.exists) phaseSummary[phase].done++;
  });

  const phaseEl = $("#phase-summary");
  phaseEl.innerHTML = Object.entries(phaseSummary)
    .map(
      ([name, { total, done }]) => `
    <div class="phase-card">
      <h4>${name}</h4>
      <div class="count">${done}/${total}</div>
    </div>`
    )
    .join("");

  const listEl = $("#artifact-list");
  listEl.innerHTML = artifacts
    .map(
      (a) => `
    <div class="artifact-card ${a.exists ? "exists" : "missing"}">
      <span class="artifact-status ${a.exists ? "exists" : "missing"}">${a.exists ? "✓" : "—"}</span>
      <div class="artifact-body">
        <h3>${escapeHtml(a.name)}</h3>
        <div class="path">${escapeHtml(a.path)}</div>
        <div class="gate">${escapeHtml(a.gate)}</div>
        ${a.exists && a.mtime ? `<div class="artifact-meta">Updated ${formatDate(a.mtime)}${a.count ? ` · ${a.count} files` : ""}</div>` : ""}
      </div>
      ${a.exists && !a.isDir ? `<button class="btn btn-secondary" data-open="${escapeHtml(a.path)}">Open</button>` : ""}
    </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openDocument(btn.dataset.open));
  });
}

// Objectives
async function loadObjectives() {
  const objectives = await fetchJson(`${API}/objectives`);
  const listEl = $("#objective-list");
  listEl.innerHTML = objectives
    .map(
      (o) => `
    <div class="objective-item ${o.complete ? "complete" : "pending"}">
      <span class="objective-check">${o.complete ? "✓" : "○"}</span>
      <div>
        <strong>${o.id}.</strong> ${escapeHtml(o.name)}
        <span style="color:var(--text-secondary);font-size:12px"> (Phase ${o.phase})</span>
      </div>
    </div>`
    )
    .join("");
}

// Document tree and viewer
async function loadDocTree() {
  const browser = $("#doc-browser");
  if (!browser) return;
  try {
    const tree = await fetchJson(`${API}/tree`);
    const sections = ["root", "skills", "analysis", "docs", "stories", "figma_prompts"];
    const sectionLabels = { root: "Project", skills: "Skills", analysis: "analysis", docs: "docs", stories: "stories", figma_prompts: "figma_prompts" };
    const items = sections
      .map((section) => {
        const list = (tree[section] || []).filter((e) => e && e.type === "file");
        return { section, label: sectionLabels[section] || section, list };
      })
      .filter(({ list }) => list.length > 0);
    if (items.length === 0) {
      browser.innerHTML = '<div class="empty-state">No documents found. Ensure the dashboard server is running from the project root.</div>';
      return;
    }
    browser.innerHTML = items
      .map(
        ({ section, label, list }) => `
    <div class="sidebar-section doc-browser-section">
      <h2>${escapeHtml(label)}</h2>
      <ul class="nav-list">
        ${list.map((e) => `<li><a href="#" data-path="${escapeHtml(e.path)}">${escapeHtml(e.name)}</a></li>`).join("")}
      </ul>
    </div>`
      )
      .join("");

    browser.querySelectorAll("a[data-path]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openDocument(a.dataset.path);
      });
    });
  } catch (err) {
    browser.innerHTML = `<div class="empty-state">Failed to load documents: ${escapeHtml(err.message)}. Check the server is running.</div>`;
  }
}

async function openDocument(path, snapshot = null) {
  showPanel("viewer");
  $("#viewer-path").textContent = snapshot ? `archive/${snapshot}/${path}` : path;
  $("#viewer-path").title = snapshot ? `archive/${snapshot}/${path}` : path;
  $("#viewer-content").innerHTML = '<div class="loading">Loading…</div>';

  try {
    const url = snapshot
      ? `${API}/archive/${encodeURIComponent(snapshot)}/read?path=${encodeURIComponent(path)}`
      : `${API}/read?path=${encodeURIComponent(path)}`;
    const data = await fetchJson(url);
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

// Stories with metadata
async function loadStories() {
  const stories = await fetchJson(`${API}/stories`);
  const listEl = $("#story-list");
  listEl.innerHTML = stories
    .map(
      (s) => `
    <div class="story-card" data-path="${escapeHtml(s.path)}">
      <div class="story-effort" title="Effort: ${s.effort ?? "?"} pts">${s.effort ?? "?"}</div>
      <div class="story-info">
        <div class="title">${escapeHtml(s.id ? `[${s.id}] ` : "")}${escapeHtml(s.title || s.filename || "Untitled")}</div>
        <div class="filename">${escapeHtml(s.filename)}</div>
      </div>
    </div>`
    )
    .join("");

  listEl.querySelectorAll(".story-card").forEach((card) => {
    card.addEventListener("click", () => openDocument(card.dataset.path));
  });
}

// Archives
async function loadArchives() {
  const archives = await fetchJson(`${API}/archives`);
  const listEl = $("#archive-list");

  if (archives.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No archives yet. Run <code>python3 scripts/archive.py snapshot</code> to create one.</div>';
    return;
  }

  listEl.innerHTML = archives
    .map(
      (a) => {
        const m = a.manifest || {};
        const created = m.created ? formatDate(m.created) : "";
        const label = m.label ? ` — ${m.label}` : "";
        const fileCount = (m.files || []).length;
        return `
    <div class="archive-snapshot" data-snapshot="${escapeHtml(a.name)}">
      <h4>${escapeHtml(a.name)}${label}</h4>
      <div class="meta">${created} · ${fileCount} files</div>
      <div class="archive-files" style="display:none">
        ${(m.files || [])
          .slice(0, 20)
          .map((f) => {
            const p = typeof f === "string" ? f : f.path;
            return `<div><a href="#" data-snapshot="${escapeHtml(a.name)}" data-path="${escapeHtml(p)}">${escapeHtml(p)}</a></div>`;
          })
          .join("")}
        ${(m.files || []).length > 20 ? `<div>… and ${(m.files || []).length - 20} more</div>` : ""}
      </div>
    </div>`;
      }
    )
    .join("");

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

// Skills
async function loadSkills() {
  const { skills, explainer } = await fetchJson(`${API}/skills`);
  const listEl = $("#skill-list");
  listEl.innerHTML = skills
    .map(
      (s) => `
    <div class="skill-card">
      <div class="skill-header">
        <code class="skill-name">${escapeHtml(s.name)}</code>
        <button class="btn btn-secondary" data-path="${escapeHtml(s.path)}">Open</button>
      </div>
      <p class="skill-desc">${escapeHtml(s.description)}</p>
    </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-path]").forEach((btn) => {
    btn.addEventListener("click", () => openDocument(btn.dataset.path));
  });

  const explainerEl = $("#skills-explainer");
  explainerEl.innerHTML = `
    <h3>How to enable in your AI tool</h3>
    ${Object.values(explainer)
      .map(
        (e) => `
      <div class="explainer-block">
        <h4>${escapeHtml(e.title)}</h4>
        <ol>
          ${e.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </div>`
      )
      .join("")}
  `;
}

async function openArchiveDocument(snapshot, path) {
  showPanel("viewer");
  $("#viewer-path").textContent = `archive/${snapshot}/${path}`;
  $("#viewer-content").innerHTML = '<div class="loading">Loading…</div>';

  try {
    const data = await fetchJson(
      `${API}/archive/${encodeURIComponent(snapshot)}/read?path=${encodeURIComponent(path)}`
    );
    renderContent(data.content, data.format, $("#viewer-content"));
  } catch (err) {
    $("#viewer-content").innerHTML = `<div class="empty-state">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

// Sidebar skill links
function initSidebarSkills() {
  $$("#sidebar-skill-list a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openDocument(a.dataset.path);
    });
  });
}

// Quick links
function initQuickLinks() {
  $$("#quick-links-list a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (a.dataset.panel) {
        showPanel(a.dataset.panel);
      } else if (a.dataset.path) {
        openDocument(a.dataset.path);
      }
    });
  });
}

// Helpers
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

// Refresh all data
async function refresh() {
  const loads = [
    loadProgress(),
    loadObjectives(),
    loadStories(),
    loadArchives(),
    loadSkills(),
    loadDocTree(),
  ];
  const results = await Promise.allSettled(loads);
  results.forEach((r, i) => {
    if (r.status === "rejected") console.warn("Dashboard load failed:", ["progress", "objectives", "stories", "archives", "skills", "docTree"][i], r.reason);
  });
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  $$(".nav-list a[data-panel]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showPanel(a.dataset.panel);
    });
  });

  $("#btn-refresh").addEventListener("click", async () => {
    $("#btn-refresh").disabled = true;
    await refresh();
    $("#btn-refresh").disabled = false;
  });

  $("#viewer-back").addEventListener("click", () => showPanel("documents"));

  initSidebarSkills();
  initQuickLinks();
  await refresh();
});

/**
 * Static bundle viewer — reads from window.__BUNDLE_DATA__
 * No server required. For client async review.
 */
(function () {
  const D = window.__BUNDLE_DATA__ || {};
  const data = D.data || {};
  const tree = D.tree || {};
  const stories = D.stories || [];
  const artifacts = D.artifacts || [];
  const objectives = D.objectives || [];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }
  function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function showPanel(id) {
    $$(".panel").forEach((p) => p.classList.remove("active"));
    $$(".nav-list a[data-panel]").forEach((a) => a.classList.remove("active"));
    const panel = $(`#panel-${id}`);
    const link = $(`.nav-list a[data-panel="${id}"]`);
    if (panel) panel.classList.add("active");
    if (link) link.classList.add("active");
  }

  function renderContent(content, format, el) {
    if (format === "markdown") {
      if (typeof marked !== "undefined") {
        marked.setOptions({ gfm: true });
        el.innerHTML = marked.parse(content);
      } else {
        el.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
      }
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

  function openDocument(path) {
    showPanel("viewer");
    $("#viewer-path").textContent = path;
    const content = data[path];
    const el = $("#viewer-content");
    if (!content) {
      el.innerHTML = "<div class=\"empty-state\">Document not found.</div>";
      return;
    }
    const ext = path.split(".").pop().toLowerCase();
    const format = ["md", "markdown"].includes(ext) ? "markdown" : ext === "json" ? "json" : "text";
    renderContent(content, format, el);
  }

  // Progress
  const phaseSummary = {};
  artifacts.forEach((a) => {
    const phase = a.phase === 0 ? "Ongoing" : `Phase ${a.phase}`;
    if (!phaseSummary[phase]) phaseSummary[phase] = { total: 0, done: 0 };
    phaseSummary[phase].total++;
    if (a.exists) phaseSummary[phase].done++;
  });
  $("#phase-summary").innerHTML = Object.entries(phaseSummary)
    .map(([name, { total, done }]) => `<div class="phase-card"><h4>${escapeHtml(name)}</h4><div class="count">${done}/${total}</div></div>`)
    .join("");
  $("#artifact-list").innerHTML = artifacts
    .map(
      (a) => `
    <div class="artifact-card ${a.exists ? "exists" : "missing"}">
      <span class="artifact-status ${a.exists ? "exists" : "missing"}">${a.exists ? "✓" : "—"}</span>
      <div class="artifact-body">
        <h3>${escapeHtml(a.name)}</h3>
        <div class="path">${escapeHtml(a.path)}</div>
      </div>
      ${a.exists ? `<button class="btn btn-secondary" data-open="${escapeHtml(a.path)}">Open</button>` : ""}
    </div>`
    )
    .join("");
  $("#artifact-list").querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openDocument(btn.dataset.open));
  });

  // Objectives
  $("#objective-list").innerHTML = objectives
    .map(
      (o) => `
    <div class="objective-item ${o.complete ? "complete" : "pending"}">
      <span class="objective-check">${o.complete ? "✓" : "○"}</span>
      <div><strong>${o.id}.</strong> ${escapeHtml(o.name)}</div>
    </div>`
    )
    .join("");

  // Document tree
  const sections = [
    { key: "root", label: "Project" },
    { key: "skills", label: "Skills" },
    { key: "analysis", label: "analysis" },
    { key: "docs", label: "docs" },
    { key: "stories", label: "stories" },
    { key: "figma_prompts", label: "figma_prompts" },
  ];
  const items = sections
    .map(({ key, label }) => ({ label, list: (tree[key] || []).filter((e) => e && e.type === "file") }))
    .filter(({ list }) => list.length > 0);
  $("#doc-browser").innerHTML =
    items.length === 0
      ? '<div class="empty-state">No documents in bundle.</div>'
      : items
          .map(
            ({ label, list }) => `
    <div class="sidebar-section doc-browser-section">
      <h2>${escapeHtml(label)}</h2>
      <ul class="nav-list">
        ${list.map((e) => `<li><a href="#" data-path="${escapeHtml(e.path)}">${escapeHtml(e.name)}</a></li>`).join("")}
      </ul>
    </div>`
          )
          .join("");
  $("#doc-browser").querySelectorAll("a[data-path]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openDocument(a.dataset.path);
    });
  });

  // Stories
  $("#story-list").innerHTML =
    stories.length === 0
      ? '<div class="empty-state">No stories in bundle.</div>'
      : stories
          .map(
            (s) => `
    <div class="story-card" data-path="${escapeHtml(s.path)}">
      <div class="story-effort">${s.effort ?? "?"}</div>
      <div class="story-info">
        <div class="title">${escapeHtml(s.title || s.filename || "Untitled")}</div>
        <div class="filename">${escapeHtml(s.filename)}</div>
      </div>
    </div>`
          )
          .join("");
  $("#story-list").querySelectorAll(".story-card").forEach((card) => {
    card.addEventListener("click", () => openDocument(card.dataset.path));
  });

  // Skills (simplified — just list with open)
  const skills = (tree.skills || []).map((s) => ({ name: s.name.replace("/SKILL.md", ""), path: s.path }));
  $("#skill-list").innerHTML =
    skills.length === 0
      ? '<div class="empty-state">No skills in bundle.</div>'
      : skills
          .map(
            (s) => `
    <div class="skill-card">
      <div class="skill-header">
        <code class="skill-name">${escapeHtml(s.name)}</code>
        <button class="btn btn-secondary" data-path="${escapeHtml(s.path)}">Open</button>
      </div>
    </div>`
          )
          .join("");
  $("#skill-list").querySelectorAll("[data-path]").forEach((btn) => {
    btn.addEventListener("click", () => openDocument(btn.dataset.path));
  });

  // Quick links
  $$("#quick-links a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openDocument(a.dataset.path);
    });
  });

  // Nav
  $$(".nav-list a[data-panel]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showPanel(a.dataset.panel);
    });
  });

  $("#viewer-back").addEventListener("click", () => showPanel("documents"));
})();

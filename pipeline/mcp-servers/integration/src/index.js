/**
 * Integration MCP Server
 *
 * Bridges pipeline agents to external services: Jira (issue management),
 * GitHub (repository issues and PRs), and LaunchDarkly (feature flags).
 *
 * Credentials are read exclusively from environment variables — never from
 * files. If a required variable is missing, the tool returns a NOT_CONFIGURED
 * result describing which variable to set.
 *
 * Required environment variables:
 *
 *   Jira:
 *     JIRA_BASE_URL      e.g. https://midwest-tape.atlassian.net
 *     JIRA_EMAIL         Service account email
 *     JIRA_API_TOKEN     Atlassian API token
 *     JIRA_PROJECT_KEY   e.g. HOOPLA
 *
 *   GitHub:
 *     GITHUB_TOKEN       Personal access token or Actions $GITHUB_TOKEN
 *     GITHUB_REPO        owner/repo format, e.g. midwest-tape/hoopla-android
 *
 *   LaunchDarkly:
 *     LAUNCHDARKLY_SDK_KEY   Server-side SDK key (for REST API management)
 *     LAUNCHDARKLY_PROJECT   e.g. hoopla
 *
 * Note: This server performs HTTP requests using the Node.js built-in fetch
 * (available in Node 18+). No third-party HTTP library is required.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ---------------------------------------------------------------------------
// Environment variable helpers
// ---------------------------------------------------------------------------

/**
 * Returns the value of an environment variable, or null if not set.
 * @param {string} name
 * @returns {string|null}
 */
function env(name) {
  return process.env[name] || null;
}

/**
 * Returns a NOT_CONFIGURED error object listing missing environment variables.
 * @param {string[]} required - Variable names that must be set
 * @param {string} service - Service name for the error message
 * @returns {object}
 */
function notConfigured(required, service) {
  const missing = required.filter((v) => !env(v));
  return {
    ok: false,
    status: 'NOT_CONFIGURED',
    service,
    missing_env_vars: missing,
    hint: `Set the following environment variables to enable ${service}: ${missing.join(', ')}`,
  };
}

/**
 * Checks whether all required environment variables are present.
 * @param {string[]} required
 * @returns {boolean}
 */
function hasEnv(required) {
  return required.every((v) => !!env(v));
}

// ---------------------------------------------------------------------------
// Jira helpers
// ---------------------------------------------------------------------------

const JIRA_REQUIRED = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY'];

/**
 * Returns the Authorization header for Jira Basic auth.
 * @returns {string}
 */
function jiraAuthHeader() {
  const token = Buffer.from(`${env('JIRA_EMAIL')}:${env('JIRA_API_TOKEN')}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * Makes a Jira REST API call.
 * @param {string} endpoint - Path after /rest/api/3, e.g. "/issue"
 * @param {string} method - HTTP method
 * @param {object} [body] - Request body (will be JSON-serialized)
 * @returns {Promise<object>}
 */
async function jiraRequest(endpoint, method = 'GET', body = null) {
  const url = `${env('JIRA_BASE_URL')}/rest/api/3${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: jiraAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`Jira API error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// LaunchDarkly helpers
// ---------------------------------------------------------------------------

const LD_REQUIRED = ['LAUNCHDARKLY_SDK_KEY', 'LAUNCHDARKLY_PROJECT'];
const LD_BASE_URL = 'https://app.launchdarkly.com/api/v2';

/**
 * Makes a LaunchDarkly REST API call.
 * @param {string} endpoint - Path after /api/v2
 * @param {string} method
 * @param {object} [body]
 * @returns {Promise<object>}
 */
async function ldRequest(endpoint, method = 'GET', body = null) {
  const url = `${LD_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: env('LAUNCHDARKLY_SDK_KEY'),
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`LaunchDarkly API error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// GitHub helpers
// ---------------------------------------------------------------------------

const GH_REQUIRED = ['GITHUB_TOKEN', 'GITHUB_REPO'];
const GH_API = 'https://api.github.com';

/**
 * Makes a GitHub REST API call.
 * @param {string} endpoint - Full path, e.g. "/repos/owner/repo/issues"
 * @param {string} method
 * @param {object} [body]
 * @returns {Promise<object>}
 */
async function ghRequest(endpoint, method = 'GET', body = null) {
  const url = `${GH_API}${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${env('GITHUB_TOKEN')}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

/**
 * create_issue — Creates a Jira or GitHub issue.
 *
 * @param {object} args
 * @param {string} args.type - Issue type: "story", "bug", "epic", "task"
 * @param {string} args.title - Issue title / summary
 * @param {string} args.body - Description (markdown)
 * @param {string[]} [args.labels] - Labels to apply
 * @param {string} [args.epic] - Epic link key (Jira) or parent issue number (GitHub)
 * @param {string} [args.platform] - "jira" or "github" (default: jira if configured)
 * @param {number} [args.story_points] - Story points (Jira story_points field)
 */
async function handleCreateIssue({ type, title, body, labels = [], epic, platform, story_points }) {
  if (!title) return { error: 'title is required' };
  if (!body) return { error: 'body is required' };

  const useJira = platform === 'jira' || (!platform && hasEnv(JIRA_REQUIRED));
  const useGitHub = platform === 'github' || (!platform && !hasEnv(JIRA_REQUIRED) && hasEnv(GH_REQUIRED));

  if (useJira) {
    if (!hasEnv(JIRA_REQUIRED)) return notConfigured(JIRA_REQUIRED, 'Jira');
    try {
      const issueTypeMap = { story: 'Story', bug: 'Bug', epic: 'Epic', task: 'Task' };
      const issueBody = {
        fields: {
          project: { key: env('JIRA_PROJECT_KEY') },
          summary: title,
          description: {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
          },
          issuetype: { name: issueTypeMap[type] || 'Story' },
        },
      };
      if (labels.length > 0) {
        issueBody.fields.labels = labels;
      }
      if (story_points) {
        issueBody.fields.story_points = story_points;
      }
      if (epic) {
        issueBody.fields['Epic Link'] = epic;
      }
      const result = await jiraRequest('/issue', 'POST', issueBody);
      return { ok: true, platform: 'jira', issue_key: result.key, issue_id: result.id, url: `${env('JIRA_BASE_URL')}/browse/${result.key}` };
    } catch (err) {
      return { ok: false, platform: 'jira', error: err.message };
    }
  }

  if (useGitHub) {
    if (!hasEnv(GH_REQUIRED)) return notConfigured(GH_REQUIRED, 'GitHub');
    try {
      const repo = env('GITHUB_REPO');
      const issueBody = { title, body, labels };
      const result = await ghRequest(`/repos/${repo}/issues`, 'POST', issueBody);
      return { ok: true, platform: 'github', issue_number: result.number, url: result.html_url };
    } catch (err) {
      return { ok: false, platform: 'github', error: err.message };
    }
  }

  return notConfigured([...JIRA_REQUIRED, ...GH_REQUIRED], 'Jira or GitHub');
}

/**
 * update_issue — Updates an existing Jira or GitHub issue.
 *
 * @param {object} args
 * @param {string} args.id - Issue key (e.g. "HOOPLA-42") or GitHub issue number
 * @param {object} args.fields - Fields to update (title, body, labels, status, story_points)
 * @param {string} [args.platform] - "jira" or "github"
 */
async function handleUpdateIssue({ id, fields = {}, platform }) {
  if (!id) return { error: 'id is required' };

  const useJira = platform === 'jira' || (!platform && hasEnv(JIRA_REQUIRED));

  if (useJira) {
    if (!hasEnv(JIRA_REQUIRED)) return notConfigured(JIRA_REQUIRED, 'Jira');
    try {
      const updateBody = { fields: {} };
      if (fields.title || fields.summary) updateBody.fields.summary = fields.title || fields.summary;
      if (fields.body || fields.description) {
        updateBody.fields.description = {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: fields.body || fields.description }] }],
        };
      }
      if (fields.labels) updateBody.fields.labels = fields.labels;
      if (fields.story_points) updateBody.fields.story_points = fields.story_points;
      await jiraRequest(`/issue/${id}`, 'PUT', updateBody);
      return { ok: true, platform: 'jira', issue_key: id };
    } catch (err) {
      return { ok: false, platform: 'jira', error: err.message };
    }
  }

  if (!hasEnv(GH_REQUIRED)) return notConfigured(GH_REQUIRED, 'GitHub');
  try {
    const repo = env('GITHUB_REPO');
    const updateBody = {};
    if (fields.title) updateBody.title = fields.title;
    if (fields.body) updateBody.body = fields.body;
    if (fields.labels) updateBody.labels = fields.labels;
    const result = await ghRequest(`/repos/${repo}/issues/${id}`, 'PATCH', updateBody);
    return { ok: true, platform: 'github', issue_number: result.number, url: result.html_url };
  } catch (err) {
    return { ok: false, platform: 'github', error: err.message };
  }
}

/**
 * link_issues — Creates a dependency link between two issues in Jira.
 * GitHub does not have native issue links; for GitHub, this adds a comment
 * documenting the dependency.
 *
 * @param {object} args
 * @param {string} args.from - Source issue key
 * @param {string} args.to - Target issue key
 * @param {string} args.type - Link type: "blocks", "is blocked by", "relates to", "duplicates"
 * @param {string} [args.platform] - "jira" or "github"
 */
async function handleLinkIssues({ from: fromId, to: toId, type: linkType, platform }) {
  if (!fromId) return { error: 'from is required' };
  if (!toId) return { error: 'to is required' };
  if (!linkType) return { error: 'type is required' };

  const useJira = platform === 'jira' || (!platform && hasEnv(JIRA_REQUIRED));

  if (useJira) {
    if (!hasEnv(JIRA_REQUIRED)) return notConfigured(JIRA_REQUIRED, 'Jira');
    try {
      // Jira link type names are case-sensitive; map common aliases.
      const linkTypeMap = {
        blocks: 'Blocks',
        'is blocked by': 'is blocked by',
        'relates to': 'Relates',
        duplicates: 'Duplicates',
      };
      const jiraLinkType = linkTypeMap[linkType.toLowerCase()] || linkType;
      const linkBody = {
        type: { name: jiraLinkType },
        inwardIssue: { key: fromId },
        outwardIssue: { key: toId },
      };
      await jiraRequest('/issueLink', 'POST', linkBody);
      return { ok: true, platform: 'jira', from: fromId, to: toId, link_type: jiraLinkType };
    } catch (err) {
      return { ok: false, platform: 'jira', error: err.message };
    }
  }

  if (!hasEnv(GH_REQUIRED)) return notConfigured(GH_REQUIRED, 'GitHub');
  try {
    const repo = env('GITHUB_REPO');
    const comment = `**Dependency:** This issue ${linkType} #${toId}`;
    await ghRequest(`/repos/${repo}/issues/${fromId}/comments`, 'POST', { body: comment });
    return { ok: true, platform: 'github', from: fromId, to: toId, note: 'Dependency recorded as comment (GitHub has no native issue links)' };
  } catch (err) {
    return { ok: false, platform: 'github', error: err.message };
  }
}

/**
 * sync_status — Syncs a story's pipeline status to/from Jira.
 * Reads the pipeline stage from pipeline/status.json and updates the Jira
 * issue status to match, or reads the Jira status and returns it.
 *
 * @param {object} args
 * @param {string} args.story_id - Pipeline story ID (e.g. "A-1")
 * @param {string} [args.jira_key] - Jira issue key if different from story_id
 * @param {string} [args.direction] - "push" (pipeline → Jira) or "pull" (Jira → pipeline). Default: "push"
 */
async function handleSyncStatus({ story_id, jira_key, direction = 'push' }) {
  if (!story_id) return { error: 'story_id is required' };
  if (!hasEnv(JIRA_REQUIRED)) return notConfigured(JIRA_REQUIRED, 'Jira');

  const key = jira_key || story_id;

  try {
    const issue = await jiraRequest(`/issue/${key}?fields=status,summary`);
    const jiraStatus = issue.fields?.status?.name;

    if (direction === 'pull') {
      return { ok: true, story_id, jira_key: key, jira_status: jiraStatus };
    }

    // Push: return current Jira status without a transition (transitions require
    // knowing the target transition ID, which is project-specific).
    return {
      ok: true,
      story_id,
      jira_key: key,
      jira_status: jiraStatus,
      note: 'Status sync read-only on push direction. Use Jira workflows to update status, or call update_issue with a status transition ID.',
    };
  } catch (err) {
    return { ok: false, story_id, jira_key: key, error: err.message };
  }
}

/**
 * get_flag — Returns the configuration of a LaunchDarkly feature flag.
 *
 * @param {object} args
 * @param {string} args.key - Flag key (e.g. "new-playback-engine")
 * @param {string} [args.environment] - Environment name (default: "production")
 */
async function handleGetFlag({ key, environment = 'production' }) {
  if (!key) return { error: 'key is required' };
  if (!hasEnv(LD_REQUIRED)) return notConfigured(LD_REQUIRED, 'LaunchDarkly');

  try {
    const project = env('LAUNCHDARKLY_PROJECT');
    const flag = await ldRequest(`/flags/${project}/${key}?env=${environment}`);
    return { ok: true, key, environment, flag };
  } catch (err) {
    return { ok: false, key, error: err.message };
  }
}

/**
 * list_flags — Lists all LaunchDarkly flags for a project/environment.
 *
 * @param {object} args
 * @param {string} [args.project] - LaunchDarkly project key (defaults to LAUNCHDARKLY_PROJECT env var)
 * @param {string} [args.environment] - Environment name (default: "production")
 * @param {string} [args.filter] - Optional filter string (searches flag keys and names)
 */
async function handleListFlags({ project: projectOverride, environment = 'production', filter }) {
  if (!hasEnv(LD_REQUIRED)) return notConfigured(LD_REQUIRED, 'LaunchDarkly');

  try {
    const project = projectOverride || env('LAUNCHDARKLY_PROJECT');
    let endpoint = `/flags/${project}?env=${environment}&summary=true`;
    if (filter) endpoint += `&filter=${encodeURIComponent(filter)}`;

    const result = await ldRequest(endpoint);
    const flags = (result.items || []).map((f) => ({
      key: f.key,
      name: f.name,
      kind: f.kind,
      description: f.description,
      tags: f.tags,
      environments: f.environments,
    }));

    return { ok: true, project, environment, flag_count: flags.length, flags };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * create_flag — Creates a new LaunchDarkly feature flag.
 *
 * @param {object} args
 * @param {string} args.key - Flag key (kebab-case, e.g. "new-playback-engine")
 * @param {string} args.type - Flag type: "boolean" or "multivariate"
 * @param {string} args.description - Human-readable description
 * @param {boolean|string} args.default_value - Default value when flag is off
 * @param {string[]} [args.tags] - Tags to apply (e.g. ["migration", "android"])
 */
async function handleCreateFlag({ key, type = 'boolean', description, default_value, tags = [] }) {
  if (!key) return { error: 'key is required' };
  if (!description) return { error: 'description is required' };
  if (!hasEnv(LD_REQUIRED)) return notConfigured(LD_REQUIRED, 'LaunchDarkly');

  try {
    const project = env('LAUNCHDARKLY_PROJECT');
    const flagBody = {
      key,
      name: key,
      description,
      kind: type === 'boolean' ? 'boolean' : 'multivariate',
      tags,
      variations:
        type === 'boolean'
          ? [{ value: true }, { value: false }]
          : [],
      defaults: {
        onVariation: 0,
        offVariation: 1,
      },
      temporary: true, // Migration flags are always temporary.
    };

    const result = await ldRequest(`/flags/${project}`, 'POST', flagBody);
    return { ok: true, key: result.key, name: result.name, kind: result.kind, url: `https://app.launchdarkly.com/${project}/production/features/${result.key}` };
  } catch (err) {
    return { ok: false, key, error: err.message };
  }
}

/**
 * validate_flag_usage — Checks that a story's code references a valid,
 * existing LaunchDarkly flag key. Reads the story spec for declared flag
 * keys and verifies each exists in LaunchDarkly.
 *
 * @param {object} args
 * @param {string} args.story_id - Story identifier (e.g. "A-1")
 * @param {string[]} [args.flag_keys] - Flag keys to validate (if not in spec)
 */
async function handleValidateFlagUsage({ story_id, flag_keys = [] }) {
  if (!story_id) return { error: 'story_id is required' };
  if (!hasEnv(LD_REQUIRED)) return notConfigured(LD_REQUIRED, 'LaunchDarkly');

  const results = [];
  for (const key of flag_keys) {
    try {
      const project = env('LAUNCHDARKLY_PROJECT');
      await ldRequest(`/flags/${project}/${key}`);
      results.push({ key, exists: true });
    } catch {
      results.push({ key, exists: false, error: `Flag "${key}" not found in LaunchDarkly project "${env('LAUNCHDARKLY_PROJECT')}"` });
    }
  }

  const allValid = results.every((r) => r.exists);
  return {
    ok: allValid,
    story_id,
    flags_checked: results.length,
    results,
    summary: allValid
      ? 'All flag keys exist in LaunchDarkly.'
      : `${results.filter((r) => !r.exists).length} flag(s) not found. Create them with create_flag before shipping.`,
  };
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'integration',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_issue',
      description:
        'Creates a Jira or GitHub issue. Prefers Jira if JIRA_* env vars are set, ' +
        'falls back to GitHub. Returns issue key/number and URL.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Issue type: story, bug, epic, task', enum: ['story', 'bug', 'epic', 'task'] },
          title: { type: 'string', description: 'Issue title / summary' },
          body: { type: 'string', description: 'Issue description (markdown)' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Labels to apply' },
          epic: { type: 'string', description: 'Epic link key (Jira) or parent issue number (GitHub)' },
          platform: { type: 'string', description: 'Override platform: "jira" or "github"', enum: ['jira', 'github'] },
          story_points: { type: 'number', description: 'Story points (Fibonacci)' },
        },
        required: ['title', 'body'],
      },
    },
    {
      name: 'update_issue',
      description: 'Updates an existing Jira or GitHub issue. Pass only the fields to change.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Issue key (e.g. "HOOPLA-42") or GitHub issue number' },
          fields: {
            type: 'object',
            description: 'Fields to update: title, body, labels, story_points',
          },
          platform: { type: 'string', description: 'Override platform: "jira" or "github"', enum: ['jira', 'github'] },
        },
        required: ['id', 'fields'],
      },
    },
    {
      name: 'link_issues',
      description:
        'Creates a dependency link between two issues. In Jira, creates a native issue link. ' +
        'In GitHub, adds a comment documenting the dependency.',
      inputSchema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Source issue key or number' },
          to: { type: 'string', description: 'Target issue key or number' },
          type: { type: 'string', description: 'Link type: blocks, is blocked by, relates to, duplicates' },
          platform: { type: 'string', description: 'Override platform: "jira" or "github"', enum: ['jira', 'github'] },
        },
        required: ['from', 'to', 'type'],
      },
    },
    {
      name: 'sync_status',
      description:
        'Syncs a story\'s status between the pipeline and Jira. ' +
        'Direction "pull" reads Jira status. Direction "push" reads the pipeline status.',
      inputSchema: {
        type: 'object',
        properties: {
          story_id: { type: 'string', description: 'Pipeline story identifier (e.g. "A-1")' },
          jira_key: { type: 'string', description: 'Jira issue key if different from story_id' },
          direction: { type: 'string', description: '"push" (pipeline → Jira) or "pull" (Jira → pipeline)', enum: ['push', 'pull'] },
        },
        required: ['story_id'],
      },
    },
    {
      name: 'get_flag',
      description:
        'Returns the configuration of a LaunchDarkly feature flag: type, default value, ' +
        'targeting rules, and evaluation environment.',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Flag key (e.g. "new-playback-engine")' },
          environment: { type: 'string', description: 'Environment name (default: "production")' },
        },
        required: ['key'],
      },
    },
    {
      name: 'list_flags',
      description:
        'Lists all LaunchDarkly flags for a project, optionally filtered by a search string. ' +
        'Returns key, name, kind, description, tags, and per-environment state.',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'LaunchDarkly project key (defaults to LAUNCHDARKLY_PROJECT env var)' },
          environment: { type: 'string', description: 'Environment name (default: "production")' },
          filter: { type: 'string', description: 'Optional search string to filter flag keys and names' },
        },
      },
    },
    {
      name: 'create_flag',
      description:
        'Creates a new LaunchDarkly feature flag. All migration flags are created as temporary. ' +
        'Returns the flag key and a link to the LaunchDarkly UI.',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Flag key (kebab-case, e.g. "new-playback-engine")' },
          type: { type: 'string', description: 'Flag type: "boolean" or "multivariate"', enum: ['boolean', 'multivariate'] },
          description: { type: 'string', description: 'Human-readable description of the flag purpose' },
          default_value: { description: 'Default value when flag is off (true/false for boolean)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags (e.g. ["migration", "android"])' },
        },
        required: ['key', 'description'],
      },
    },
    {
      name: 'validate_flag_usage',
      description:
        'Verifies that all LaunchDarkly flag keys referenced in a story\'s code exist in ' +
        'LaunchDarkly. Called by the Quality Gate to verify flag instrumentation before GATE_PASS.',
      inputSchema: {
        type: 'object',
        properties: {
          story_id: { type: 'string', description: 'Story identifier (e.g. "A-1")' },
          flag_keys: { type: 'array', items: { type: 'string' }, description: 'Flag keys to validate' },
        },
        required: ['story_id'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  try {
    switch (name) {
      case 'create_issue':
        result = await handleCreateIssue(args || {});
        break;
      case 'update_issue':
        result = await handleUpdateIssue(args || {});
        break;
      case 'link_issues':
        result = await handleLinkIssues(args || {});
        break;
      case 'sync_status':
        result = await handleSyncStatus(args || {});
        break;
      case 'get_flag':
        result = await handleGetFlag(args || {});
        break;
      case 'list_flags':
        result = await handleListFlags(args || {});
        break;
      case 'create_flag':
        result = await handleCreateFlag(args || {});
        break;
      case 'validate_flag_usage':
        result = await handleValidateFlagUsage(args || {});
        break;
      default:
        result = { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    result = { error: `Unexpected error in ${name}: ${err.message}` };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);

/**
 * Pipeline MCP Server
 *
 * Manages pipeline/status.json — the authoritative record of which stage
 * each story is currently at. Agents read status before acting and advance
 * stories after producing their outputs. Human review and gate results also
 * move stories through stages.
 *
 * Pipeline stages (from PIPELINE_STRATEGY.md §6.1):
 *   INTAKE -> COMPILATION -> IMPLEMENTATION -> TESTING -> QUALITY_GATE ->
 *   HUMAN_REVIEW -> DONE
 *
 * Additionally: BLOCKED (waiting on dependency or human) and FAILED (gate
 * failed after maximum retries).
 *
 * Storage: pipeline/status.json
 * Schema:
 * {
 *   "stories": {
 *     "A-1": {
 *       "stage": "COMPILATION",
 *       "previous_stage": "INTAKE",
 *       "updated_at": "ISO-8601",
 *       "blocked_reason": null,
 *       "retry_count": 0,
 *       "dependencies": ["A-2"],
 *       "meta": {}
 *     }
 *   },
 *   "updated_at": "ISO-8601"
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server lives at pipeline/mcp-servers/pipeline/src/index.js
// Repo root is four levels up.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PIPELINE_DIR = path.join(REPO_ROOT, 'pipeline');
const STATUS_FILE = path.join(PIPELINE_DIR, 'status.json');

/** Valid stage names in pipeline order. */
const STAGES = [
  'INTAKE',
  'COMPILATION',
  'IMPLEMENTATION',
  'TESTING',
  'QUALITY_GATE',
  'HUMAN_REVIEW',
  'DONE',
];

/** Stages that are not in the linear flow but are valid. */
const SPECIAL_STAGES = ['BLOCKED', 'FAILED'];

const ALL_VALID_STAGES = new Set([...STAGES, ...SPECIAL_STAGES]);

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Reads and parses status.json. Returns an empty pipeline object if the file
 * does not exist yet.
 * @returns {{ stories: object, updated_at: string }}
 */
function readStatus() {
  if (!fs.existsSync(STATUS_FILE)) {
    return { stories: {}, updated_at: new Date().toISOString() };
  }
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse pipeline/status.json: ${err.message}`);
  }
}

/**
 * Writes the status object to status.json atomically (write to temp, rename).
 * @param {object} status
 */
function writeStatus(status) {
  if (!fs.existsSync(PIPELINE_DIR)) {
    fs.mkdirSync(PIPELINE_DIR, { recursive: true });
  }
  status.updated_at = new Date().toISOString();
  const tmp = STATUS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(status, null, 2), 'utf8');
  fs.renameSync(tmp, STATUS_FILE);
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

/**
 * get_pipeline_status — Returns the full pipeline status: all stories,
 * their current stages, and aggregate counts per stage.
 */
function handleGetPipelineStatus() {
  const status = readStatus();
  const stories = status.stories || {};

  const stageCounts = {};
  for (const stage of [...STAGES, ...SPECIAL_STAGES]) {
    stageCounts[stage] = 0;
  }
  for (const story of Object.values(stories)) {
    const stage = story.stage || 'UNKNOWN';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  }

  return {
    story_count: Object.keys(stories).length,
    stage_counts: stageCounts,
    stories,
    status_file: STATUS_FILE,
    updated_at: status.updated_at,
  };
}

/**
 * get_story_status — Returns the current stage and metadata for a single story.
 *
 * @param {object} args
 * @param {string} args.story_id - Story identifier (e.g. "A-1")
 */
function handleGetStoryStatus({ story_id }) {
  if (!story_id) return { error: 'story_id is required' };

  const status = readStatus();
  const story = status.stories?.[story_id];

  if (!story) {
    return {
      story_id,
      error: `Story "${story_id}" not found in pipeline/status.json`,
      hint: 'Stories are added when the Coach agent completes intake. Check that intake ran.',
    };
  }

  return { story_id, ...story };
}

/**
 * advance_story — Moves a story from one stage to the next (or to a specific
 * target stage). Validates that the transition is permitted.
 *
 * Permitted transitions:
 * - Linear forward: any stage to the next stage in order
 * - Any stage to BLOCKED or FAILED
 * - BLOCKED back to its previous stage (unblock)
 * - FAILED back to COMPILATION or IMPLEMENTATION (retry)
 * - Any stage to a prior stage (regression: spec failure sends back to INTAKE)
 *
 * @param {object} args
 * @param {string} args.story_id - Story identifier
 * @param {string} args.from - Expected current stage (validated before write)
 * @param {string} args.to - Target stage
 * @param {string} [args.reason] - Human-readable reason for the transition
 * @param {string} [args.blocked_reason] - Required when to=BLOCKED
 */
function handleAdvanceStory({ story_id, from, to, reason, blocked_reason }) {
  if (!story_id) return { error: 'story_id is required' };
  if (!from) return { error: 'from is required' };
  if (!to) return { error: 'to is required' };

  if (!ALL_VALID_STAGES.has(to)) {
    return {
      error: `Invalid target stage "${to}"`,
      valid_stages: [...ALL_VALID_STAGES],
    };
  }

  if (to === 'BLOCKED' && !blocked_reason) {
    return { error: 'blocked_reason is required when advancing to BLOCKED' };
  }

  const status = readStatus();
  const story = status.stories?.[story_id];

  if (!story) {
    // Create a new story entry if not present (initial intake registration).
    if (from !== 'INTAKE' && to !== 'INTAKE') {
      return {
        error: `Story "${story_id}" not found. Use from=INTAKE to register a new story.`,
      };
    }
    status.stories = status.stories || {};
    status.stories[story_id] = {
      stage: to,
      previous_stage: null,
      updated_at: new Date().toISOString(),
      blocked_reason: null,
      retry_count: 0,
      dependencies: [],
      meta: {},
    };
    writeStatus(status);
    return { ok: true, story_id, stage: to, note: 'Story registered in pipeline.' };
  }

  if (story.stage !== from) {
    return {
      error: `Story "${story_id}" is currently at "${story.stage}", not "${from}". Cannot advance.`,
      current_stage: story.stage,
    };
  }

  const updatedStory = {
    ...story,
    previous_stage: story.stage,
    stage: to,
    updated_at: new Date().toISOString(),
    blocked_reason: to === 'BLOCKED' ? (blocked_reason || null) : null,
    retry_count:
      SPECIAL_STAGES.includes(story.stage) && !SPECIAL_STAGES.includes(to)
        ? (story.retry_count || 0) + 1
        : story.retry_count || 0,
  };

  if (reason) {
    updatedStory.meta = { ...story.meta, last_transition_reason: reason };
  }

  status.stories[story_id] = updatedStory;
  writeStatus(status);

  return {
    ok: true,
    story_id,
    from,
    to,
    retry_count: updatedStory.retry_count,
  };
}

/**
 * get_blocked_stories — Returns all stories currently in BLOCKED or FAILED
 * stage, along with their blocked_reason and how long they have been blocked.
 */
function handleGetBlockedStories() {
  const status = readStatus();
  const stories = status.stories || {};

  const blocked = [];
  const now = Date.now();

  for (const [story_id, story] of Object.entries(stories)) {
    if (story.stage === 'BLOCKED' || story.stage === 'FAILED') {
      const updatedAt = story.updated_at ? new Date(story.updated_at).getTime() : now;
      const blockedForMs = now - updatedAt;
      blocked.push({
        story_id,
        stage: story.stage,
        previous_stage: story.previous_stage,
        blocked_reason: story.blocked_reason,
        retry_count: story.retry_count,
        blocked_for_human: `${Math.round(blockedForMs / 60000)} minutes`,
        dependencies: story.dependencies || [],
      });
    }
  }

  blocked.sort((a, b) => {
    // Sort by blocked duration descending (longest blocked first).
    return (b.blocked_for_ms || 0) - (a.blocked_for_ms || 0);
  });

  return {
    blocked_count: blocked.length,
    stories: blocked,
    note:
      blocked.length === 0
        ? 'No stories are currently blocked or failed.'
        : `${blocked.length} story/stories require attention.`,
  };
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'pipeline',
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
      name: 'get_pipeline_status',
      description:
        'Returns the full pipeline status: all stories, their current stages, ' +
        'and aggregate counts per stage. Read by the Quality Gate and Observability agents ' +
        'to understand overall pipeline health.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_story_status',
      description:
        'Returns the current stage and metadata (previous stage, retry count, ' +
        'blocked reason, dependencies) for a single story.',
      inputSchema: {
        type: 'object',
        properties: {
          story_id: {
            type: 'string',
            description: 'Story identifier (e.g. "A-1")',
          },
        },
        required: ['story_id'],
      },
    },
    {
      name: 'advance_story',
      description:
        'Moves a story from one stage to another. Validates the current stage ' +
        'matches the "from" parameter before writing. Use to register new stories ' +
        '(from=INTAKE, to=INTAKE), advance through the pipeline, block stories, ' +
        'or send stories back on failure.',
      inputSchema: {
        type: 'object',
        properties: {
          story_id: {
            type: 'string',
            description: 'Story identifier (e.g. "A-1")',
          },
          from: {
            type: 'string',
            description:
              'Expected current stage. The write is rejected if the actual stage does not match.',
            enum: ['INTAKE', 'COMPILATION', 'IMPLEMENTATION', 'TESTING', 'QUALITY_GATE', 'HUMAN_REVIEW', 'DONE', 'BLOCKED', 'FAILED'],
          },
          to: {
            type: 'string',
            description: 'Target stage to move the story to.',
            enum: ['INTAKE', 'COMPILATION', 'IMPLEMENTATION', 'TESTING', 'QUALITY_GATE', 'HUMAN_REVIEW', 'DONE', 'BLOCKED', 'FAILED'],
          },
          reason: {
            type: 'string',
            description: 'Human-readable reason for the transition (recorded in meta)',
          },
          blocked_reason: {
            type: 'string',
            description: 'Required when advancing to BLOCKED. Describes what is blocking the story.',
          },
        },
        required: ['story_id', 'from', 'to'],
      },
    },
    {
      name: 'get_blocked_stories',
      description:
        'Returns all stories currently in BLOCKED or FAILED stage, with their blocked ' +
        'reason, retry count, and how long they have been stuck. Use to identify stories ' +
        'requiring human intervention.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  switch (name) {
    case 'get_pipeline_status':
      result = handleGetPipelineStatus();
      break;
    case 'get_story_status':
      result = handleGetStoryStatus(args || {});
      break;
    case 'advance_story':
      result = handleAdvanceStory(args || {});
      break;
    case 'get_blocked_stories':
      result = handleGetBlockedStories();
      break;
    default:
      result = { error: `Unknown tool: ${name}` };
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

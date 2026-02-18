/**
 * Observability MCP Server
 *
 * Manages the append-only JSONL event log at pipeline/observability/events.jsonl.
 * Every pipeline agent writes events through log_event. The Observability Agent
 * reads backward traces through get_trace and get_events. get_dashboard surfaces
 * summary metrics for throughput, cycle time, and gate pass rates.
 *
 * Event schema (from PIPELINE_STRATEGY.md §8.1):
 * {
 *   "timestamp": "ISO-8601",
 *   "agent": "spec-compiler",
 *   "action": "compile_spec",
 *   "story_id": "A-1",
 *   "input_refs": ["pipeline/intake/stories-draft.md#A-1"],
 *   "output_refs": ["pipeline/specs/A-1/spec.md"],
 *   "decision": "Classified as KMP extraction based on module-classifications.md",
 *   "confidence": "high",
 *   "duration_ms": 12400
 * }
 *
 * Storage: pipeline/observability/events.jsonl — one JSON object per line,
 * never deleted or modified, only appended.
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

// Server lives at pipeline/mcp-servers/observability/src/index.js
// Repo root is four levels up.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const EVENTS_DIR = path.join(REPO_ROOT, 'pipeline', 'observability');
const EVENTS_FILE = path.join(EVENTS_DIR, 'events.jsonl');

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Ensures the observability directory and events file exist.
 */
function ensureStorage() {
  if (!fs.existsSync(EVENTS_DIR)) {
    fs.mkdirSync(EVENTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '', 'utf8');
  }
}

/**
 * Reads all events from events.jsonl, parsing each line as JSON.
 * Skips blank lines and lines that fail to parse (logs a warning).
 * @returns {Array<object>}
 */
function readAllEvents() {
  ensureStorage();
  const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
  const events = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // Corrupted line — skip but do not abort.
    }
  }
  return events;
}

/**
 * Appends a single event object as a JSON line to events.jsonl.
 * @param {object} event
 */
function appendEvent(event) {
  ensureStorage();
  const line = JSON.stringify(event) + '\n';
  fs.appendFileSync(EVENTS_FILE, line, 'utf8');
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

/**
 * log_event — Appends a structured event to the observability log.
 *
 * Required fields: agent, action, story_id.
 * Optional: input_refs, output_refs, decision, confidence, duration_ms, data.
 *
 * @param {object} args
 * @param {string} args.agent - Agent name (e.g. "spec-compiler")
 * @param {string} args.action - Action taken (e.g. "compile_spec")
 * @param {string} args.story_id - Story identifier (e.g. "A-1")
 * @param {object} [args.data] - Additional arbitrary event data
 */
function handleLogEvent(args) {
  const { agent, action, story_id, data = {} } = args;

  if (!agent) return { error: 'agent is required' };
  if (!action) return { error: 'action is required' };
  if (!story_id) return { error: 'story_id is required' };

  const event = {
    timestamp: new Date().toISOString(),
    agent,
    action,
    story_id,
    ...data,
  };

  try {
    appendEvent(event);
    return { ok: true, event };
  } catch (err) {
    return { error: `Failed to write event: ${err.message}` };
  }
}

/**
 * get_trace — Returns the full decision chain for a story_id in chronological
 * order. Used by the Observability Agent to reconstruct the backward trace
 * from a failing gate check back to PM intent.
 *
 * @param {object} args
 * @param {string} args.story_id - Story identifier to trace
 */
function handleGetTrace({ story_id }) {
  if (!story_id) return { error: 'story_id is required' };

  const events = readAllEvents();
  const trace = events.filter((e) => e.story_id === story_id);

  if (trace.length === 0) {
    return {
      story_id,
      events: [],
      note: `No events found for story_id "${story_id}". Check that the story has entered the pipeline.`,
    };
  }

  return {
    story_id,
    event_count: trace.length,
    events: trace,
  };
}

/**
 * get_events — Queries the event log with optional filters.
 * All filter fields are applied with AND logic.
 *
 * @param {object} args
 * @param {string} [args.agent] - Filter by agent name (exact match)
 * @param {string} [args.action] - Filter by action (exact match)
 * @param {string} [args.story_id] - Filter by story_id (exact match)
 * @param {string} [args.since] - ISO-8601 datetime; return only events at or after this time
 * @param {string} [args.until] - ISO-8601 datetime; return only events at or before this time
 * @param {number} [args.limit] - Maximum number of events to return (most recent first)
 */
function handleGetEvents({ agent, action, story_id, since, until, limit }) {
  let events = readAllEvents();

  if (agent) {
    events = events.filter((e) => e.agent === agent);
  }
  if (action) {
    events = events.filter((e) => e.action === action);
  }
  if (story_id) {
    events = events.filter((e) => e.story_id === story_id);
  }
  if (since) {
    const sinceTime = new Date(since).getTime();
    events = events.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
  }
  if (until) {
    const untilTime = new Date(until).getTime();
    events = events.filter((e) => new Date(e.timestamp).getTime() <= untilTime);
  }

  // Default: chronological. If limit is requested, return most recent.
  if (limit && limit > 0) {
    events = events.slice(-limit);
  }

  return {
    filter: { agent, action, story_id, since, until, limit },
    event_count: events.length,
    events,
  };
}

/**
 * get_dashboard — Returns summary metrics across the full event log.
 * Computes throughput, cycle time, gate pass rate, spec quality, and common
 * failures. Matches the metrics defined in PIPELINE_STRATEGY.md §8.3.
 */
function handleGetDashboard() {
  const events = readAllEvents();

  if (events.length === 0) {
    return {
      note: 'No events in the log yet. Events are written by pipeline agents as they work.',
      total_events: 0,
    };
  }

  // Collect unique story IDs
  const storyIds = [...new Set(events.filter((e) => e.story_id).map((e) => e.story_id))];

  // Gate verdicts
  const verdictEvents = events.filter((e) => e.action === 'gate_verdict');
  const passingVerdicts = verdictEvents.filter((e) => e.verdict === 'GATE_PASS');
  const gatePassRate =
    verdictEvents.length > 0
      ? Math.round((passingVerdicts.length / verdictEvents.length) * 100)
      : null;

  // Throughput: stories with a gate_verdict in the past 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentCompletions = verdictEvents.filter(
    (e) => e.verdict === 'GATE_PASS' && new Date(e.timestamp).getTime() >= oneDayAgo
  ).length;

  // Cycle time: median time from first agent_start to gate_verdict per story
  const cycleTimes = [];
  for (const storyId of storyIds) {
    const storyEvents = events.filter((e) => e.story_id === storyId);
    const start = storyEvents.find((e) => e.action === 'agent_start');
    const end = storyEvents.slice().reverse().find((e) => e.action === 'gate_verdict');
    if (start && end) {
      const ms = new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime();
      cycleTimes.push(ms);
    }
  }
  cycleTimes.sort((a, b) => a - b);
  const medianCycleTimeMs =
    cycleTimes.length > 0 ? cycleTimes[Math.floor(cycleTimes.length / 2)] : null;

  // Common failures: histogram of gate_check failures
  const failedChecks = events.filter(
    (e) => e.action === 'gate_check' && e.result === 'FAIL'
  );
  const failureHistogram = {};
  for (const e of failedChecks) {
    const name = e.check_name || 'unknown';
    failureHistogram[name] = (failureHistogram[name] || 0) + 1;
  }
  const sortedFailures = Object.entries(failureHistogram)
    .sort(([, a], [, b]) => b - a)
    .map(([check_name, count]) => ({ check_name, count }));

  // Spec quality: percent of stories where gate passed on first attempt
  // (no GATE_FAIL before GATE_PASS)
  let firstAttemptPasses = 0;
  for (const storyId of storyIds) {
    const storyVerdicts = events
      .filter((e) => e.story_id === storyId && e.action === 'gate_verdict')
      .map((e) => e.verdict);
    if (storyVerdicts.length > 0 && storyVerdicts[0] === 'GATE_PASS') {
      firstAttemptPasses++;
    }
  }
  const specQuality =
    storyIds.length > 0
      ? Math.round((firstAttemptPasses / storyIds.length) * 100)
      : null;

  return {
    total_events: events.length,
    total_stories: storyIds.length,
    throughput_last_24h: recentCompletions,
    median_cycle_time_ms: medianCycleTimeMs,
    median_cycle_time_human:
      medianCycleTimeMs !== null
        ? `${Math.round(medianCycleTimeMs / 60000)} minutes`
        : null,
    gate_pass_rate_pct: gatePassRate,
    spec_quality_pct: specQuality,
    common_failures: sortedFailures,
    story_ids: storyIds,
  };
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'observability',
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
      name: 'log_event',
      description:
        'Appends a structured event to the observability log (pipeline/observability/events.jsonl). ' +
        'Every pipeline agent must call this to record decisions, artifact reads/writes, gate checks, ' +
        'and human actions. The log is append-only and never modified.',
      inputSchema: {
        type: 'object',
        properties: {
          agent: {
            type: 'string',
            description:
              'Name of the agent writing the event (e.g. "spec-compiler", "coding-agent", "quality-gate")',
          },
          action: {
            type: 'string',
            description:
              'Action taken. Standard values: agent_start, decision, artifact_write, artifact_read, ' +
              'question, gate_check, gate_verdict, human_action. Custom values are allowed.',
          },
          story_id: {
            type: 'string',
            description: 'Story identifier this event belongs to (e.g. "A-1")',
          },
          data: {
            type: 'object',
            description:
              'Additional event fields: input_refs (array), output_refs (array), decision (string), ' +
              'confidence (string), duration_ms (number), check_name (string), result (string), ' +
              'verdict (string), failing_checks (array), etc.',
          },
        },
        required: ['agent', 'action', 'story_id'],
      },
    },
    {
      name: 'get_trace',
      description:
        'Returns the full decision chain for a story_id in chronological order. ' +
        'Used by the Observability Agent to trace backward from a failing gate check ' +
        'to the original PM intent.',
      inputSchema: {
        type: 'object',
        properties: {
          story_id: {
            type: 'string',
            description: 'Story identifier to trace (e.g. "A-1")',
          },
        },
        required: ['story_id'],
      },
    },
    {
      name: 'get_events',
      description:
        'Queries the event log with optional filters on agent, action, story_id, ' +
        'and time range. All filters are combined with AND logic.',
      inputSchema: {
        type: 'object',
        properties: {
          agent: {
            type: 'string',
            description: 'Filter by agent name (exact match)',
          },
          action: {
            type: 'string',
            description: 'Filter by action (exact match)',
          },
          story_id: {
            type: 'string',
            description: 'Filter by story_id (exact match)',
          },
          since: {
            type: 'string',
            description: 'ISO-8601 datetime; return only events at or after this time',
          },
          until: {
            type: 'string',
            description: 'ISO-8601 datetime; return only events at or before this time',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of events to return (most recent first)',
          },
        },
      },
    },
    {
      name: 'get_dashboard',
      description:
        'Returns summary metrics across the full event log: throughput, median cycle time, ' +
        'gate pass rate, spec quality (first-attempt pass rate), and a histogram of common ' +
        'gate check failures.',
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
    case 'log_event':
      result = handleLogEvent(args || {});
      break;
    case 'get_trace':
      result = handleGetTrace(args || {});
      break;
    case 'get_events':
      result = handleGetEvents(args || {});
      break;
    case 'get_dashboard':
      result = handleGetDashboard();
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

/**
 * Analytics MCP Server — PLACEHOLDER
 *
 * The client (Midwest Tape / Hoopla Digital) has a custom analytics
 * implementation. The specifics — platform, event schema, API surface, and
 * instrumentation patterns — are unknown until repository access is granted.
 *
 * All tools in this server return a NOT_CONFIGURED status with guidance on
 * what must be discovered before the tool can be implemented. No analytics
 * data is read or written.
 *
 * Phased adoption (from PIPELINE_STRATEGY.md §5.7):
 *   Phase 1 (now): This placeholder. Coach references analytics qualitatively.
 *     Specs include an "Analytics events" section even without server access.
 *   Phase 2 (after repo access): Codebase Analyst maps existing instrumentation
 *     into pipeline/state/analytics-inventory.md. This placeholder is updated
 *     to read from that file.
 *   Phase 3 (when API understood): Full implementation. Structured access
 *     for all agents. This placeholder is replaced with live data.
 *
 * To activate a tool: remove its placeholder implementation and add the real
 * logic. Update the PLACEHOLDER_STATUS constant and the relevant tool's
 * description to remove the placeholder warning.
 *
 * What to discover during Phase 2:
 *   - Analytics platform (Mixpanel, Amplitude, Segment, custom, etc.)
 *   - Event schema format and naming conventions
 *   - Whether a REST/GraphQL API exists for querying historical data
 *   - SDK version and initialization patterns in the Android/iOS/web codebases
 *   - Which events are server-side vs client-side
 *   - Funnel definitions and standard reports
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

// Server lives at pipeline/mcp-servers/analytics/src/index.js
// Repo root is four levels up.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const STATE_DIR = path.join(REPO_ROOT, 'pipeline', 'state');
const ANALYTICS_INVENTORY_FILE = path.join(STATE_DIR, 'analytics-inventory.md');

/** Current implementation phase. Update when the analytics platform is understood. */
const PLACEHOLDER_STATUS = {
  phase: 1,
  status: 'NOT_CONFIGURED',
  reason:
    'The Hoopla Digital analytics implementation is custom. Repo access is required to ' +
    'map the event schema, SDK usage, and available query APIs.',
  next_steps: [
    'Grant repo access to the Codebase Analyst.',
    'Codebase Analyst searches for analytics SDK imports (e.g. import Mixpanel, amplitude.track, analytics.logEvent).',
    'Codebase Analyst documents findings in pipeline/state/analytics-inventory.md.',
    'Update this server to read analytics-inventory.md (Phase 2).',
    'If a query API is available, implement live data tools (Phase 3).',
  ],
};

// ---------------------------------------------------------------------------
// Shared helper: return not-configured result for a tool
// ---------------------------------------------------------------------------

/**
 * Returns a standard NOT_CONFIGURED result for a placeholder tool.
 * @param {string} toolName - The name of the tool being called
 * @param {string} purpose - One sentence describing what this tool will do when implemented
 * @param {string[]} [discoveryQuestions] - Questions to answer during Phase 2
 * @returns {object}
 */
function placeholderResult(toolName, purpose, discoveryQuestions = []) {
  // Check whether analytics-inventory.md exists — if so, note it for the caller.
  const inventoryExists = fs.existsSync(ANALYTICS_INVENTORY_FILE);
  const inventoryNote = inventoryExists
    ? 'pipeline/state/analytics-inventory.md exists. Update this server to read it.'
    : 'pipeline/state/analytics-inventory.md does not yet exist. The Codebase Analyst must create it.';

  return {
    ok: false,
    tool: toolName,
    status: 'NOT_CONFIGURED',
    phase: PLACEHOLDER_STATUS.phase,
    purpose,
    reason: PLACEHOLDER_STATUS.reason,
    inventory_status: inventoryNote,
    discovery_questions: discoveryQuestions.length > 0 ? discoveryQuestions : undefined,
    next_steps: PLACEHOLDER_STATUS.next_steps,
  };
}

// ---------------------------------------------------------------------------
// Tool handlers (all placeholders)
// ---------------------------------------------------------------------------

/**
 * get_analytics_events — Returns existing analytics events for a screen or flow.
 * Placeholder: will read from pipeline/state/analytics-inventory.md (Phase 2)
 * and query the analytics API (Phase 3).
 *
 * @param {object} args
 * @param {string} [args.screen] - Screen or flow name
 */
function handleGetAnalyticsEvents({ screen }) {
  return placeholderResult(
    'get_analytics_events',
    'Returns existing analytics events fired by a screen or user flow, including event names, ' +
      'properties, and whether they are server-side or client-side.',
    [
      `What analytics SDK is used in the ${screen || 'app'} codebase (search for analytics.track, logEvent, etc.)?`,
      'What naming convention is used for event names (snake_case, camelCase, dot.notation)?',
      'Are events defined in a central registry file, or scattered across the codebase?',
      `What events are fired on the ${screen || 'target'} screen?`,
    ]
  );
}

/**
 * get_usage_metrics — Returns usage data for a feature.
 * Placeholder: requires analytics API access.
 *
 * @param {object} args
 * @param {string} [args.feature] - Feature name
 */
function handleGetUsageMetrics({ feature }) {
  return placeholderResult(
    'get_usage_metrics',
    'Returns usage data for a feature: daily/monthly active users, session frequency, ' +
      'and engagement trends. Requires analytics API query access.',
    [
      `Does the analytics platform (once identified) expose a REST or GraphQL API for querying historical data?`,
      `What is the data retention period?`,
      `What are the key engagement metrics tracked for ${feature || 'features'} (e.g. views, clicks, completions)?`,
    ]
  );
}

/**
 * get_funnel — Returns conversion and drop-off data for a user flow.
 * Placeholder: requires analytics API access and funnel definitions.
 *
 * @param {object} args
 * @param {string} args.flow_name - Name of the user flow
 */
function handleGetFunnel({ flow_name }) {
  return placeholderResult(
    'get_funnel',
    'Returns conversion and drop-off rates for a named user flow ' +
      '(e.g. "onboarding", "checkout", "content-discovery").',
    [
      `Is "${flow_name || 'the target flow'}" defined as a funnel in the analytics platform?`,
      'Are funnel steps tracked as individual events or as a server-side sequence?',
      'What is the time window for funnel completion (session-based vs multi-day)?',
    ]
  );
}

/**
 * validate_instrumentation — Checks that new code includes required analytics events.
 * Placeholder: requires analytics-inventory.md to define the expected events.
 *
 * @param {object} args
 * @param {string} args.story_id - Story identifier
 */
function handleValidateInstrumentation({ story_id }) {
  return placeholderResult(
    'validate_instrumentation',
    'Checks that code generated for a story includes the analytics events declared in the ' +
      'spec\'s "Analytics events" section and that event names/properties match the inventory.',
    [
      'Does pipeline/state/analytics-inventory.md exist with the expected event list?',
      `Does the spec for "${story_id || 'the target story'}" include an "Analytics events" section?`,
      'What SDK call pattern is used to fire events (search for this in the codebase)?',
    ]
  );
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'analytics',
    version: '0.1.0',
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
      name: 'get_analytics_events',
      description:
        '[PLACEHOLDER — NOT YET CONFIGURED] ' +
        'Will return existing analytics events for a screen or flow, including event names, ' +
        'properties, and client-side vs server-side origin. ' +
        'Requires repo access and analytics platform discovery (Phase 2). ' +
        'Returns NOT_CONFIGURED with discovery guidance.',
      inputSchema: {
        type: 'object',
        properties: {
          screen: {
            type: 'string',
            description: 'Optional screen or flow name to filter events',
          },
        },
      },
    },
    {
      name: 'get_usage_metrics',
      description:
        '[PLACEHOLDER — NOT YET CONFIGURED] ' +
        'Will return usage data for a feature: DAU/MAU, session frequency, engagement trends. ' +
        'Requires analytics API access (Phase 3). ' +
        'Returns NOT_CONFIGURED with discovery guidance.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Optional feature name to filter metrics',
          },
        },
      },
    },
    {
      name: 'get_funnel',
      description:
        '[PLACEHOLDER — NOT YET CONFIGURED] ' +
        'Will return conversion and drop-off data for a named user flow. ' +
        'Requires analytics API access and funnel definitions (Phase 3). ' +
        'Returns NOT_CONFIGURED with discovery guidance.',
      inputSchema: {
        type: 'object',
        properties: {
          flow_name: {
            type: 'string',
            description: 'Name of the user flow (e.g. "onboarding", "content-discovery")',
          },
        },
        required: ['flow_name'],
      },
    },
    {
      name: 'validate_instrumentation',
      description:
        '[PLACEHOLDER — NOT YET CONFIGURED] ' +
        'Will verify that code generated for a story includes the analytics events declared ' +
        'in the spec\'s "Analytics events" section. ' +
        'Requires analytics-inventory.md (Phase 2). ' +
        'Returns NOT_CONFIGURED with discovery guidance.',
      inputSchema: {
        type: 'object',
        properties: {
          story_id: {
            type: 'string',
            description: 'Story identifier to validate (e.g. "A-1")',
          },
        },
        required: ['story_id'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  switch (name) {
    case 'get_analytics_events':
      result = handleGetAnalyticsEvents(args || {});
      break;
    case 'get_usage_metrics':
      result = handleGetUsageMetrics(args || {});
      break;
    case 'get_funnel':
      result = handleGetFunnel(args || {});
      break;
    case 'validate_instrumentation':
      result = handleValidateInstrumentation(args || {});
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

/**
 * Current-State MCP Server
 *
 * Exposes the Codebase Analyst's current-state model to pipeline agents.
 * All data is read from pipeline/state/ — maintained exclusively by the
 * Codebase Analyst agent (write access) and read by all other agents.
 *
 * Data sources:
 *   pipeline/state/module-classifications.md
 *   pipeline/state/dependency-graph.json
 *   pipeline/state/test-coverage.md
 *   pipeline/state/architecture-audit.md
 *   pipeline/state/wcag-audit.md
 *   pipeline/state/cross-platform-mapping.md
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

// Resolve the pipeline/state directory relative to repo root.
// Server lives at pipeline/mcp-servers/current-state/src/index.js,
// so repo root is four levels up.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const STATE_DIR = path.join(REPO_ROOT, 'pipeline', 'state');

// ---------------------------------------------------------------------------
// File reading helpers
// ---------------------------------------------------------------------------

/**
 * Reads a file from pipeline/state/, returning its string content.
 * Returns null if the file does not exist.
 * @param {string} filename
 * @returns {string|null}
 */
function readStateFile(filename) {
  const filePath = path.join(STATE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Parses a JSON state file, returning the parsed object.
 * Returns null if the file does not exist.
 * @param {string} filename
 * @returns {object|null}
 */
function readStateJson(filename) {
  const content = readStateFile(filename);
  if (content === null) return null;
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse ${filename}: ${err.message}`);
  }
}

/**
 * Extracts module sections from module-classifications.md.
 *
 * The file is expected to use level-2 or level-3 headings per module.
 * Each section is parsed into a plain object with fields extracted from
 * the markdown body (key: value pairs on their own lines).
 *
 * @returns {Array<{name: string, raw: string, fields: object}>}
 */
function parseModuleClassifications() {
  const content = readStateFile('module-classifications.md');
  if (!content) return [];

  const modules = [];
  // Split on H2 or H3 headings that look like module names
  const sections = content.split(/\n(?=#{2,3}\s)/);

  for (const section of sections) {
    const headingMatch = section.match(/^#{2,3}\s+(.+)/);
    if (!headingMatch) continue;

    const name = headingMatch[1].trim();
    const fields = {};

    // Parse "**Key:** Value" or "- **Key:** Value" patterns
    const fieldPattern = /\*\*([^*]+)\*\*[:\s]+(.+)/g;
    let match;
    while ((match = fieldPattern.exec(section)) !== null) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      fields[key] = match[2].trim();
    }

    // Parse bullet list items as arrays where applicable
    const listItems = [];
    const listPattern = /^[ \t]*[-*]\s+(?!\*\*)(.+)/gm;
    while ((match = listPattern.exec(section)) !== null) {
      listItems.push(match[1].trim());
    }
    if (listItems.length > 0) {
      fields._list_items = listItems;
    }

    modules.push({ name, raw: section, fields });
  }

  return modules;
}

/**
 * Extracts sections from a markdown file by H2/H3 headings.
 * @param {string} filename
 * @returns {Array<{heading: string, content: string}>}
 */
function parseMarkdownSections(filename) {
  const content = readStateFile(filename);
  if (!content) return [];

  const sections = [];
  const parts = content.split(/\n(?=#{2,3}\s)/);

  for (const part of parts) {
    const headingMatch = part.match(/^(#{2,3})\s+(.+)/);
    if (!headingMatch) continue;
    sections.push({
      heading: headingMatch[2].trim(),
      content: part.trim(),
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

/**
 * get_module — Returns classification, CLEAN layer, dependencies, file list,
 * and recent changes for a named module.
 *
 * @param {string} name - Module name (case-insensitive partial match supported)
 */
function handleGetModule({ name }) {
  if (!name) {
    return { error: 'name parameter is required' };
  }

  const modules = parseModuleClassifications();
  if (modules.length === 0) {
    return {
      error: 'module-classifications.md not found in pipeline/state/',
      hint: 'The Codebase Analyst must run first to populate this file.',
    };
  }

  const lower = name.toLowerCase();
  const match = modules.find(
    (m) =>
      m.name.toLowerCase() === lower ||
      m.name.toLowerCase().includes(lower) ||
      lower.includes(m.name.toLowerCase())
  );

  if (!match) {
    return {
      error: `Module "${name}" not found in module-classifications.md`,
      available_modules: modules.map((m) => m.name),
    };
  }

  return {
    module_name: match.name,
    fields: match.fields,
    raw_section: match.raw,
  };
}

/**
 * get_dependency_graph — Returns dependency-graph.json, optionally filtered
 * to a single module's upstream and downstream dependencies.
 *
 * @param {string|undefined} module - Optional module name to filter by
 */
function handleGetDependencyGraph({ module: moduleName }) {
  const graph = readStateJson('dependency-graph.json');
  if (!graph) {
    return {
      error: 'dependency-graph.json not found in pipeline/state/',
      hint: 'The Codebase Analyst must run first to populate this file.',
    };
  }

  if (!moduleName) {
    return graph;
  }

  // Filter to the requested module and its direct connections
  const lower = moduleName.toLowerCase();
  const filtered = {
    module: moduleName,
    upstream: [],
    downstream: [],
    all_connections: {},
  };

  for (const [key, value] of Object.entries(graph)) {
    if (key.toLowerCase().includes(lower)) {
      filtered.all_connections[key] = value;
    }
  }

  // If graph has explicit nodes/edges format
  if (graph.nodes && graph.edges) {
    const matchingNodes = graph.nodes.filter((n) =>
      (n.id || n.name || '').toLowerCase().includes(lower)
    );
    filtered.nodes = matchingNodes;
    filtered.edges = graph.edges.filter(
      (e) =>
        matchingNodes.some((n) => n.id === e.from || n.id === e.source) ||
        matchingNodes.some((n) => n.id === e.to || n.id === e.target)
    );
  }

  return filtered;
}

/**
 * get_test_coverage — Returns test coverage data for all modules or a
 * specific module.
 *
 * @param {string|undefined} module - Optional module name to filter by
 */
function handleGetTestCoverage({ module: moduleName }) {
  const content = readStateFile('test-coverage.md');
  if (!content) {
    return {
      error: 'test-coverage.md not found in pipeline/state/',
      hint: 'The Codebase Analyst must run first to populate this file.',
    };
  }

  if (!moduleName) {
    return { raw_content: content };
  }

  const sections = parseMarkdownSections('test-coverage.md');
  const lower = moduleName.toLowerCase();
  const matching = sections.filter((s) => s.heading.toLowerCase().includes(lower));

  if (matching.length === 0) {
    return {
      error: `No test coverage data found for module "${moduleName}"`,
      available_sections: sections.map((s) => s.heading),
    };
  }

  return {
    module: moduleName,
    sections: matching,
  };
}

/**
 * get_architecture_patterns — Returns current and target architecture patterns
 * for a module from architecture-audit.md.
 *
 * @param {string} module - Module name
 */
function handleGetArchitecturePatterns({ module: moduleName }) {
  if (!moduleName) {
    return { error: 'module parameter is required' };
  }

  const content = readStateFile('architecture-audit.md');
  if (!content) {
    return {
      error: 'architecture-audit.md not found in pipeline/state/',
      hint: 'The Codebase Analyst must run first to populate this file.',
    };
  }

  const sections = parseMarkdownSections('architecture-audit.md');
  const lower = moduleName.toLowerCase();
  const matching = sections.filter((s) => s.heading.toLowerCase().includes(lower));

  if (matching.length === 0) {
    // Return global/top-level patterns if module-specific section not found
    return {
      module: moduleName,
      note: 'No module-specific section found; returning full architecture audit.',
      raw_content: content,
    };
  }

  return {
    module: moduleName,
    sections: matching,
  };
}

/**
 * get_wcag_status — Returns WCAG accessibility state for all screens or a
 * specific screen.
 *
 * @param {string|undefined} screen - Optional screen name to filter by
 */
function handleGetWcagStatus({ screen }) {
  const content = readStateFile('wcag-audit.md');
  if (!content) {
    return {
      error: 'wcag-audit.md not found in pipeline/state/',
      hint: 'The Codebase Analyst must run first to populate this file.',
    };
  }

  if (!screen) {
    return { raw_content: content };
  }

  const sections = parseMarkdownSections('wcag-audit.md');
  const lower = screen.toLowerCase();
  const matching = sections.filter((s) => s.heading.toLowerCase().includes(lower));

  if (matching.length === 0) {
    return {
      error: `No WCAG data found for screen "${screen}"`,
      available_screens: sections.map((s) => s.heading),
    };
  }

  return {
    screen,
    sections: matching,
  };
}

/**
 * get_platform_mapping — Returns cross-platform feature mapping data, showing
 * which platforms implement a feature and CMP migration feasibility.
 *
 * @param {string|undefined} feature - Optional feature name to filter by
 */
function handleGetPlatformMapping({ feature }) {
  const content = readStateFile('cross-platform-mapping.md');
  if (!content) {
    return {
      error: 'cross-platform-mapping.md not found in pipeline/state/',
      hint: 'The Codebase Analyst must run first to populate this file.',
    };
  }

  if (!feature) {
    return { raw_content: content };
  }

  const sections = parseMarkdownSections('cross-platform-mapping.md');
  const lower = feature.toLowerCase();
  const matching = sections.filter((s) => s.heading.toLowerCase().includes(lower));

  if (matching.length === 0) {
    return {
      error: `No platform mapping found for feature "${feature}"`,
      available_features: sections.map((s) => s.heading),
    };
  }

  return {
    feature,
    sections: matching,
  };
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'current-state',
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
      name: 'get_module',
      description:
        'Returns the classification, CLEAN layer, dependencies, file list, and recent changes for a named module from module-classifications.md.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Module name (exact or partial match)',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'get_dependency_graph',
      description:
        'Returns dependency-graph.json. Pass a module name to filter to that module\'s upstream and downstream dependencies.',
      inputSchema: {
        type: 'object',
        properties: {
          module: {
            type: 'string',
            description: 'Optional module name to filter the graph',
          },
        },
      },
    },
    {
      name: 'get_test_coverage',
      description:
        'Returns current test coverage data from test-coverage.md. Pass a module name to filter to that module only.',
      inputSchema: {
        type: 'object',
        properties: {
          module: {
            type: 'string',
            description: 'Optional module name to filter coverage data',
          },
        },
      },
    },
    {
      name: 'get_architecture_patterns',
      description:
        'Returns current and target architecture patterns for a module from architecture-audit.md.',
      inputSchema: {
        type: 'object',
        properties: {
          module: {
            type: 'string',
            description: 'Module name',
          },
        },
        required: ['module'],
      },
    },
    {
      name: 'get_wcag_status',
      description:
        'Returns WCAG 2.1 AA accessibility state per screen from wcag-audit.md.',
      inputSchema: {
        type: 'object',
        properties: {
          screen: {
            type: 'string',
            description: 'Optional screen name to filter accessibility data',
          },
        },
      },
    },
    {
      name: 'get_platform_mapping',
      description:
        'Returns cross-platform feature mapping — which platforms implement a feature, how, and CMP migration feasibility.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Optional feature name to filter the mapping',
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  switch (name) {
    case 'get_module':
      result = handleGetModule(args || {});
      break;
    case 'get_dependency_graph':
      result = handleGetDependencyGraph(args || {});
      break;
    case 'get_test_coverage':
      result = handleGetTestCoverage(args || {});
      break;
    case 'get_architecture_patterns':
      result = handleGetArchitecturePatterns(args || {});
      break;
    case 'get_wcag_status':
      result = handleGetWcagStatus(args || {});
      break;
    case 'get_platform_mapping':
      result = handleGetPlatformMapping(args || {});
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

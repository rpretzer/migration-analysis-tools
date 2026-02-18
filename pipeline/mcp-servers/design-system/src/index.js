/**
 * Design System MCP Server
 *
 * Exposes design tokens, component specifications, screen layouts, WCAG
 * annotations, and Figma Make prompt generation to all pipeline agents.
 *
 * Data sources (in priority order):
 *   1. pipeline/state/design-tokens.json — canonical token source (Phase 2)
 *   2. figma_prompts/_brand_constraints.json — current accumulator (Phase 1)
 *   3. pipeline/state/wcag-audit.md — accessibility annotations
 *   4. pipeline/specs/{story-id}/spec.md — per-story context for prompt generation
 *
 * The design system server has two adoption phases (per PIPELINE_STRATEGY.md §5.6):
 *   Phase 1 (now): Reads _brand_constraints.json + wcag-audit.md. Generates
 *     Figma Make prompts from spec files and brand constraints.
 *   Phase 2 (aspirational): Reads pipeline/state/design-tokens.json as the
 *     canonical source. update_design_system writes back to this file.
 *
 * update_design_system is implemented as a local file write. When Zeroheight
 * API credentials are provided (ZEROHEIGHT_API_TOKEN env var), it also pushes
 * to the Zeroheight API.
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

// Server lives at pipeline/mcp-servers/design-system/src/index.js
// Repo root is four levels up.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const STATE_DIR = path.join(REPO_ROOT, 'pipeline', 'state');
const FIGMA_DIR = path.join(REPO_ROOT, 'figma_prompts');
const SPECS_DIR = path.join(REPO_ROOT, 'pipeline', 'specs');

const DESIGN_TOKENS_FILE = path.join(STATE_DIR, 'design-tokens.json');
const BRAND_CONSTRAINTS_FILE = path.join(FIGMA_DIR, '_brand_constraints.json');
const WCAG_AUDIT_FILE = path.join(STATE_DIR, 'wcag-audit.md');

// ---------------------------------------------------------------------------
// Default brand constraints (from CLAUDE.md §17.5)
// Used when neither design-tokens.json nor _brand_constraints.json exists.
// ---------------------------------------------------------------------------

/** @type {object} */
const DEFAULT_TOKENS = {
  typography: {
    caption: '12sp',
    body_small: '14sp',
    body_medium: '16sp',
    body_large: '18sp',
    title_small: '20sp',
    title_medium: '22sp',
    note: 'Always sp, never pt or dp.',
  },
  colors: {
    primary: '#6366F1',
    error: '#EF4444',
    success: '#10B981',
    secondary_text: '#6B7280',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text_primary: '#121212',
  },
  spacing: {
    base: '4px',
    horizontal_page_padding: '16px',
    component_gap: '12px',
    section_gap: '24px',
  },
  components: {
    style: 'Material 3',
    card_corner_radius: '12px',
    button_corner_radius: '8px',
    input_corner_radius: '8px',
    button_min_height: '48dp',
    input_min_height: '48dp',
    tap_target_min: '48x48dp',
    auto_layout: 'Required on every frame.',
  },
  tv_overrides: {
    text_min_size: '18sp',
    tap_target_min: '80x80dp',
    focus_ring: '4px solid',
    base_frame: '1920x1080',
  },
  platform_frames: {
    phone: '390x844',
    tablet: '768x1024',
    tv: '1920x1080',
  },
};

// ---------------------------------------------------------------------------
// File reading helpers
// ---------------------------------------------------------------------------

/**
 * Reads and parses a JSON file. Returns null if the file does not exist.
 * @param {string} filePath
 * @returns {object|null}
 */
function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${err.message}`);
  }
}

/**
 * Reads a text file. Returns null if the file does not exist.
 * @param {string} filePath
 * @returns {string|null}
 */
function readText(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Returns the current design tokens, merging defaults with whatever file
 * sources exist. Priority: design-tokens.json > _brand_constraints.json > defaults.
 * @returns {object}
 */
function getTokens() {
  const fromCanonical = readJson(DESIGN_TOKENS_FILE);
  if (fromCanonical) return { source: 'pipeline/state/design-tokens.json', ...fromCanonical };

  const fromBrandConstraints = readJson(BRAND_CONSTRAINTS_FILE);
  if (fromBrandConstraints) return { source: 'figma_prompts/_brand_constraints.json', ...fromBrandConstraints };

  return { source: 'built-in defaults (CLAUDE.md §17.5)', ...DEFAULT_TOKENS };
}

/**
 * Parses markdown sections by H2/H3 headings.
 * @param {string} content
 * @returns {Array<{heading: string, content: string}>}
 */
function parseMarkdownSections(content) {
  const sections = [];
  const parts = content.split(/\n(?=#{2,3}\s)/);
  for (const part of parts) {
    const headingMatch = part.match(/^(#{2,3})\s+(.+)/);
    if (!headingMatch) continue;
    sections.push({ heading: headingMatch[2].trim(), content: part.trim() });
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

/**
 * get_design_tokens — Returns current design system tokens (colors, typography,
 * spacing, breakpoints, component defaults).
 */
function handleGetDesignTokens() {
  try {
    const tokens = getTokens();
    return { ok: true, tokens };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * get_component_spec — Returns the specification for a named component:
 * props, states, accessibility requirements, and usage guidelines.
 *
 * Currently reads from pipeline/state/design-tokens.json components section
 * if present. Falls back to inline Material 3 defaults with accessibility
 * requirements drawn from WCAG 2.1 AA.
 *
 * @param {object} args
 * @param {string} args.name - Component name (e.g. "Button", "Card", "TextField")
 */
function handleGetComponentSpec({ name }) {
  if (!name) return { error: 'name is required' };

  const tokens = getTokens();

  // Check if the token source has a components section with named specs.
  const components = tokens.components_library || tokens.components || null;
  if (components && typeof components === 'object') {
    const lower = name.toLowerCase();
    const key = Object.keys(components).find((k) => k.toLowerCase() === lower);
    if (key) {
      return { ok: true, component: name, spec: components[key] };
    }
  }

  // Return Material 3 defaults for known component types.
  const materialDefaults = {
    button: {
      name: 'Button',
      style: 'Material 3 FilledButton',
      min_height: '48dp',
      min_width: '64dp',
      corner_radius: '8px',
      states: ['enabled', 'hovered', 'focused', 'pressed', 'disabled'],
      accessibility: {
        content_description: 'Required. Describe the action, not the label.',
        min_tap_target: '48x48dp',
        contrast_ratio: '4.5:1 against background',
        focus_indicator: 'Focus ring must be visible on keyboard/D-pad navigation',
      },
      usage: 'Primary actions. One per screen preferred. Use OutlinedButton for secondary actions.',
    },
    card: {
      name: 'Card',
      style: 'Material 3 ElevatedCard',
      corner_radius: '12px',
      elevation: '1dp',
      states: ['default', 'hovered', 'focused', 'pressed'],
      accessibility: {
        semantic_role: 'Use semantics { role = Role.Button } if the card is tappable.',
        content_description: 'Required if card contains only images.',
        min_tap_target: '48x48dp for interactive cards',
      },
      usage: 'Content grouping. Clickable cards must announce their full content to screen readers.',
    },
    textfield: {
      name: 'TextField',
      style: 'Material 3 OutlinedTextField',
      min_height: '48dp',
      corner_radius: '8px',
      states: ['unfocused', 'focused', 'error', 'disabled'],
      accessibility: {
        label: 'Required. Use label parameter, not placeholder.',
        error_message: 'Display inline below the field. Announce via LiveRegion.',
        hint_text: 'Use supportingText for additional guidance.',
      },
      usage: 'Text input. Always pair with a label. Never use placeholder as the only label.',
    },
  };

  const lower = name.toLowerCase();
  const defaultSpec = materialDefaults[lower];
  if (defaultSpec) {
    return { ok: true, component: name, spec: defaultSpec, source: 'Material 3 defaults + WCAG 2.1 AA' };
  }

  return {
    ok: false,
    component: name,
    error: `No specification found for component "${name}"`,
    hint: 'Add this component to pipeline/state/design-tokens.json under a "components_library" key, or request a spec from the design team.',
    known_components: Object.keys(materialDefaults),
  };
}

/**
 * get_screen_layout — Returns the layout structure for a named screen.
 * Reads from pipeline/state/wcag-audit.md sections (which contain screen-level
 * layout information alongside accessibility annotations).
 *
 * @param {object} args
 * @param {string} args.screen - Screen name (e.g. "Home", "Search", "Playback")
 */
function handleGetScreenLayout({ screen }) {
  if (!screen) return { error: 'screen is required' };

  const wcagContent = readText(WCAG_AUDIT_FILE);
  if (!wcagContent) {
    return {
      ok: false,
      screen,
      error: 'pipeline/state/wcag-audit.md not found',
      hint: 'The Codebase Analyst must run the WCAG audit first to populate screen layout data.',
    };
  }

  const sections = parseMarkdownSections(wcagContent);
  const lower = screen.toLowerCase();
  const matching = sections.filter((s) => s.heading.toLowerCase().includes(lower));

  if (matching.length === 0) {
    return {
      ok: false,
      screen,
      error: `No layout data found for screen "${screen}" in wcag-audit.md`,
      available_screens: sections.map((s) => s.heading),
    };
  }

  return { ok: true, screen, sections: matching };
}

/**
 * get_wcag_annotations — Returns accessibility annotations from the WCAG audit.
 * When screen is omitted, returns all annotations.
 *
 * @param {object} args
 * @param {string} [args.screen] - Optional screen name filter
 */
function handleGetWcagAnnotations({ screen }) {
  const wcagContent = readText(WCAG_AUDIT_FILE);
  if (!wcagContent) {
    return {
      ok: false,
      error: 'pipeline/state/wcag-audit.md not found',
      hint: 'The Codebase Analyst must run the WCAG audit first.',
    };
  }

  if (!screen) {
    return { ok: true, raw_content: wcagContent };
  }

  const sections = parseMarkdownSections(wcagContent);
  const lower = screen.toLowerCase();
  const matching = sections.filter((s) => s.heading.toLowerCase().includes(lower));

  if (matching.length === 0) {
    return {
      ok: false,
      screen,
      error: `No WCAG annotations found for screen "${screen}"`,
      available_screens: sections.map((s) => s.heading),
    };
  }

  return { ok: true, screen, annotations: matching };
}

/**
 * generate_figma_prompt — Generates a Figma Make prompt JSON for a story.
 * Reads the compiled spec (pipeline/specs/{story_id}/spec.md) and the current
 * design tokens, then assembles the §17.3 schema output.
 *
 * @param {object} args
 * @param {string} args.story_id - Story identifier (e.g. "A-1")
 * @param {string} [args.platform] - "phone", "tablet", or "tv" (default: "phone")
 */
function handleGenerateFigmaPrompt({ story_id, platform = 'phone' }) {
  if (!story_id) return { error: 'story_id is required' };

  const specPath = path.join(SPECS_DIR, story_id, 'spec.md');
  const specContent = readText(specPath);

  if (!specContent) {
    return {
      ok: false,
      story_id,
      error: `Spec not found at pipeline/specs/${story_id}/spec.md`,
      hint: 'The Spec Compiler must produce spec.md before a Figma prompt can be generated.',
    };
  }

  const tokens = getTokens();

  // Determine platform defaults (from CLAUDE.md §17.4).
  const platformDefaults = {
    phone: { frame: '390 x 844', nav: 'Top app bar + bottom nav or back arrow' },
    tablet: { frame: '768 x 1024', nav: 'Side nav or top app bar' },
    tv: { frame: '1920 x 1080', nav: 'No top app bar; full-screen with D-pad focus rings' },
  };
  const platformDef = platformDefaults[platform] || platformDefaults.phone;

  // Extract title and summary from spec (first H1 heading and first paragraph).
  const titleMatch = specContent.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : story_id;
  const firstParagraph = specContent.match(/^(?!#)[^\n].+/m)?.[0] || '';

  // Extract Gherkin scenarios as UI acceptance criteria.
  const gherkinMatches = [...specContent.matchAll(/Given .+?(?=\n\n|\nScenario|\nGiven|$)/gs)];
  const uiACs = gherkinMatches.slice(0, 5).map((m) => m[0].trim());

  // Build the §17.3 schema output.
  const prompt = {
    ux_intent: `Prototype the ${title} screen to validate layout, navigation, and accessibility for the ${platform} platform. Focus on: ${firstParagraph.slice(0, 200)}`,
    figma_make_prompt:
      `Design the ${title} screen for ${platform} (${platformDef.frame}). ` +
      `Navigation: ${platformDef.nav}. ` +
      `Use Material 3 components with: primary color ${tokens.colors?.primary || DEFAULT_TOKENS.colors.primary}, ` +
      `surface ${tokens.colors?.surface || DEFAULT_TOKENS.colors.surface}, ` +
      `text primary ${tokens.colors?.text_primary || DEFAULT_TOKENS.colors.text_primary}. ` +
      `Typography: body text ${tokens.typography?.body_medium || DEFAULT_TOKENS.typography.body_medium}, titles ${tokens.typography?.title_medium || DEFAULT_TOKENS.typography.title_medium}. ` +
      `Spacing: horizontal padding ${tokens.spacing?.horizontal_page_padding || DEFAULT_TOKENS.spacing.horizontal_page_padding}, component gap ${tokens.spacing?.component_gap || DEFAULT_TOKENS.spacing.component_gap}. ` +
      `All tap targets minimum 48x48dp. Apply auto layout to every frame. ` +
      `Corner radius: cards 12px, buttons/inputs 8px. ` +
      `Include all visible states (loading, empty, error, populated). ` +
      `First step: create the ${platformDef.frame} frame with the app bar and navigation structure.`,
    ui_acceptance_criteria: uiACs.length > 0 ? uiACs : [
      `Given the ${title} screen is rendered, then all text meets minimum size requirements (${tokens.typography?.body_medium || DEFAULT_TOKENS.typography.body_medium} body, ${tokens.typography?.title_medium || DEFAULT_TOKENS.typography.title_medium} titles).`,
      `Given the screen contains interactive elements, then all tap targets are at minimum 48x48dp.`,
      `Given the screen is in light mode, then all text/background color pairs meet 4.5:1 contrast ratio.`,
    ],
    manual_validation_checklist: [
      `Verify horizontal page padding is ${tokens.spacing?.horizontal_page_padding || DEFAULT_TOKENS.spacing.horizontal_page_padding} on both sides.`,
      `Verify all interactive elements have tap targets >= 48x48dp.`,
      `Verify text contrast ratio >= 4.5:1 for all text/background pairs.`,
      `Verify all text uses sp units (not pt or dp).`,
      `Verify auto layout is applied to every frame and component.`,
      `Verify loading, empty, and error states are designed (not just happy path).`,
      `Verify focus order follows logical reading order for TalkBack/VoiceOver navigation.`,
      platform === 'tv' ? 'Verify D-pad focus rings are 4px solid and visible on all focusable elements.' : null,
    ].filter(Boolean),
  };

  // Write the prompt to figma_prompts/{story_id}.json
  try {
    if (!fs.existsSync(FIGMA_DIR)) {
      fs.mkdirSync(FIGMA_DIR, { recursive: true });
    }
    const outputPath = path.join(FIGMA_DIR, `${story_id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(prompt, null, 2), 'utf8');
    return { ok: true, story_id, platform, output_path: outputPath, prompt };
  } catch (err) {
    // Return the prompt even if write fails — agent can use the data.
    return { ok: true, story_id, platform, write_error: err.message, prompt };
  }
}

/**
 * update_design_system — Updates the design system with a new or modified
 * component specification or token set. Writes to pipeline/state/design-tokens.json.
 * When ZEROHEIGHT_API_TOKEN is present, also pushes to Zeroheight (not yet
 * implemented — returns a NOT_CONFIGURED note).
 *
 * @param {object} args
 * @param {string} args.component - Component name to update (or "tokens" for global tokens)
 * @param {object} args.tokens - Token/spec data to merge in
 */
function handleUpdateDesignSystem({ component, tokens: newTokens }) {
  if (!component) return { error: 'component is required' };
  if (!newTokens) return { error: 'tokens is required' };

  try {
    // Read or initialize the canonical tokens file.
    let existing = readJson(DESIGN_TOKENS_FILE);
    if (!existing) {
      existing = { ...DEFAULT_TOKENS };
    }

    if (component === 'tokens') {
      // Merge top-level token sections.
      Object.assign(existing, newTokens);
    } else {
      // Merge into components_library.
      existing.components_library = existing.components_library || {};
      existing.components_library[component] = {
        ...(existing.components_library[component] || {}),
        ...newTokens,
      };
    }

    existing.updated_at = new Date().toISOString();

    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    fs.writeFileSync(DESIGN_TOKENS_FILE, JSON.stringify(existing, null, 2), 'utf8');

    const zeroheightNote = process.env.ZEROHEIGHT_API_TOKEN
      ? 'Zeroheight push not yet implemented. Component saved locally only.'
      : 'Zeroheight API token not configured (ZEROHEIGHT_API_TOKEN). Component saved locally only.';

    return {
      ok: true,
      component,
      updated_file: DESIGN_TOKENS_FILE,
      zeroheight_status: zeroheightNote,
    };
  } catch (err) {
    return { ok: false, component, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'design-system',
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
      name: 'get_design_tokens',
      description:
        'Returns the current design system tokens: colors, typography, spacing, ' +
        'breakpoints, and component defaults. Reads from pipeline/state/design-tokens.json ' +
        '(canonical), then figma_prompts/_brand_constraints.json, then built-in defaults.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_component_spec',
      description:
        'Returns the specification for a named component: props, states, accessibility ' +
        'requirements (tap targets, contrast, content descriptions), and usage guidelines.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Component name (e.g. "Button", "Card", "TextField")',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'get_screen_layout',
      description:
        'Returns layout structure for a named screen from pipeline/state/wcag-audit.md. ' +
        'Includes navigation patterns, content zones, and component hierarchy.',
      inputSchema: {
        type: 'object',
        properties: {
          screen: {
            type: 'string',
            description: 'Screen name (e.g. "Home", "Search", "Playback", "Profile")',
          },
        },
        required: ['screen'],
      },
    },
    {
      name: 'get_wcag_annotations',
      description:
        'Returns accessibility annotations from pipeline/state/wcag-audit.md. ' +
        'Pass a screen name to filter; omit for all annotations.',
      inputSchema: {
        type: 'object',
        properties: {
          screen: {
            type: 'string',
            description: 'Optional screen name to filter annotations',
          },
        },
      },
    },
    {
      name: 'generate_figma_prompt',
      description:
        'Generates a Figma Make prompt JSON for a story, conforming to the §17.3 schema ' +
        '(ux_intent, figma_make_prompt, ui_acceptance_criteria, manual_validation_checklist). ' +
        'Reads pipeline/specs/{story_id}/spec.md and current design tokens. ' +
        'Writes output to figma_prompts/{story_id}.json.',
      inputSchema: {
        type: 'object',
        properties: {
          story_id: {
            type: 'string',
            description: 'Story identifier (e.g. "A-1")',
          },
          platform: {
            type: 'string',
            description: 'Target platform: "phone" (390x844), "tablet" (768x1024), or "tv" (1920x1080)',
            enum: ['phone', 'tablet', 'tv'],
          },
        },
        required: ['story_id'],
      },
    },
    {
      name: 'update_design_system',
      description:
        'Updates the design system with a new or modified component spec or token set. ' +
        'Writes to pipeline/state/design-tokens.json. ' +
        'Pass component="tokens" to update global design tokens.',
      inputSchema: {
        type: 'object',
        properties: {
          component: {
            type: 'string',
            description:
              'Component name to update (e.g. "Button") or "tokens" to update global design tokens',
          },
          tokens: {
            type: 'object',
            description:
              'Token or spec data to merge in. For components: props, states, accessibility. ' +
              'For "tokens": color, typography, spacing sections.',
          },
        },
        required: ['component', 'tokens'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  switch (name) {
    case 'get_design_tokens':
      result = handleGetDesignTokens();
      break;
    case 'get_component_spec':
      result = handleGetComponentSpec(args || {});
      break;
    case 'get_screen_layout':
      result = handleGetScreenLayout(args || {});
      break;
    case 'get_wcag_annotations':
      result = handleGetWcagAnnotations(args || {});
      break;
    case 'generate_figma_prompt':
      result = handleGenerateFigmaPrompt(args || {});
      break;
    case 'update_design_system':
      result = handleUpdateDesignSystem(args || {});
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

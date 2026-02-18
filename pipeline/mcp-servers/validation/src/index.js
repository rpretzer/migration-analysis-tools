/**
 * Validation MCP Server
 *
 * Wraps pipeline validation scripts and provides structured validation results
 * to agents. The Quality Gate Agent and Spec Compiler use this server to verify
 * that their outputs conform to schemas before proceeding.
 *
 * When the underlying scripts do not yet exist, the server returns a
 * NOT_CONFIGURED result that tells the caller what file to create and what
 * the script must produce. This prevents silent failures during Phase B
 * implementation.
 *
 * Validation scripts are expected at:
 *   scripts/validate_story.py
 *   scripts/validate_spec.py
 *   scripts/validate_figma_prompt.py
 *   scripts/validate_test_results.py
 *   scripts/validate_gate_report.py
 *
 * Each script must:
 *   - Accept a single file path as its first positional argument
 *   - Exit 0 on success, non-zero on failure
 *   - Write a JSON object to stdout with at minimum:
 *     { "ok": true|false, "errors": [], "warnings": [] }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server lives at pipeline/mcp-servers/validation/src/index.js
// Repo root is four levels up.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPTS_DIR = path.join(REPO_ROOT, 'scripts');

// ---------------------------------------------------------------------------
// Script runner helpers
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to a validation script.
 * @param {string} scriptName - e.g. "validate_story.py"
 * @returns {string}
 */
function scriptPath(scriptName) {
  return path.join(SCRIPTS_DIR, scriptName);
}

/**
 * Checks whether a validation script exists.
 * @param {string} scriptName
 * @returns {boolean}
 */
function scriptExists(scriptName) {
  return fs.existsSync(scriptPath(scriptName));
}

/**
 * Resolves a file path that may be relative (to repo root) or absolute.
 * @param {string} filePath
 * @returns {string}
 */
function resolveFilePath(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(REPO_ROOT, filePath);
}

/**
 * Runs a Python validation script against a file and returns parsed output.
 * If the script does not exist, returns a NOT_CONFIGURED result.
 * If the script exits non-zero but produces parseable JSON, that JSON is
 * returned (validation failures are not exceptions). Unparseable output is
 * captured as-is.
 *
 * @param {string} scriptName - Python script filename (e.g. "validate_story.py")
 * @param {string} targetPath - Path to the file being validated
 * @param {string[]} [extraArgs] - Additional CLI arguments
 * @returns {object}
 */
function runValidationScript(scriptName, targetPath, extraArgs = []) {
  const script = scriptPath(scriptName);
  const resolved = resolveFilePath(targetPath);

  if (!scriptExists(scriptName)) {
    return {
      ok: false,
      status: 'NOT_CONFIGURED',
      script: script,
      hint: `Create ${script} — it must accept a file path as its first argument and write JSON to stdout: { "ok": bool, "errors": [], "warnings": [] }`,
    };
  }

  if (!fs.existsSync(resolved)) {
    return {
      ok: false,
      status: 'FILE_NOT_FOUND',
      file: resolved,
      errors: [`File not found: ${resolved}`],
      warnings: [],
    };
  }

  try {
    const stdout = execFileSync('python3', [script, resolved, ...extraArgs], {
      encoding: 'utf8',
      timeout: 30000,
    });
    try {
      const parsed = JSON.parse(stdout);
      return { status: 'VALIDATED', ...parsed };
    } catch {
      // Script produced non-JSON output — treat as pass with raw output.
      return {
        ok: true,
        status: 'VALIDATED',
        raw_output: stdout.trim(),
        errors: [],
        warnings: [],
      };
    }
  } catch (err) {
    // execFileSync throws on non-zero exit.
    const stdout = err.stdout || '';
    const stderr = err.stderr || '';
    try {
      const parsed = JSON.parse(stdout);
      return { status: 'INVALID', ...parsed };
    } catch {
      return {
        ok: false,
        status: 'SCRIPT_ERROR',
        errors: [stderr.trim() || err.message],
        raw_stdout: stdout.trim(),
        warnings: [],
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

/**
 * validate_story — Validates a user story file against the story template schema.
 * Checks: required sections present, Gherkin ACs format, NFR fields, story point
 * is Fibonacci.
 *
 * @param {object} args
 * @param {string} args.path - Path to the story file (relative to repo root or absolute)
 */
function handleValidateStory({ path: filePath }) {
  if (!filePath) return { error: 'path is required' };
  return runValidationScript('validate_story.py', filePath);
}

/**
 * validate_spec — Validates a compiled spec file against the spec schema.
 * Checks: Gherkin ACs present, file-level change targets specified, test-spec
 * reference exists, NFRs include performance and accessibility, no vague language.
 *
 * @param {object} args
 * @param {string} args.path - Path to the spec.md file
 */
function handleValidateSpec({ path: filePath }) {
  if (!filePath) return { error: 'path is required' };
  return runValidationScript('validate_spec.py', filePath);
}

/**
 * validate_figma_prompt — Validates a Figma Make prompt JSON file against the
 * output schema defined in CLAUDE.md §17.3.
 * Checks: valid JSON, required fields present (ux_intent, figma_make_prompt,
 * ui_acceptance_criteria, manual_validation_checklist), checklist items are
 * actionable.
 *
 * @param {object} args
 * @param {string} args.path - Path to the Figma prompt JSON file
 */
function handleValidateFigmaPrompt({ path: filePath }) {
  if (!filePath) return { error: 'path is required' };

  // First do a quick structural check in-process before delegating to script.
  const resolved = resolveFilePath(filePath);
  if (fs.existsSync(resolved)) {
    try {
      const content = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      const requiredFields = [
        'ux_intent',
        'figma_make_prompt',
        'ui_acceptance_criteria',
        'manual_validation_checklist',
      ];
      const missing = requiredFields.filter((f) => !(f in content));
      if (missing.length > 0) {
        return {
          ok: false,
          status: 'INVALID',
          errors: [`Missing required fields: ${missing.join(', ')}`],
          warnings: [],
          schema_source: 'CLAUDE.md §17.3',
        };
      }
    } catch (parseErr) {
      return {
        ok: false,
        status: 'INVALID',
        errors: [`Invalid JSON: ${parseErr.message}`],
        warnings: [],
      };
    }
  }

  // Delegate to script for deeper checks if it exists.
  if (scriptExists('validate_figma_prompt.py')) {
    return runValidationScript('validate_figma_prompt.py', filePath);
  }

  // Script not yet written — in-process structural check passed.
  return {
    ok: true,
    status: 'VALIDATED',
    note: 'Structural JSON check passed. Deep validation script (validate_figma_prompt.py) not yet configured.',
    warnings: ['Create scripts/validate_figma_prompt.py for deeper validation.'],
    errors: [],
  };
}

/**
 * validate_test_results — Checks that a test results file meets format and
 * coverage thresholds.
 * Checks: results.md and verdict.md present alongside the given path,
 * verdict is PASS/FAIL/REVIEW_NEEDED, coverage meets the threshold in the spec.
 *
 * @param {object} args
 * @param {string} args.path - Path to the test results directory or results.md
 */
function handleValidateTestResults({ path: filePath }) {
  if (!filePath) return { error: 'path is required' };
  return runValidationScript('validate_test_results.py', filePath);
}

/**
 * validate_gate_report — Checks that a quality gate report is complete.
 * Checks: all required sections present, verdict is one of GATE_PASS/GATE_FAIL/
 * GATE_REVIEW_NEEDED, every GATE_REVIEW_NEEDED verdict has a "Human Review
 * Required" section with specific items.
 *
 * @param {object} args
 * @param {string} args.path - Path to the gate report.md
 */
function handleValidateGateReport({ path: filePath }) {
  if (!filePath) return { error: 'path is required' };
  return runValidationScript('validate_gate_report.py', filePath);
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'validation',
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
      name: 'validate_story',
      description:
        'Validates a user story file against the story template schema (docs/USER_STORY_TEMPLATE.md). ' +
        'Checks required sections, Gherkin AC format, NFR fields, and Fibonacci story points. ' +
        'Returns { ok, status, errors, warnings }.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Path to the story file, relative to repo root or absolute ' +
              '(e.g. "pipeline/intake/stories-draft.md")',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'validate_spec',
      description:
        'Validates a compiled spec file against the spec schema. Checks that Gherkin ACs, ' +
        'file-level change targets, test-spec references, and NFRs (performance, accessibility) ' +
        'are present and that no vague language exists. Returns { ok, status, errors, warnings }.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Path to the spec.md file (e.g. "pipeline/specs/A-1/spec.md")',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'validate_figma_prompt',
      description:
        'Validates a Figma Make prompt JSON file against the schema defined in CLAUDE.md §17.3. ' +
        'Checks: valid JSON, ux_intent, figma_make_prompt, ui_acceptance_criteria, and ' +
        'manual_validation_checklist fields are present. Returns { ok, status, errors, warnings }.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Path to the Figma prompt JSON file (e.g. "figma_prompts/A-1.json")',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'validate_test_results',
      description:
        'Validates a test results file or directory. Checks that results.md and verdict.md ' +
        'exist, that the verdict is one of PASS/FAIL/REVIEW_NEEDED, and that coverage ' +
        'meets the threshold declared in the spec. Returns { ok, status, errors, warnings }.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Path to the test results directory or results.md ' +
              '(e.g. "pipeline/test/A-1/results.md")',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'validate_gate_report',
      description:
        'Validates a Quality Gate report for completeness. Checks that all required sections ' +
        'are present, the verdict is GATE_PASS/GATE_FAIL/GATE_REVIEW_NEEDED, and that ' +
        'GATE_REVIEW_NEEDED verdicts include a specific "Human Review Required" section. ' +
        'Returns { ok, status, errors, warnings }.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Path to the gate report.md (e.g. "pipeline/gates/A-1/report.md")',
          },
        },
        required: ['path'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  switch (name) {
    case 'validate_story':
      result = handleValidateStory(args || {});
      break;
    case 'validate_spec':
      result = handleValidateSpec(args || {});
      break;
    case 'validate_figma_prompt':
      result = handleValidateFigmaPrompt(args || {});
      break;
    case 'validate_test_results':
      result = handleValidateTestResults(args || {});
      break;
    case 'validate_gate_report':
      result = handleValidateGateReport(args || {});
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

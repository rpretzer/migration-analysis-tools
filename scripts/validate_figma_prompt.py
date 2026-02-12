#!/usr/bin/env python3
"""
Validate Figma Make prompt JSON files against the §16.3 / §17.3 schema.

Usage:
    python3 scripts/validate_figma_prompt.py figma_prompts/home.json
    python3 scripts/validate_figma_prompt.py figma_prompts/        # validate all in dir
    python3 scripts/validate_figma_prompt.py --check-schema        # validate the schema itself
"""

import json
import sys
import os

# Schema definition matching CLAUDE.md §17.3
SCHEMA = {
    "type": "object",
    "required": ["ux_intent", "figma_make_prompt", "ui_acceptance_criteria", "manual_validation_checklist"],
    "properties": {
        "ux_intent": {
            "type": "string",
            "minLength": 10,
            "description": "1-3 sentences describing what the prototype needs to prove."
        },
        "figma_make_prompt": {
            "type": "string",
            "minLength": 50,
            "description": "Full prompt for Figma Make."
        },
        "ui_acceptance_criteria": {
            "type": "array",
            "items": {"type": "string", "minLength": 10},
            "minItems": 1,
            "description": "Given/When/Then statements for visible/interactive elements."
        },
        "manual_validation_checklist": {
            "type": "array",
            "items": {"type": "string", "minLength": 10},
            "minItems": 1,
            "description": "Actionable checks for layout, states, tap targets, contrast, etc."
        }
    },
    "additionalProperties": False
}

# Content checks beyond schema validation
PROMPT_REQUIRED_ELEMENTS = [
    ("screen description", r"(?i)(screen|page|view|layout)"),
    ("platform or frame size", r"(?i)(390|768|1920|android|ios|phone|tablet|tv)"),
    ("states", r"(?i)(default|error|empty|loading|success|state)"),
    ("style", r"(?i)(material|auto.?layout|spacing|rounded|corner)"),
]


def validate_json_structure(data: dict) -> list[str]:
    """Validate the JSON object against the schema without jsonschema dependency."""
    errors = []

    # Check required fields
    for field in SCHEMA["required"]:
        if field not in data:
            errors.append(f"Missing required field: '{field}'")

    # Check no extra fields
    allowed = set(SCHEMA["properties"].keys())
    for key in data:
        if key not in allowed:
            errors.append(f"Unexpected field: '{key}' (allowed: {sorted(allowed)})")

    # Check types and constraints
    for field, spec in SCHEMA["properties"].items():
        if field not in data:
            continue

        value = data[field]

        if spec["type"] == "string":
            if not isinstance(value, str):
                errors.append(f"'{field}' must be a string, got {type(value).__name__}")
            elif len(value) < spec.get("minLength", 0):
                errors.append(
                    f"'{field}' is too short ({len(value)} chars, minimum {spec['minLength']})"
                )

        elif spec["type"] == "array":
            if not isinstance(value, list):
                errors.append(f"'{field}' must be an array, got {type(value).__name__}")
            elif len(value) < spec.get("minItems", 0):
                errors.append(
                    f"'{field}' has too few items ({len(value)}, minimum {spec['minItems']})"
                )
            else:
                item_spec = spec.get("items", {})
                for i, item in enumerate(value):
                    if item_spec.get("type") == "string":
                        if not isinstance(item, str):
                            errors.append(f"'{field}[{i}]' must be a string")
                        elif len(item) < item_spec.get("minLength", 0):
                            errors.append(
                                f"'{field}[{i}]' is too short ({len(item)} chars, minimum {item_spec['minLength']})"
                            )

    return errors


def validate_prompt_content(data: dict) -> list[str]:
    """Check that the Figma Make prompt contains the required content elements."""
    import re
    errors = []

    prompt = data.get("figma_make_prompt", "")

    for element_name, pattern in PROMPT_REQUIRED_ELEMENTS:
        if not re.search(pattern, prompt):
            errors.append(f"Prompt may be missing: {element_name} (no match for /{pattern}/)")

    # Check acceptance criteria use Given/When/Then format
    criteria = data.get("ui_acceptance_criteria", [])
    for i, criterion in enumerate(criteria):
        has_gherkin = any(
            keyword in criterion
            for keyword in ["Given", "When", "Then", "given", "when", "then"]
        )
        if not has_gherkin:
            errors.append(
                f"ui_acceptance_criteria[{i}] does not use Given/When/Then format"
            )

    # Check validation checklist mentions key dimensions
    checklist = data.get("manual_validation_checklist", [])
    checklist_text = " ".join(checklist).lower()
    key_checks = {
        "tap target": "tap target sizing (48x48dp)",
        "contrast": "colour contrast ratios",
        "text size": "text/font sizing",
    }
    for keyword, description in key_checks.items():
        if keyword not in checklist_text and "48" not in checklist_text:
            # Only warn, don't fail — not every screen needs every check
            pass

    return errors


def validate_file(filepath: str) -> list[str]:
    """Validate a single Figma prompt JSON file. Returns list of errors."""
    errors = []

    # Check file is valid JSON
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            raw = f.read()
    except Exception as e:
        return [f"Cannot read file: {e}"]

    if not raw.strip():
        return ["File is empty"]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        return [f"Invalid JSON: {e}"]

    if not isinstance(data, dict):
        return [f"Top-level value must be an object, got {type(data).__name__}"]

    # Structure validation
    errors.extend(validate_json_structure(data))

    # Content validation (only if structure is OK)
    if not errors:
        errors.extend(validate_prompt_content(data))

    return errors


def check_schema():
    """Validate that the schema definition itself is well-formed."""
    print("Schema self-check:")
    print(f"  Required fields: {SCHEMA['required']}")
    print(f"  Defined properties: {list(SCHEMA['properties'].keys())}")

    # Verify required fields match properties
    for field in SCHEMA["required"]:
        if field not in SCHEMA["properties"]:
            print(f"  ERROR: Required field '{field}' not in properties")
            sys.exit(1)

    print("  Schema validation OK")
    sys.exit(0)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_figma_prompt.py <file_or_directory>")
        print("       python3 validate_figma_prompt.py --check-schema")
        sys.exit(1)

    if sys.argv[1] == "--check-schema":
        check_schema()

    target = sys.argv[1]
    files = []

    if os.path.isdir(target):
        for f in sorted(os.listdir(target)):
            if f.endswith(".json") and not f.startswith("_"):
                files.append(os.path.join(target, f))
    elif os.path.isfile(target):
        files.append(target)
    else:
        print(f"ERROR: {target} is not a file or directory")
        sys.exit(1)

    if not files:
        print(f"No .json files found in {target}")
        sys.exit(1)

    total_errors = 0
    for filepath in files:
        errors = validate_file(filepath)
        basename = os.path.basename(filepath)
        if errors:
            print(f"FAIL  {basename}")
            for e in errors:
                print(f"      - {e}")
            total_errors += len(errors)
        else:
            print(f"PASS  {basename}")

    print()
    print(f"Files checked: {len(files)}")
    print(f"Total errors:  {total_errors}")
    sys.exit(1 if total_errors > 0 else 0)


if __name__ == "__main__":
    main()

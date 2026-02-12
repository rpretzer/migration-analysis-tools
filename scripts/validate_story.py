#!/usr/bin/env python3
"""
Validate story markdown files against the user story template.

Usage:
    python3 scripts/validate_story.py stories/A-1_KMP_Extract_Bean_Models.md
    python3 scripts/validate_story.py stories/          # validate all stories in dir
"""

import re
import sys
import os

REQUIRED_SECTIONS = [
    ("Title", r"^\*\*Title:\*\*\s+\S"),
    ("Story", r"^\*\*Story:\*\*"),
    ("Context / Background", r"^\*\*Context / Background:\*\*"),
    ("In scope", r"^\*\*In scope:\*\*"),
    ("Out of scope", r"^\*\*Out of scope:\*\*"),
    ("Acceptance Criteria", r"^\*\*Acceptance Criteria:\*\*"),
    ("Non-functional requirements", r"^\*\*Non-functional requirements:\*\*"),
    ("Dependencies", r"^\*\*Dependencies:\*\*"),
    ("Assumptions", r"^\*\*Assumptions:\*\*"),
    ("Effort estimate", r"^\*\*Effort estimate:\*\*"),
    ("Estimation drivers", r"^\*\*Estimation drivers:\*\*"),
]

FIBONACCI = {1, 2, 3, 5, 8, 13, 21, 34, 55}

NFR_SUBSECTIONS = ["Performance:", "Accessibility:", "Observability:", "Testing:"]

GHERKIN_PATTERN = re.compile(r"^Given\s+.+", re.MULTILINE)


def validate_story(filepath: str) -> list[str]:
    """Return a list of validation errors. Empty list means the story passes."""
    errors = []

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    lines = content.splitlines()

    # Check required sections
    for section_name, pattern in REQUIRED_SECTIONS:
        found = False
        for line in lines:
            if re.match(pattern, line.strip()):
                found = True
                break
        if not found:
            errors.append(f"Missing required section: {section_name}")

    # Check for at least one Gherkin scenario
    if not GHERKIN_PATTERN.search(content):
        errors.append("No Gherkin acceptance criteria found (expected at least one 'Given ... When ... Then' block)")

    # Check Given/When/Then completeness in code blocks
    in_gherkin_block = False
    current_block_has_given = False
    current_block_has_when = False
    current_block_has_then = False
    block_count = 0

    for line in lines:
        stripped = line.strip()
        if stripped == "```":
            if in_gherkin_block:
                # Closing a block — check completeness
                if current_block_has_given:
                    block_count += 1
                    if not current_block_has_when:
                        errors.append(f"Gherkin block {block_count}: has Given but missing When")
                    if not current_block_has_then:
                        errors.append(f"Gherkin block {block_count}: has Given but missing Then")
                in_gherkin_block = False
                current_block_has_given = False
                current_block_has_when = False
                current_block_has_then = False
            else:
                in_gherkin_block = True
        elif in_gherkin_block:
            if stripped.startswith("Given "):
                current_block_has_given = True
            elif stripped.startswith("When "):
                current_block_has_when = True
            elif stripped.startswith("Then "):
                current_block_has_then = True

    # Check effort estimate is Fibonacci
    for line in lines:
        match = re.match(r"^\*\*Effort estimate:\*\*\s*(\d+)", line.strip())
        if match:
            points = int(match.group(1))
            if points not in FIBONACCI:
                errors.append(
                    f"Effort estimate {points} is not a Fibonacci number. "
                    f"Valid values: {sorted(FIBONACCI)}"
                )
            break

    # Check user story format (As a ... I want ... so that ...)
    story_section = False
    has_user_story_format = False
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\*\*Story:\*\*", stripped):
            story_section = True
        elif story_section:
            if "As a" in stripped or "As an" in stripped:
                has_user_story_format = True
            story_section = False

    if not has_user_story_format:
        errors.append("Story section does not follow 'As a <user>, I want <goal> so that <value>' format")

    # Check NFR subsections
    nfr_section = False
    found_nfr_subs = set()
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\*\*Non-functional requirements:\*\*", stripped):
            nfr_section = True
            continue
        if nfr_section:
            if stripped.startswith("**") and not stripped.startswith("- "):
                # Hit next top-level section
                nfr_section = False
                continue
            for sub in NFR_SUBSECTIONS:
                if sub in stripped:
                    found_nfr_subs.add(sub)

    for sub in NFR_SUBSECTIONS:
        if sub not in found_nfr_subs:
            errors.append(f"NFR subsection missing: {sub}")

    # Check In scope has at least one checkbox item
    in_scope_section = False
    has_scope_items = False
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\*\*In scope:\*\*", stripped):
            in_scope_section = True
            continue
        if in_scope_section:
            if stripped.startswith("- ["):
                has_scope_items = True
            elif stripped.startswith("**"):
                in_scope_section = False

    if not has_scope_items:
        errors.append("In scope section has no checkbox items (expected '- [ ] ...' entries)")

    return errors


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_story.py <file_or_directory>")
        print("  Validates story markdown files against the user story template.")
        sys.exit(1)

    target = sys.argv[1]
    files = []

    if os.path.isdir(target):
        for f in sorted(os.listdir(target)):
            if f.endswith(".md") and not f.startswith("."):
                files.append(os.path.join(target, f))
    elif os.path.isfile(target):
        files.append(target)
    else:
        print(f"ERROR: {target} is not a file or directory")
        sys.exit(1)

    if not files:
        print(f"No .md files found in {target}")
        sys.exit(1)

    total_errors = 0
    for filepath in files:
        errors = validate_story(filepath)
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

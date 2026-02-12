#!/usr/bin/env python3
"""
Convert JIRA_IMPORT.md to a Jira-importable CSV file.

Parses the structured markdown format used in docs/JIRA_IMPORT.md and produces
a CSV that Jira's built-in CSV importer can consume.

Usage:
    python3 scripts/md_to_jira_csv.py docs/JIRA_IMPORT.md --output docs/JIRA_IMPORT.csv
"""

import csv
import re
import sys
import argparse


def parse_jira_import_md(filepath: str) -> list[dict]:
    """Parse JIRA_IMPORT.md into a list of issue dictionaries."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    issues = []
    # Split on horizontal rules that separate issues
    # Each issue block starts with **Issue Type:**
    blocks = re.split(r"\n---\n", content)

    for block in blocks:
        block = block.strip()
        if not block or "**Issue Type:**" not in block:
            continue

        issue = {}
        lines = block.splitlines()

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # Parse key-value fields
            match = re.match(r"^\*\*(.+?):\*\*\s*(.*)", line)
            if match:
                key = match.group(1).strip()
                value = match.group(2).strip()

                # Handle multi-line Description
                if key == "Description" and value:
                    # Description may continue on next lines until next **field:**
                    desc_lines = [value]
                    j = i + 1
                    while j < len(lines):
                        next_line = lines[j].strip()
                        if re.match(r"^\*\*.+:\*\*", next_line):
                            break
                        if next_line:
                            desc_lines.append(next_line)
                        j += 1
                    value = " ".join(desc_lines)
                    i = j - 1  # Will be incremented at end of loop

                issue[key] = value

            i += 1

        if issue.get("Issue Type") and issue.get("Summary"):
            issues.append(issue)

    return issues


def issues_to_csv(issues: list[dict], output_path: str):
    """Write issues to a Jira-importable CSV."""
    # Jira CSV columns
    fieldnames = [
        "Issue Type",
        "Summary",
        "Description",
        "Story Points",
        "Labels",
        "Component",
        "Epic Link",
        "Phase",
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()

        for issue in issues:
            row = {}
            for field in fieldnames:
                value = ""
                # Try exact match
                if field in issue:
                    value = issue[field]
                # Try alternate names used in the markdown
                elif field == "Component" and "Component / Module" in issue:
                    value = issue["Component / Module"]
                elif field == "Labels" and "Labels" in issue:
                    value = issue["Labels"]

                # Clean up values for CSV
                value = value.strip()
                # Remove markdown bold markers
                value = value.replace("**", "")
                # Collapse whitespace
                value = re.sub(r"\s+", " ", value)

                row[field] = value

            writer.writerow(row)

    return len(issues)


def main():
    parser = argparse.ArgumentParser(
        description="Convert JIRA_IMPORT.md to Jira-importable CSV"
    )
    parser.add_argument("input", help="Path to JIRA_IMPORT.md")
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output CSV path (default: same directory as input, .csv extension)"
    )
    args = parser.parse_args()

    if args.output is None:
        args.output = args.input.replace(".md", ".csv")

    print(f"Reading: {args.input}")
    issues = parse_jira_import_md(args.input)
    print(f"Parsed:  {len(issues)} issues")

    if not issues:
        print("ERROR: No issues found. Check that the markdown uses the expected format:")
        print("  **Issue Type:** Story")
        print("  **Summary:** ...")
        print("  **Description:** ...")
        sys.exit(1)

    count = issues_to_csv(issues, args.output)
    print(f"Written: {args.output} ({count} rows)")

    # Summary by issue type
    type_counts = {}
    for issue in issues:
        t = issue.get("Issue Type", "Unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
    for t, c in sorted(type_counts.items()):
        print(f"  {t}: {c}")

    # Summary by phase
    phase_counts = {}
    for issue in issues:
        p = issue.get("Phase", "Unknown")
        phase_counts[p] = phase_counts.get(p, 0) + 1
    print(f"  Phases: {phase_counts}")

    # Total story points
    total_sp = 0
    for issue in issues:
        sp = issue.get("Story Points", "0")
        try:
            total_sp += int(sp)
        except ValueError:
            pass
    print(f"  Total story points: {total_sp}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Compare two versions of PROJECT_STRUCTURE.md to identify what changed
between app versions. Useful for incremental re-analysis.

Usage:
    python3 scripts/diff_structure.py analysis/PROJECT_STRUCTURE.md analysis/PROJECT_STRUCTURE.v2.md
    python3 scripts/diff_structure.py old.md new.md --output delta_report.md
"""

import re
import sys
import argparse


def parse_packages(content: str) -> dict[str, dict]:
    """
    Extract package entries from PROJECT_STRUCTURE.md.

    Looks for patterns like:
        - `package/name` — description (N classes)
    or table rows like:
        | package/name | N | description |
    """
    packages = {}

    # Pattern 1: Bullet list format
    bullet_pattern = re.compile(
        r"[-*]\s+`([^`]+)`\s*[—–-]\s*(.+?)(?:\((\d+)\s*class(?:es)?\))?$",
        re.MULTILINE,
    )
    for match in bullet_pattern.finditer(content):
        name = match.group(1).strip()
        desc = match.group(2).strip().rstrip(".")
        count = int(match.group(3)) if match.group(3) else None
        packages[name] = {"description": desc, "class_count": count}

    # Pattern 2: Table format
    table_pattern = re.compile(
        r"\|\s*`?([a-zA-Z0-9_./]+)`?\s*\|\s*(\d+)\s*\|\s*(.+?)\s*\|",
        re.MULTILINE,
    )
    for match in table_pattern.finditer(content):
        name = match.group(1).strip()
        count = int(match.group(2))
        desc = match.group(3).strip()
        if name not in packages:  # Don't overwrite bullet entries
            packages[name] = {"description": desc, "class_count": count}

    # Pattern 3: Simple heading + description
    heading_pattern = re.compile(
        r"^#{2,4}\s+`?([a-zA-Z0-9_./]+)`?\s*(?:\((\d+)\s*class(?:es)?\))?",
        re.MULTILINE,
    )
    for match in heading_pattern.finditer(content):
        name = match.group(1).strip()
        count = int(match.group(2)) if match.group(2) else None
        if name not in packages:
            packages[name] = {"description": "", "class_count": count}

    return packages


def compare(old_packages: dict, new_packages: dict) -> dict:
    """Compare two package sets and produce a delta report."""
    old_names = set(old_packages.keys())
    new_names = set(new_packages.keys())

    added = new_names - old_names
    removed = old_names - new_names
    common = old_names & new_names

    changed = {}
    unchanged = set()

    for name in common:
        old_p = old_packages[name]
        new_p = new_packages[name]

        changes = []

        # Check class count change
        if old_p["class_count"] is not None and new_p["class_count"] is not None:
            if old_p["class_count"] != new_p["class_count"]:
                delta = new_p["class_count"] - old_p["class_count"]
                sign = "+" if delta > 0 else ""
                changes.append(
                    f"Class count: {old_p['class_count']} → {new_p['class_count']} ({sign}{delta})"
                )

        # Check description change
        if old_p["description"] and new_p["description"]:
            if old_p["description"].lower() != new_p["description"].lower():
                changes.append(f"Description changed")

        if changes:
            changed[name] = changes
        else:
            unchanged.add(name)

    return {
        "added": sorted(added),
        "removed": sorted(removed),
        "changed": changed,
        "unchanged": sorted(unchanged),
        "old_total": len(old_names),
        "new_total": len(new_names),
    }


def format_report(delta: dict, old_path: str, new_path: str) -> str:
    """Format the delta as a markdown report."""
    lines = [
        "# Structure Diff Report",
        "",
        f"**Old**: `{old_path}`  ",
        f"**New**: `{new_path}`  ",
        f"**Old package count**: {delta['old_total']}  ",
        f"**New package count**: {delta['new_total']}  ",
        "",
    ]

    # Summary
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Added packages: **{len(delta['added'])}**")
    lines.append(f"- Removed packages: **{len(delta['removed'])}**")
    lines.append(f"- Changed packages: **{len(delta['changed'])}**")
    lines.append(f"- Unchanged packages: {len(delta['unchanged'])}")
    lines.append("")

    # Impact assessment
    needs_reaudit = set(delta["added"]) | set(delta["changed"].keys())
    lines.append("## Re-audit required")
    lines.append("")
    if needs_reaudit:
        lines.append("The following packages need re-analysis (new or changed):")
        lines.append("")
        for name in sorted(needs_reaudit):
            if name in delta["added"]:
                lines.append(f"- `{name}` — **NEW** (needs classification, WCAG check, architecture review)")
            else:
                changes = delta["changed"][name]
                lines.append(f"- `{name}` — {'; '.join(changes)}")
        lines.append("")
    else:
        lines.append("No packages need re-analysis. The structure is unchanged.")
        lines.append("")

    # Removed packages
    if delta["removed"]:
        lines.append("## Removed packages")
        lines.append("")
        lines.append("Verify these are intentionally removed. Update MODULE_CLASSIFICATIONS.md and affected stories.")
        lines.append("")
        for name in delta["removed"]:
            lines.append(f"- `{name}`")
        lines.append("")

    # Added packages
    if delta["added"]:
        lines.append("## Added packages")
        lines.append("")
        for name in delta["added"]:
            lines.append(f"- `{name}`")
        lines.append("")

    # Changed packages
    if delta["changed"]:
        lines.append("## Changed packages")
        lines.append("")
        for name, changes in sorted(delta["changed"].items()):
            lines.append(f"### `{name}`")
            for change in changes:
                lines.append(f"- {change}")
            lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Compare two PROJECT_STRUCTURE.md versions"
    )
    parser.add_argument("old", help="Path to the old PROJECT_STRUCTURE.md")
    parser.add_argument("new", help="Path to the new PROJECT_STRUCTURE.md")
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Write report to this file (default: print to stdout)"
    )
    args = parser.parse_args()

    with open(args.old, "r", encoding="utf-8") as f:
        old_content = f.read()
    with open(args.new, "r", encoding="utf-8") as f:
        new_content = f.read()

    old_packages = parse_packages(old_content)
    new_packages = parse_packages(new_content)

    print(f"Old: {len(old_packages)} packages parsed from {args.old}")
    print(f"New: {len(new_packages)} packages parsed from {args.new}")

    if not old_packages:
        print("WARNING: No packages parsed from old file. Check the format.")
    if not new_packages:
        print("WARNING: No packages parsed from new file. Check the format.")

    delta = compare(old_packages, new_packages)
    report = format_report(delta, args.old, args.new)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"\nReport written to {args.output}")
    else:
        print()
        print(report)


if __name__ == "__main__":
    main()

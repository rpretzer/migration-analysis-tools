#!/usr/bin/env python3
"""
Create Jira issues directly from story files via the Jira REST API.

This script replaces CSV import with direct API calls, correctly setting up
epic links, labels, story points, and dependency links.

Usage:
    # Create epics first
    python3 scripts/jira_sync.py --mode create-epics --input docs/JIRA_IMPORT.md

    # Create stories with epic links
    python3 scripts/jira_sync.py --mode create-stories --input stories/

    # Create dependency links from roadmap
    python3 scripts/jira_sync.py --mode create-links --input docs/ROADMAP.md

    # Dry run (prints what would be created, no API calls)
    python3 scripts/jira_sync.py --mode create-epics --input docs/JIRA_IMPORT.md --dry-run

Environment variables required:
    JIRA_URL       - e.g., https://yourcompany.atlassian.net
    JIRA_EMAIL     - e.g., service-account@company.com
    JIRA_API_TOKEN - API token from https://id.atlassian.com/manage-profile/security/api-tokens
    JIRA_PROJECT   - Project key, e.g., HOOP
"""

import json
import os
import re
import sys
import argparse
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package is required. Install with: pip3 install requests")
    sys.exit(1)


def get_jira_config() -> dict:
    """Read Jira configuration from environment variables."""
    required = ["JIRA_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT"]
    config = {}
    missing = []

    for var in required:
        value = os.environ.get(var)
        if not value:
            missing.append(var)
        config[var] = value

    if missing:
        print("ERROR: Missing required environment variables:")
        for var in missing:
            print(f"  export {var}=<value>")
        print()
        print("Set these before running, or use --dry-run to preview without API calls.")
        sys.exit(1)

    return config


def jira_request(config: dict, method: str, path: str, data: dict = None) -> dict:
    """Make an authenticated request to the Jira REST API."""
    url = f"{config['JIRA_URL']}/rest/api/3/{path}"
    auth = (config["JIRA_EMAIL"], config["JIRA_API_TOKEN"])
    headers = {"Content-Type": "application/json", "Accept": "application/json"}

    if method == "GET":
        resp = requests.get(url, auth=auth, headers=headers, timeout=30)
    elif method == "POST":
        resp = requests.post(url, auth=auth, headers=headers, json=data, timeout=30)
    else:
        raise ValueError(f"Unsupported method: {method}")

    if resp.status_code >= 400:
        print(f"  API Error {resp.status_code}: {resp.text[:500]}")
        return None

    return resp.json() if resp.text else {}


def parse_epics_from_md(filepath: str) -> list[dict]:
    """Parse epic entries from JIRA_IMPORT.md."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    epics = []
    blocks = re.split(r"\n---\n", content)

    for block in blocks:
        if "**Issue Type:** Epic" not in block:
            continue

        epic = {}
        for line in block.splitlines():
            match = re.match(r"^\*\*(.+?):\*\*\s*(.*)", line.strip())
            if match:
                epic[match.group(1).strip()] = match.group(2).strip()

        if epic.get("Summary"):
            epics.append(epic)

    return epics


def parse_story_file(filepath: str) -> dict:
    """Parse a single story markdown file into a dictionary."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    story = {"_filename": os.path.basename(filepath), "_content": content}

    for line in content.splitlines():
        match = re.match(r"^\*\*(.+?):\*\*\s*(.*)", line.strip())
        if match:
            story[match.group(1).strip()] = match.group(2).strip()

    # Extract title from first H1
    h1_match = re.match(r"^#\s+(.+)", content)
    if h1_match and "Title" not in story:
        story["Title"] = h1_match.group(1).strip()

    return story


def create_epics(config: dict, md_path: str, dry_run: bool):
    """Create epic issues in Jira from JIRA_IMPORT.md."""
    epics = parse_epics_from_md(md_path)
    print(f"Found {len(epics)} epics to create")

    created = {}
    for epic in epics:
        summary = epic.get("Summary", "Untitled Epic")
        description = epic.get("Description", "")
        labels = [l.strip() for l in epic.get("Labels", "").split(",") if l.strip()]

        issue_data = {
            "fields": {
                "project": {"key": config["JIRA_PROJECT"]},
                "issuetype": {"name": "Epic"},
                "summary": summary,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": description}]
                    }]
                },
                "labels": labels,
            }
        }

        if dry_run:
            print(f"  [DRY RUN] Would create Epic: {summary}")
            print(f"            Labels: {labels}")
            created[summary] = f"DRY-{len(created)+1}"
        else:
            result = jira_request(config, "POST", "issue", issue_data)
            if result and "key" in result:
                key = result["key"]
                print(f"  Created: {key} — {summary}")
                created[summary] = key
            else:
                print(f"  FAILED: {summary}")

    # Write epic key mapping for use by create-stories
    mapping_path = os.path.join(os.path.dirname(md_path), ".epic_keys.json")
    with open(mapping_path, "w") as f:
        json.dump(created, f, indent=2)
    print(f"\nEpic key mapping written to {mapping_path}")

    return created


def create_stories(config: dict, stories_dir: str, dry_run: bool):
    """Create story issues in Jira from stories/*.md files."""
    # Load epic key mapping
    mapping_path = os.path.join("docs", ".epic_keys.json")
    epic_keys = {}
    if os.path.exists(mapping_path):
        with open(mapping_path) as f:
            epic_keys = json.load(f)
        print(f"Loaded epic mappings: {epic_keys}")
    else:
        print(f"WARNING: No epic key mapping found at {mapping_path}")
        print("  Run --mode create-epics first, or stories will be created without epic links.")

    # Map story prefixes to epic names
    prefix_to_epic = {
        "A-": "KMP Shared Module",
        "B-": "Android Modernization",
        "C-": "Observability and Refactoring",
        "D-": "Accessibility",
        "E-": "Test and Architecture Foundations",
    }

    stories_path = Path(stories_dir)
    story_files = sorted(stories_path.glob("*.md"))
    story_files = [f for f in story_files if f.name != ".gitkeep"]

    print(f"Found {len(story_files)} story files")

    created = {}
    for story_file in story_files:
        story = parse_story_file(str(story_file))

        summary = story.get("Title", story_file.stem.replace("_", " "))
        description = story.get("_content", "")

        # Determine epic link
        epic_name = None
        for prefix, name in prefix_to_epic.items():
            if story_file.name.startswith(prefix):
                epic_name = name
                break

        epic_key = epic_keys.get(epic_name)

        # Parse story points
        sp_str = story.get("Effort estimate", "0")
        try:
            story_points = int(re.search(r"\d+", sp_str).group())
        except (AttributeError, ValueError):
            story_points = 0

        # Parse labels from filename prefix
        labels = []
        if story_file.name.startswith("A-"):
            labels.append("kmp")
        elif story_file.name.startswith("B-"):
            labels.append("modernization")
        elif story_file.name.startswith("C-"):
            labels.append("observability")
        elif story_file.name.startswith("D-"):
            labels.append("accessibility")
        elif story_file.name.startswith("E-"):
            labels.append("foundations")

        issue_data = {
            "fields": {
                "project": {"key": config["JIRA_PROJECT"]},
                "issuetype": {"name": "Story"},
                "summary": summary,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": description[:30000]}]
                    }]
                },
                "labels": labels,
                "story_points": story_points,
            }
        }

        # Add epic link if available (field name varies by Jira instance)
        if epic_key:
            issue_data["fields"]["parent"] = {"key": epic_key}

        if dry_run:
            print(f"  [DRY RUN] Would create Story: {summary}")
            print(f"            Points: {story_points}, Epic: {epic_key or 'none'}, Labels: {labels}")
            created[story_file.stem] = f"DRY-{len(created)+1}"
        else:
            result = jira_request(config, "POST", "issue", issue_data)
            if result and "key" in result:
                key = result["key"]
                print(f"  Created: {key} — {summary} ({story_points} pts)")
                created[story_file.stem] = key
            else:
                print(f"  FAILED: {summary}")

    # Write story key mapping for use by create-links
    mapping_path = os.path.join("docs", ".story_keys.json")
    with open(mapping_path, "w") as f:
        json.dump(created, f, indent=2)
    print(f"\nStory key mapping written to {mapping_path}")
    print(f"Created: {len(created)} stories")


def create_links(config: dict, roadmap_path: str, dry_run: bool):
    """Create 'blocks' links between Jira issues based on ROADMAP.md dependencies."""
    # Load story key mappings
    mapping_path = os.path.join("docs", ".story_keys.json")
    if not os.path.exists(mapping_path):
        print(f"ERROR: No story key mapping at {mapping_path}. Run --mode create-stories first.")
        sys.exit(1)

    with open(mapping_path) as f:
        story_keys = json.load(f)

    # Parse dependency arrows from ROADMAP.md
    # This is a simplified parser for the ASCII dependency graph
    with open(roadmap_path, "r") as f:
        content = f.read()

    # Look for patterns like "0.5 Hilt foundation" → "1.4 Coroutines"
    # Expressed as "X.Y ... ──► ... X.Y" in the dependency flow section
    dep_pattern = re.compile(r"(\d+\.\d+)\s+.+?[─►]+\s+(\d+\.\d+)")

    dependencies = []
    for match in dep_pattern.finditer(content):
        from_item = match.group(1)
        to_item = match.group(2)
        dependencies.append((from_item, to_item))

    print(f"Found {len(dependencies)} dependency links")

    # Map roadmap item numbers to story file stems
    # Roadmap 0.2 → E-1, 0.5 → E-2, etc. (this mapping is project-specific)
    # For now, print what we found and let the user verify
    for from_item, to_item in dependencies:
        if dry_run:
            print(f"  [DRY RUN] {from_item} blocks {to_item}")
        else:
            print(f"  {from_item} blocks {to_item} (link creation requires item-to-Jira-key mapping)")

    if not dry_run:
        print("\nNOTE: Automatic link creation requires a mapping from roadmap item numbers")
        print("to Jira issue keys. This mapping is project-specific. Use the Jira MCP server")
        print("or create links manually after verifying the .story_keys.json mapping.")


def main():
    parser = argparse.ArgumentParser(description="Sync analysis artifacts to Jira via API")
    parser.add_argument(
        "--mode",
        required=True,
        choices=["create-epics", "create-stories", "create-links"],
        help="What to create in Jira"
    )
    parser.add_argument("--input", "-i", required=True, help="Input file or directory")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be created without making API calls"
    )
    args = parser.parse_args()

    if args.dry_run:
        config = {
            "JIRA_URL": "https://example.atlassian.net",
            "JIRA_EMAIL": "dry-run@example.com",
            "JIRA_API_TOKEN": "dry-run",
            "JIRA_PROJECT": "EXAMPLE",
        }
        print("=== DRY RUN MODE ===\n")
    else:
        config = get_jira_config()

    if args.mode == "create-epics":
        create_epics(config, args.input, args.dry_run)
    elif args.mode == "create-stories":
        create_stories(config, args.input, args.dry_run)
    elif args.mode == "create-links":
        create_links(config, args.input, args.dry_run)


if __name__ == "__main__":
    main()

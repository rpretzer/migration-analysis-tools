#!/usr/bin/env python3
"""
Batch-generate Figma Make prompt JSON files from user story markdown files.

Reads the detection report to determine which stories are UI-bearing,
then generates JSON prompts per CLAUDE.md §17.3 schema.

Usage:
    python3 scripts/generate_figma_prompts.py stories/ figma_prompts/
    python3 scripts/generate_figma_prompts.py stories/ figma_prompts/ --brand figma_prompts/_brand_constraints.json
"""

import json
import os
import re
import sys
import argparse
from pathlib import Path


# Default brand constraints from CLAUDE.md §17.5
DEFAULT_BRAND = {
    "typography": {
        "caption": "12sp",
        "body_small": "14sp",
        "body_medium": "16sp",
        "body_large": "18sp",
        "title_small": "20sp",
        "title_medium": "22sp",
    },
    "colors": {
        "primary": "#6366F1",
        "error": "#EF4444",
        "success": "#10B981",
        "secondary_text": "#6B7280",
        "background": "#F9FAFB",
        "surface": "#FFFFFF",
        "text_primary": "#121212",
    },
    "spacing": {
        "base_unit": "4px",
        "page_padding": "16px",
        "component_gap": "12px",
        "section_gap": "24px",
    },
    "components": {
        "corner_radius_card": "12px",
        "corner_radius_button": "8px",
        "min_button_height": "48dp",
        "min_input_height": "48dp",
        "min_tap_target": "48x48dp",
    },
}

# Detection triggers from CLAUDE.md §17.1
SCREEN_KEYWORDS = [
    "home", "settings", "search", "browse", "player", "audiobook",
    "video", "ebook", "profile", "registration", "help", "login",
    "details", "title", "playback", "tv", "leanback", "accept",
]

VISUAL_THEN_KEYWORDS = [
    "rendered", "displayed", "shown", "tapped", "navigated", "announced",
    "visible", "appears", "presents", "layout",
]

MIGRATION_KEYWORDS = [
    "compose", "swiftui", "leanback", "migrate", "rebuild",
]

STATE_KEYWORDS = [
    "empty", "loading", "error", "success", "default", "state",
]

# Code-only signals (do NOT generate prompt)
CODE_ONLY_KEYWORDS = [
    "database", "migration", "ci", "pipeline", "infrastructure",
    "credential", "rotate", "manifest", "di", "injection", "hilt",
    "async", "coroutine", "repository layer", "extract", "shared module",
    "kmp", "kotlin multiplatform", "planning", "orchestration", "batch",
]


def detect_ui_bearing(story: dict) -> tuple[bool, list[str]]:
    """Determine if a story is UI-bearing. Returns (is_ui, trigger_reasons)."""
    content = story.get("_content", "").lower()
    title = story.get("Title", "").lower()
    triggers = []

    # Trigger 1: Named screen
    for kw in SCREEN_KEYWORDS:
        if kw in title or kw in story.get("In scope", "").lower():
            triggers.append(f"Named screen: '{kw}'")
            break

    # Trigger 2: Visual Then clause
    ac_text = ""
    in_ac = False
    for line in content.splitlines():
        if "acceptance criteria" in line.lower():
            in_ac = True
        elif in_ac and line.strip().startswith("Then"):
            ac_text += line.lower() + " "

    for kw in VISUAL_THEN_KEYWORDS:
        if kw in ac_text:
            triggers.append(f"Visual Then clause: '{kw}'")
            break

    # Trigger 3: Framework migration
    for kw in MIGRATION_KEYWORDS:
        if kw in content:
            triggers.append(f"Framework migration: '{kw}'")
            break

    # Trigger 4: Multiple states
    state_count = sum(1 for kw in STATE_KEYWORDS if kw in content)
    if state_count >= 2:
        triggers.append(f"Multiple states ({state_count} state keywords found)")

    # Trigger 5: Accessibility layout changes
    if "tap target" in content or "contrast" in content or "focus order" in content:
        triggers.append("Accessibility layout change")

    # Trigger 6: Frame rate / rendering NFR
    if "frame rate" in content or "frame" in content.split("performance")[0] if "performance" in content else "":
        triggers.append("Performance/rendering NFR")

    # Check code-only exclusions
    is_code_only = False
    for kw in CODE_ONLY_KEYWORDS:
        if kw in title:
            is_code_only = True
            break

    is_ui = len(triggers) > 0 and not is_code_only
    return is_ui, triggers


def extract_screens(story: dict) -> list[str]:
    """Extract screen names mentioned in the story."""
    content = story.get("_content", "")
    title = story.get("Title", "")
    screens = set()

    for kw in SCREEN_KEYWORDS:
        pattern = re.compile(rf"\b{kw}\b", re.IGNORECASE)
        if pattern.search(title) or pattern.search(content):
            screens.add(kw.lower().replace(" ", "-"))

    return sorted(screens)


def parse_story_file(filepath: str) -> dict:
    """Parse a story markdown file into a dictionary."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    story = {"_filename": os.path.basename(filepath), "_content": content}

    # Extract H1 title
    h1 = re.match(r"^#\s+(.+)", content)
    if h1:
        story["Title"] = h1.group(1).strip()

    # Extract sections
    for line in content.splitlines():
        match = re.match(r"^\*\*(.+?):\*\*\s*(.*)", line.strip())
        if match:
            story[match.group(1).strip()] = match.group(2).strip()

    # Extract In scope section
    in_scope = []
    in_section = False
    for line in content.splitlines():
        if "**In scope:**" in line:
            in_section = True
            continue
        if in_section:
            if line.strip().startswith("- ["):
                in_scope.append(re.sub(r"^-\s*\[.\]\s*", "", line.strip()))
            elif line.strip().startswith("**"):
                break
    story["In scope"] = "\n".join(in_scope)

    # Extract acceptance criteria
    acs = []
    in_gherkin = False
    current_ac = []
    for line in content.splitlines():
        if line.strip() == "```" and in_gherkin:
            if current_ac:
                acs.append("\n".join(current_ac))
                current_ac = []
            in_gherkin = False
        elif line.strip() == "```":
            in_gherkin = True
        elif in_gherkin and line.strip().startswith(("Given", "When", "Then", "And")):
            current_ac.append(line.strip())
    story["_acceptance_criteria"] = acs

    return story


def generate_prompt(story: dict, screens: list[str], brand: dict) -> dict:
    """Generate a Figma Make prompt JSON from a story."""
    title = story.get("Title", "Untitled")
    context = story.get("Context / Background", "")
    in_scope = story.get("In scope", "")
    acs = story.get("_acceptance_criteria", [])

    # Build screen description
    screen_names = ", ".join(s.replace("-", " ").title() for s in screens) if screens else title

    # Build the Figma Make prompt
    colors = brand.get("colors", DEFAULT_BRAND["colors"])
    spacing = brand.get("spacing", DEFAULT_BRAND["spacing"])
    typography = brand.get("typography", DEFAULT_BRAND["typography"])
    components = brand.get("components", DEFAULT_BRAND["components"])

    prompt_parts = [
        f"Design a mobile screen for: {screen_names}.",
        f"App context: {context}" if context else "",
        "",
        f"Platform: Android/iOS phone. Base frame: 390 x 844.",
        "Top app bar with back arrow and screen title. Bottom navigation bar.",
        "",
        "Layout:",
        f"  - Horizontal page padding: {spacing.get('page_padding', '16px')}",
        f"  - Component gap: {spacing.get('component_gap', '12px')}",
        f"  - Section gap: {spacing.get('section_gap', '24px')}",
    ]

    if in_scope:
        prompt_parts.append("")
        prompt_parts.append("Key elements (from story scope):")
        for line in in_scope.split("\n"):
            if line.strip():
                prompt_parts.append(f"  - {line.strip()}")

    prompt_parts.extend([
        "",
        "States: Default state, Error state (show error message with retry button), Empty state (show placeholder message).",
        "",
        "Behavior:",
        "  - All interactive elements respond to tap with visual feedback.",
        "  - Navigation transitions use slide animation.",
        "",
        "Style:",
        f"  - Primary color: {colors.get('primary', '#6366F1')}",
        f"  - Error color: {colors.get('error', '#EF4444')}",
        f"  - Background: {colors.get('background', '#F9FAFB')}",
        f"  - Surface: {colors.get('surface', '#FFFFFF')}",
        f"  - Text primary: {colors.get('text_primary', '#121212')}",
        f"  - Body text: {typography.get('body_medium', '16sp')}",
        f"  - Card corner radius: {components.get('corner_radius_card', '12px')}",
        f"  - Button corner radius: {components.get('corner_radius_button', '8px')}",
        "  - Use auto layout on every frame.",
        "  - Material 3 design language.",
        "",
        f"All tap targets must be at least {components.get('min_tap_target', '48x48dp')}.",
        f"All body text at least {typography.get('body_small', '14sp')}.",
        "Colour contrast must meet WCAG AA: 4.5:1 for normal text, 3:1 for large text.",
        "",
        "First step: Create the default state with all layout elements positioned and styled.",
    ])

    figma_prompt = "\n".join(p for p in prompt_parts)

    # Build UI acceptance criteria
    ui_acs = []
    for ac in acs:
        # Include ACs that mention visual elements
        if any(kw in ac.lower() for kw in VISUAL_THEN_KEYWORDS + STATE_KEYWORDS):
            ui_acs.append(ac)

    if not ui_acs:
        ui_acs = [f"Given the {screen_names} screen is displayed\nWhen the user views the default state\nThen all elements are visible and correctly laid out"]

    # Build validation checklist
    checklist = [
        f"Layout spacing matches spec: page padding {spacing.get('page_padding', '16px')}, component gap {spacing.get('component_gap', '12px')}, section gap {spacing.get('section_gap', '24px')}",
        "All three states present: default, error, empty",
        f"All tap targets are at least {components.get('min_tap_target', '48x48dp')}",
        "Colour contrast meets WCAG AA: 4.5:1 normal text, 3:1 large text",
        f"Body text is at least {typography.get('body_small', '14sp')}",
        "Auto layout is applied to every frame",
        f"Card corners are {components.get('corner_radius_card', '12px')}, button corners are {components.get('corner_radius_button', '8px')}",
        "Responsive: content reflows correctly if frame width changes by ±50px",
    ]

    return {
        "ux_intent": f"Validate the layout, states, and interaction patterns for the {screen_names} screen as described in story '{title}'. The prototype should prove that the key user flows are visually clear and that accessibility requirements (tap targets, contrast, text sizing) are met.",
        "figma_make_prompt": figma_prompt,
        "ui_acceptance_criteria": ui_acs,
        "manual_validation_checklist": checklist,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Batch-generate Figma Make prompt JSONs from story files"
    )
    parser.add_argument("stories_dir", help="Directory containing story .md files")
    parser.add_argument("output_dir", help="Directory to write prompt .json files")
    parser.add_argument(
        "--brand", "-b",
        default=None,
        help="Path to brand constraints JSON (default: built-in defaults)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing JSON files"
    )
    args = parser.parse_args()

    # Load brand constraints
    brand = DEFAULT_BRAND
    if args.brand and os.path.exists(args.brand):
        with open(args.brand) as f:
            brand = json.load(f)
        print(f"Loaded brand constraints from {args.brand}")

    # Ensure output directory exists
    os.makedirs(args.output_dir, exist_ok=True)

    # Process all stories
    stories_path = Path(args.stories_dir)
    story_files = sorted(stories_path.glob("*.md"))
    story_files = [f for f in story_files if f.name != ".gitkeep"]

    ui_stories = []
    code_only = []

    for story_file in story_files:
        story = parse_story_file(str(story_file))
        is_ui, triggers = detect_ui_bearing(story)

        if is_ui:
            ui_stories.append((story, triggers))
        else:
            code_only.append(story)

    print(f"Total stories:    {len(story_files)}")
    print(f"UI-bearing:       {len(ui_stories)}")
    print(f"Code-only:        {len(code_only)}")
    print()

    # Generate prompts for UI-bearing stories
    generated = 0
    skipped = 0

    for story, triggers in ui_stories:
        screens = extract_screens(story)
        if not screens:
            screens = [story.get("_filename", "unknown").replace(".md", "").lower()]

        for screen in screens:
            output_file = os.path.join(args.output_dir, f"{screen}.json")

            if os.path.exists(output_file) and not args.force:
                print(f"SKIP  {screen}.json (exists, use --force to overwrite)")
                skipped += 1
                continue

            prompt_data = generate_prompt(story, [screen], brand)

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(prompt_data, f, indent=2, ensure_ascii=False)

            print(f"WROTE {screen}.json  (triggers: {', '.join(triggers[:2])})")
            generated += 1

    print()
    print(f"Generated: {generated}")
    print(f"Skipped:   {skipped}")

    # Print code-only stories for reference
    if code_only:
        print(f"\nCode-only stories (no prompt generated):")
        for story in code_only:
            print(f"  - {story.get('_filename', '?')}: {story.get('Title', '?')}")


if __name__ == "__main__":
    main()

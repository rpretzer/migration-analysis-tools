#!/usr/bin/env python3
"""
Log model usage and costs per analysis phase.

Tracks which models were used, approximate token counts, and duration
to inform future cost estimates and identify where model downgrades are safe.

Usage:
    # Log a session
    python3 scripts/cost_tracker.py --phase "Phase 2" --model opus --tokens 50000 --duration 45

    # Log with notes
    python3 scripts/cost_tracker.py --phase "Phase 4" --model sonnet --tokens 30000 --duration 20 --notes "Epic A stories"

    # View summary
    python3 scripts/cost_tracker.py --summary

    # View summary for a specific project
    python3 scripts/cost_tracker.py --summary --project hoopla

    # Export to CSV
    python3 scripts/cost_tracker.py --export costs.csv
"""

import csv
import json
import os
import sys
import argparse
from datetime import datetime

# Cost per 1M tokens (approximate, as of early 2026)
# These are input+output blended estimates. Update as pricing changes.
MODEL_COSTS_PER_1M_TOKENS = {
    "opus": 45.0,      # ~$15 input + $75 output, blended ~$45/M
    "sonnet": 9.0,     # ~$3 input + $15 output, blended ~$9/M
    "haiku": 2.0,      # ~$0.80 input + $4 output, blended ~$2/M
}

DEFAULT_LOG_PATH = "docs/cost_log.json"


def load_log(log_path: str) -> list[dict]:
    """Load the cost log from disk."""
    if os.path.exists(log_path):
        with open(log_path, "r") as f:
            return json.load(f)
    return []


def save_log(log_path: str, entries: list[dict]):
    """Save the cost log to disk."""
    os.makedirs(os.path.dirname(log_path) or ".", exist_ok=True)
    with open(log_path, "w") as f:
        json.dump(entries, f, indent=2)


def estimate_cost(model: str, tokens: int) -> float:
    """Estimate cost in USD based on model and token count."""
    rate = MODEL_COSTS_PER_1M_TOKENS.get(model.lower(), 0)
    return (tokens / 1_000_000) * rate


def add_entry(
    log_path: str,
    phase: str,
    model: str,
    tokens: int,
    duration: int,
    project: str = "",
    notes: str = "",
):
    """Add a new entry to the cost log."""
    entries = load_log(log_path)

    cost = estimate_cost(model, tokens)

    entry = {
        "date": datetime.now().isoformat(timespec="minutes"),
        "project": project,
        "phase": phase,
        "model": model.lower(),
        "tokens": tokens,
        "duration_minutes": duration,
        "estimated_cost_usd": round(cost, 2),
        "notes": notes,
    }

    entries.append(entry)
    save_log(log_path, entries)

    print(f"Logged: {phase} | {model} | {tokens:,} tokens | {duration} min | ${cost:.2f}")
    print(f"  Saved to {log_path}")


def show_summary(log_path: str, project_filter: str = ""):
    """Display a summary of all logged sessions."""
    entries = load_log(log_path)

    if not entries:
        print("No entries in cost log.")
        return

    if project_filter:
        entries = [e for e in entries if project_filter.lower() in e.get("project", "").lower()]

    # Group by phase
    phase_stats = {}
    model_stats = {}

    for entry in entries:
        phase = entry.get("phase", "Unknown")
        model = entry.get("model", "unknown")
        tokens = entry.get("tokens", 0)
        cost = entry.get("estimated_cost_usd", 0)
        duration = entry.get("duration_minutes", 0)

        if phase not in phase_stats:
            phase_stats[phase] = {"sessions": 0, "tokens": 0, "cost": 0, "duration": 0}
        phase_stats[phase]["sessions"] += 1
        phase_stats[phase]["tokens"] += tokens
        phase_stats[phase]["cost"] += cost
        phase_stats[phase]["duration"] += duration

        if model not in model_stats:
            model_stats[model] = {"sessions": 0, "tokens": 0, "cost": 0}
        model_stats[model]["sessions"] += 1
        model_stats[model]["tokens"] += tokens
        model_stats[model]["cost"] += cost

    total_cost = sum(s["cost"] for s in phase_stats.values())
    total_tokens = sum(s["tokens"] for s in phase_stats.values())
    total_duration = sum(s["duration"] for s in phase_stats.values())

    print("=" * 70)
    print("COST SUMMARY")
    if project_filter:
        print(f"  Project filter: {project_filter}")
    print(f"  Total sessions: {len(entries)}")
    print(f"  Total tokens:   {total_tokens:,}")
    print(f"  Total cost:     ${total_cost:.2f}")
    print(f"  Total duration: {total_duration} minutes ({total_duration/60:.1f} hours)")
    print("=" * 70)

    print("\nBy Phase:")
    print(f"  {'Phase':<25} {'Sessions':>8} {'Tokens':>12} {'Cost':>10} {'Minutes':>8}")
    print(f"  {'-'*25} {'-'*8} {'-'*12} {'-'*10} {'-'*8}")
    for phase, stats in sorted(phase_stats.items()):
        print(
            f"  {phase:<25} {stats['sessions']:>8} {stats['tokens']:>12,} "
            f"${stats['cost']:>9.2f} {stats['duration']:>8}"
        )

    print("\nBy Model:")
    print(f"  {'Model':<15} {'Sessions':>8} {'Tokens':>12} {'Cost':>10} {'$/1K tokens':>12}")
    print(f"  {'-'*15} {'-'*8} {'-'*12} {'-'*10} {'-'*12}")
    for model, stats in sorted(model_stats.items()):
        per_1k = (stats["cost"] / stats["tokens"] * 1000) if stats["tokens"] > 0 else 0
        print(
            f"  {model:<15} {stats['sessions']:>8} {stats['tokens']:>12,} "
            f"${stats['cost']:>9.2f} ${per_1k:>11.4f}"
        )

    # Cost optimization suggestions
    print("\nOptimization opportunities:")
    for model, stats in model_stats.items():
        if model == "opus" and stats["sessions"] > 3:
            print(
                f"  - {stats['sessions']} Opus sessions logged. "
                f"Review if any could use Sonnet (saves ~${stats['cost'] * 0.8:.2f})"
            )
        if model == "sonnet":
            # Check if any sonnet sessions are pure transforms
            transform_sessions = [
                e for e in entries
                if e.get("model") == "sonnet"
                and any(
                    kw in e.get("notes", "").lower()
                    for kw in ["csv", "export", "transform", "figma prompt", "template"]
                )
            ]
            if transform_sessions:
                savings = sum(
                    e.get("estimated_cost_usd", 0) * 0.78
                    for e in transform_sessions
                )
                print(
                    f"  - {len(transform_sessions)} Sonnet sessions appear to be transforms. "
                    f"Consider Haiku (saves ~${savings:.2f})"
                )


def export_csv(log_path: str, csv_path: str):
    """Export the cost log to CSV."""
    entries = load_log(log_path)

    if not entries:
        print("No entries to export.")
        return

    fieldnames = [
        "date", "project", "phase", "model", "tokens",
        "duration_minutes", "estimated_cost_usd", "notes",
    ]

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(entries)

    print(f"Exported {len(entries)} entries to {csv_path}")


def main():
    parser = argparse.ArgumentParser(description="Track model usage and costs")
    parser.add_argument("--phase", help="Analysis phase (e.g., 'Phase 2', 'Story generation')")
    parser.add_argument("--model", choices=["opus", "sonnet", "haiku"], help="Model used")
    parser.add_argument("--tokens", type=int, help="Approximate token count")
    parser.add_argument("--duration", type=int, help="Session duration in minutes")
    parser.add_argument("--project", default="", help="Project name (e.g., 'hoopla')")
    parser.add_argument("--notes", default="", help="Optional notes about the session")
    parser.add_argument("--summary", action="store_true", help="Show cost summary")
    parser.add_argument("--export", metavar="CSV_PATH", help="Export log to CSV")
    parser.add_argument(
        "--log",
        default=DEFAULT_LOG_PATH,
        help=f"Path to cost log JSON (default: {DEFAULT_LOG_PATH})"
    )

    args = parser.parse_args()

    if args.summary:
        show_summary(args.log, args.project)
    elif args.export:
        export_csv(args.log, args.export)
    elif args.phase and args.model and args.tokens is not None and args.duration is not None:
        add_entry(args.log, args.phase, args.model, args.tokens, args.duration, args.project, args.notes)
    else:
        parser.print_help()
        print("\nExamples:")
        print('  python3 scripts/cost_tracker.py --phase "Phase 2" --model opus --tokens 50000 --duration 45')
        print("  python3 scripts/cost_tracker.py --summary")
        print("  python3 scripts/cost_tracker.py --export costs.csv")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Post-Launch Evaluation Tool

Measures actual performance against business case projections,
calculates variance, and incorporates key learnings for future projects.

Analysis methodology (c) RSP Management Solutions LLC.
No assumption of ownership of client intellectual property.

Usage:
    # Generate a template for capturing actuals
    python3 scripts/post_launch_evaluation.py --template --business-case docs/BUSINESS_CASE_input.json

    # Run evaluation with actuals
    python3 scripts/post_launch_evaluation.py --actuals post_launch_actuals.json --business-case docs/BUSINESS_CASE_input.json

    # Output to specific file
    python3 scripts/post_launch_evaluation.py --actuals actuals.json --business-case input.json --output docs/POST_LAUNCH_EVALUATION.md
"""

import json
import os
import sys
import argparse
from datetime import datetime


def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_actuals_template(business_case: dict) -> dict:
    """Generate a template JSON for capturing actual results."""
    template = {
        "_instructions": "Fill in actual values observed post-launch. "
                         "Leave null for metrics not yet measured. "
                         "(c) RSP Management Solutions LLC.",
        "evaluation_date": datetime.now().strftime("%Y-%m-%d"),
        "evaluation_period": "Phase 0 + Phase 1 (Sprints 1–10)",
        "actual_duration_months": None,
        "actual_total_cost_usd": None,
        "actual_additional_headcount": None,
        "actual_team_changes": "",
        "kpis": {},
        "milestones": {
            "phase_0_complete_date": None,
            "phase_1_complete_date": None,
            "phase_2_started": False,
            "phase_2_items_completed": [],
        },
        "critical_path_performance": {
            "items_on_schedule": [],
            "items_slipped": [],
            "slip_reasons": [],
        },
        "risks_materialized": [],
        "opportunities_realized": [],
        "key_learnings": [],
        "process_improvements": [],
    }

    # Pre-populate KPI template from business case
    for category, kpis in business_case.get("kpis", {}).items():
        template["kpis"][category] = []
        for kpi in kpis:
            template["kpis"][category].append({
                "name": kpi["name"],
                "unit": kpi["unit"],
                "projected_baseline": kpi.get("baseline_typical"),
                "projected_target": kpi.get("target_typical"),
                "actual_baseline": None,
                "actual_current": None,
                "notes": "",
            })

    return template


def calculate_variance(projected: float, actual: float, lower_is_better: bool = False) -> dict:
    """Calculate variance between projected and actual values."""
    if projected is None or actual is None:
        return {"variance": None, "variance_pct": None, "status": "not_measured"}

    variance = actual - projected
    variance_pct = (variance / projected * 100) if projected != 0 else 0

    if lower_is_better:
        if actual <= projected:
            status = "on_track" if abs(variance_pct) <= 10 else "ahead"
        else:
            status = "behind" if variance_pct <= 20 else "at_risk"
    else:
        if actual >= projected:
            status = "on_track" if abs(variance_pct) <= 10 else "ahead"
        else:
            status = "behind" if abs(variance_pct) <= 20 else "at_risk"

    return {
        "variance": round(variance, 2),
        "variance_pct": round(variance_pct, 1),
        "status": status,
    }


def status_emoji(status: str) -> str:
    """Map status to a text indicator (no actual emoji per CLAUDE.md convention)."""
    return {
        "ahead": "[AHEAD]",
        "on_track": "[ON TRACK]",
        "behind": "[BEHIND]",
        "at_risk": "[AT RISK]",
        "not_measured": "[NOT MEASURED]",
    }.get(status, "[?]")


def generate_evaluation(business_case: dict, actuals: dict) -> str:
    """Generate the full post-launch evaluation document."""
    lines = [
        f"# Post-Launch Evaluation: {business_case.get('project_name', 'Mobile Migration')}",
        "",
        f"**Client:** {business_case.get('client_name', 'Client')}  ",
        f"**Evaluation date:** {actuals.get('evaluation_date', datetime.now().strftime('%Y-%m-%d'))}  ",
        f"**Evaluation period:** {actuals.get('evaluation_period', 'TBD')}  ",
        f"**Prepared by:** RSP Management Solutions LLC  ",
        "",
        "_Analysis methodology (c) RSP Management Solutions LLC. "
        "No assumption of ownership of client intellectual property._",
        "",
        "---",
        "",
        "## 1. Financial Performance",
        "",
    ]

    # Financial variance
    projected_cost = business_case.get("investment", {}).get("total_migration_cost_usd")
    actual_cost = actuals.get("actual_total_cost_usd")
    projected_duration = business_case.get("investment", {}).get("migration_duration_months")
    actual_duration = actuals.get("actual_duration_months")

    cost_var = calculate_variance(projected_cost, actual_cost, lower_is_better=True)
    duration_var = calculate_variance(projected_duration, actual_duration, lower_is_better=True)

    lines.extend([
        "| Metric | Projected | Actual | Variance | Status |",
        "|--------|----------|--------|----------|--------|",
    ])

    if projected_cost is not None:
        actual_str = f"${actual_cost:,}" if actual_cost else "TBD"
        var_str = f"${cost_var['variance']:,} ({cost_var['variance_pct']:+.1f}%)" if cost_var["variance"] is not None else "—"
        lines.append(
            f"| Total cost | ${projected_cost:,} | {actual_str} | {var_str} | {status_emoji(cost_var['status'])} |"
        )

    if projected_duration is not None:
        actual_str = f"{actual_duration} months" if actual_duration else "TBD"
        var_str = f"{duration_var['variance']:+.1f} months ({duration_var['variance_pct']:+.1f}%)" if duration_var["variance"] is not None else "—"
        lines.append(
            f"| Duration | {projected_duration} months | {actual_str} | {var_str} | {status_emoji(duration_var['status'])} |"
        )

    lines.extend(["", "---", "", "## 2. KPI Performance vs Projections", ""])

    # KPI comparison
    lower_is_better_kpis = {
        "App cold start time", "Mean time to resolve (P1 bugs)",
        "Feature parity gap (iOS vs Android)", "Time to ship a feature (both platforms)",
        "Engineering cost per feature", "Support tickets (app-related)",
    }

    for category, kpis in actuals.get("kpis", {}).items():
        lines.extend([
            f"### {category.title()}",
            "",
            "| KPI | Projected Baseline | Projected Target | Actual Baseline | Actual Current | Variance vs Target | Status |",
            "|-----|-------------------|-----------------|----------------|---------------|-------------------|--------|",
        ])

        for kpi in kpis:
            name = kpi["name"]
            p_baseline = kpi.get("projected_baseline", "—")
            p_target = kpi.get("projected_target", "—")
            a_baseline = kpi.get("actual_baseline", "—")
            a_current = kpi.get("actual_current", "—")
            lib = name in lower_is_better_kpis

            var = calculate_variance(
                kpi.get("projected_target"),
                kpi.get("actual_current"),
                lower_is_better=lib,
            )

            var_str = f"{var['variance_pct']:+.1f}%" if var["variance_pct"] is not None else "—"

            lines.append(
                f"| {name} | {p_baseline} | {p_target} | "
                f"{a_baseline if a_baseline is not None else '—'} | "
                f"{a_current if a_current is not None else '—'} | "
                f"{var_str} | {status_emoji(var['status'])} |"
            )

            if kpi.get("notes"):
                lines.append(f"| | | | | | _{kpi['notes']}_ | |")

        lines.append("")

    # Scenario determination
    lines.extend([
        "---",
        "",
        "## 3. Scenario Determination",
        "",
        "Which projected scenario most closely matches actual results?",
        "",
    ])

    if cost_var["variance_pct"] is not None and duration_var["variance_pct"] is not None:
        cost_o = cost_var["variance_pct"]
        time_o = duration_var["variance_pct"]

        if cost_o <= 5 and time_o <= 5:
            scenario_match = "Highly Favorable"
            scenario_note = "Actual performance matches or exceeds the most optimistic projection."
        elif cost_o <= 15 and time_o <= 20:
            scenario_match = "Likely"
            scenario_note = "Actual performance is within the expected range."
        else:
            scenario_match = "Unfavorable"
            scenario_note = "Actual performance reflects the downside scenario. Review mitigations."

        lines.extend([
            f"**Closest match: {scenario_match}**",
            "",
            scenario_note,
            "",
        ])
    else:
        lines.extend(["_Insufficient data to determine scenario match. Complete cost and duration actuals._", ""])

    # Milestones
    lines.extend(["---", "", "## 4. Milestone Status", ""])
    milestones = actuals.get("milestones", {})
    lines.append(f"- Phase 0 completion: {milestones.get('phase_0_complete_date', 'TBD')}")
    lines.append(f"- Phase 1 completion: {milestones.get('phase_1_complete_date', 'TBD')}")
    lines.append(f"- Phase 2 started: {'Yes' if milestones.get('phase_2_started') else 'No'}")
    if milestones.get("phase_2_items_completed"):
        lines.append(f"- Phase 2 items completed: {', '.join(milestones['phase_2_items_completed'])}")
    lines.append("")

    # Critical path performance
    cp = actuals.get("critical_path_performance", {})
    if cp.get("items_on_schedule") or cp.get("items_slipped"):
        lines.extend(["---", "", "## 5. Critical Path Performance", ""])

        if cp.get("items_on_schedule"):
            lines.append("**On schedule:**")
            for item in cp["items_on_schedule"]:
                lines.append(f"- {item}")
            lines.append("")

        if cp.get("items_slipped"):
            lines.append("**Slipped:**")
            for item in cp["items_slipped"]:
                lines.append(f"- {item}")
            lines.append("")

        if cp.get("slip_reasons"):
            lines.append("**Root causes of slips:**")
            for reason in cp["slip_reasons"]:
                lines.append(f"- {reason}")
            lines.append("")

    # Risks materialized
    risks = actuals.get("risks_materialized", [])
    if risks:
        lines.extend(["---", "", "## 6. Risks Materialized", ""])
        lines.append("| Risk | Impact | Response | Outcome |")
        lines.append("|------|--------|----------|---------|")
        for risk in risks:
            if isinstance(risk, dict):
                lines.append(
                    f"| {risk.get('risk', '')} | {risk.get('impact', '')} "
                    f"| {risk.get('response', '')} | {risk.get('outcome', '')} |"
                )
            else:
                lines.append(f"| {risk} | | | |")
        lines.append("")

    # Opportunities realized
    opps = actuals.get("opportunities_realized", [])
    if opps:
        lines.extend(["---", "", "## 7. Opportunities Realized", ""])
        for opp in opps:
            lines.append(f"- {opp}")
        lines.append("")

    # Key learnings
    learnings = actuals.get("key_learnings", [])
    if learnings:
        lines.extend(["---", "", "## 8. Key Learnings", ""])
        for i, learning in enumerate(learnings, 1):
            lines.append(f"{i}. {learning}")
        lines.append("")

    # Process improvements
    improvements = actuals.get("process_improvements", [])
    if improvements:
        lines.extend(["---", "", "## 9. Process Improvements for Next Engagement", ""])
        for improvement in improvements:
            lines.append(f"- {improvement}")
        lines.append("")

    # Estimation accuracy
    lines.extend([
        "---",
        "",
        "## 10. Estimation Accuracy Assessment",
        "",
        "To be completed after all phases. Compares story-point estimates to actual effort.",
        "",
        "| Epic | Estimated SP | Actual SP | Accuracy |",
        "|------|-------------|-----------|----------|",
        "| KMP Shared Module | 34 | TBD | TBD |",
        "| Android Modernization | 148 | TBD | TBD |",
        "| Observability | 16 | TBD | TBD |",
        "| Accessibility | 15 | TBD | TBD |",
        "| Foundations | 10 | TBD | TBD |",
        "| **Total** | **223** | **TBD** | **TBD** |",
        "",
        "---",
        "",
        "_Analysis methodology (c) RSP Management Solutions LLC. "
        "Post-launch evaluation compares projected outcomes to observed actuals "
        "using variance analysis and scenario matching. "
        "No assumption of ownership of Midwest Tape intellectual property._",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Post-launch evaluation: measure actuals against projections. "
                    "(c) RSP Management Solutions LLC."
    )
    parser.add_argument(
        "--business-case", "-b",
        required=True,
        help="Path to the business case input JSON (from business_case_generator.py)"
    )
    parser.add_argument(
        "--actuals", "-a",
        help="Path to JSON file with actual observed values"
    )
    parser.add_argument(
        "--template", "-t",
        action="store_true",
        help="Generate a template for capturing actuals"
    )
    parser.add_argument(
        "--output", "-o",
        default="docs/POST_LAUNCH_EVALUATION.md",
        help="Output markdown file"
    )
    args = parser.parse_args()

    business_case = load_json(args.business_case)

    if args.template:
        template = generate_actuals_template(business_case)
        template_path = "post_launch_actuals.json"
        with open(template_path, "w") as f:
            json.dump(template, f, indent=2)
        print(f"Actuals template written to {template_path}")
        print("Fill in observed values, then run:")
        print(f"  python3 scripts/post_launch_evaluation.py --actuals {template_path} --business-case {args.business_case}")
        return

    if not args.actuals:
        print("ERROR: --actuals is required (or use --template to generate a template)")
        sys.exit(1)

    actuals = load_json(args.actuals)
    document = generate_evaluation(business_case, actuals)

    # Archive previous version before overwriting
    if os.path.isfile(args.output):
        try:
            from archive import archive_before_write
            archive_before_write(args.output)
        except ImportError:
            pass

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(document)

    print(f"Post-launch evaluation written to {args.output}")


if __name__ == "__main__":
    main()

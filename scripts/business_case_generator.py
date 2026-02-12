#!/usr/bin/env python3
"""
Business Case Generator for Mobile Migration Projects

Generates a structured business case document with improvement projections,
KPIs, weighted scenario analysis, key financials, and risk/opportunity evaluation.

Analysis methodology (c) RSP Management Solutions LLC.
No assumption of ownership of client intellectual property.

Usage:
    # Interactive mode — prompts for inputs
    python3 scripts/business_case_generator.py

    # From a JSON input file
    python3 scripts/business_case_generator.py --input business_case_input.json

    # With custom output path
    python3 scripts/business_case_generator.py --input input.json --output docs/BUSINESS_CASE.md
"""

import json
import os
import sys
import argparse
from datetime import datetime


# ── Scenario weights (c) RSP Management Solutions LLC ──
# Based on industry-standard three-point estimation methodology
# adapted for mobile platform migration risk profiles.
SCENARIO_WEIGHTS = {
    "unfavorable": 0.20,
    "likely": 0.60,
    "highly_favorable": 0.20,
}

# ── Default KPI frameworks ──
DEFAULT_KPIS = {
    "engineering": [
        {
            "name": "Crash-free session rate",
            "unit": "%",
            "baseline_typical": 98.5,
            "target_typical": 99.5,
            "measurement": "Bugsnag / Firebase Crashlytics",
        },
        {
            "name": "App cold start time",
            "unit": "ms",
            "baseline_typical": 2500,
            "target_typical": 1500,
            "measurement": "Firebase Performance / custom instrumentation",
        },
        {
            "name": "Code shared via KMP",
            "unit": "%",
            "baseline_typical": 0,
            "target_typical": 40,
            "measurement": "Module line count ratio",
        },
        {
            "name": "Automated test coverage",
            "unit": "%",
            "baseline_typical": 5,
            "target_typical": 60,
            "measurement": "JaCoCo / Kover on CI",
        },
        {
            "name": "Mean time to resolve (P1 bugs)",
            "unit": "hours",
            "baseline_typical": 72,
            "target_typical": 24,
            "measurement": "Jira resolution time",
        },
    ],
    "product": [
        {
            "name": "WCAG AA compliance",
            "unit": "%",
            "baseline_typical": 42,
            "target_typical": 95,
            "measurement": "Manual audit + automated linting",
        },
        {
            "name": "App Store rating",
            "unit": "stars",
            "baseline_typical": 3.8,
            "target_typical": 4.3,
            "measurement": "Google Play / App Store",
        },
        {
            "name": "Feature parity gap (iOS vs Android)",
            "unit": "features behind",
            "baseline_typical": 8,
            "target_typical": 0,
            "measurement": "Feature matrix audit",
        },
    ],
    "business": [
        {
            "name": "Time to ship a feature (both platforms)",
            "unit": "weeks",
            "baseline_typical": 6,
            "target_typical": 3,
            "measurement": "Jira cycle time",
        },
        {
            "name": "Engineering cost per feature",
            "unit": "person-weeks",
            "baseline_typical": 8,
            "target_typical": 5,
            "measurement": "Jira + time tracking",
        },
        {
            "name": "Support tickets (app-related)",
            "unit": "tickets/month",
            "baseline_typical": 150,
            "target_typical": 80,
            "measurement": "Helpdesk system",
        },
    ],
}


def get_default_input() -> dict:
    """Return a template input structure with defaults."""
    return {
        "project_name": "Mobile App Migration",
        "client_name": "Client",
        "prepared_by": "RSP Management Solutions LLC",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "objective": "Modernize legacy mobile applications via KMP shared modules, "
                     "MVVM architecture, Jetpack Compose, and WCAG AA accessibility compliance.",
        "baseline": {
            "description": "Current state assessment from codebase analysis",
            "team_size": 4,
            "annual_engineering_cost_usd": 600000,
            "current_platforms": ["Android"],
            "planned_platforms": ["Android", "iOS"],
            "known_pain_points": [
                "No code sharing between platforms",
                "Legacy async patterns (AsyncTask)",
                "No dependency injection",
                "Near-zero test coverage",
                "WCAG AA compliance at ~42%",
            ],
        },
        "investment": {
            "migration_duration_months": 4,
            "additional_headcount": 1,
            "tooling_cost_usd": 5000,
            "training_cost_usd": 10000,
            "total_migration_cost_usd": None,  # Calculated
        },
        "kpis": DEFAULT_KPIS,
        "scenarios": {
            "unfavorable": {
                "description": "Critical path items slip 2+ sprints. KMP extraction "
                               "reveals hidden platform dependencies. One senior dev leaves.",
                "cost_overrun_pct": 30,
                "timeline_overrun_pct": 40,
                "benefit_realization_pct": 50,
            },
            "likely": {
                "description": "One critical path item slips 1 sprint. KMP extraction "
                               "proceeds with minor serialization issues. Team is stable.",
                "cost_overrun_pct": 10,
                "timeline_overrun_pct": 15,
                "benefit_realization_pct": 80,
            },
            "highly_favorable": {
                "description": "No critical path slips. KMP extraction is clean. "
                               "Team ramps quickly on new patterns. Early wins build momentum.",
                "cost_overrun_pct": 0,
                "timeline_overrun_pct": 0,
                "benefit_realization_pct": 100,
            },
        },
        "risks": [],
        "opportunities": [],
    }


def calculate_financials(data: dict) -> dict:
    """Calculate key financial projections."""
    baseline = data["baseline"]
    investment = data["investment"]

    team_size = baseline["team_size"]
    annual_cost = baseline["annual_engineering_cost_usd"]
    monthly_cost_per_dev = annual_cost / team_size / 12
    duration = investment["migration_duration_months"]
    additional = investment.get("additional_headcount", 0)

    # Migration cost
    migration_labor = (team_size + additional) * monthly_cost_per_dev * duration
    tooling = investment.get("tooling_cost_usd", 0)
    training = investment.get("training_cost_usd", 0)
    total_migration = migration_labor + tooling + training
    investment["total_migration_cost_usd"] = round(total_migration)

    # Incremental cost (only the additional spend beyond BAU)
    bau_cost = team_size * monthly_cost_per_dev * duration
    incremental_cost = total_migration - bau_cost

    # Projected annual savings post-migration
    # Based on: 40% reduction in dual-platform development time,
    # 30% reduction in bug-fix time, 50% reduction in support tickets
    savings_dual_platform = annual_cost * 0.25  # 25% of eng cost saved by code sharing
    savings_quality = annual_cost * 0.10  # 10% saved by better architecture + tests
    savings_support = baseline.get("support_cost_usd", annual_cost * 0.05) * 0.50
    annual_savings = savings_dual_platform + savings_quality + savings_support

    # Scenario-weighted NPV (simplified 3-year horizon, 10% discount rate)
    discount_rate = 0.10
    scenarios_npv = {}
    for scenario_name, scenario in data["scenarios"].items():
        realization = scenario["benefit_realization_pct"] / 100
        overrun = scenario["cost_overrun_pct"] / 100
        adjusted_savings = annual_savings * realization
        adjusted_cost = total_migration * (1 + overrun)
        npv = -adjusted_cost
        for year in range(1, 4):
            npv += adjusted_savings / ((1 + discount_rate) ** year)
        scenarios_npv[scenario_name] = round(npv)

    weighted_npv = sum(
        scenarios_npv[s] * SCENARIO_WEIGHTS[s] for s in scenarios_npv
    )

    # Payback period (months)
    monthly_savings = annual_savings / 12
    payback_months = round(total_migration / monthly_savings) if monthly_savings > 0 else None

    return {
        "total_migration_cost": round(total_migration),
        "incremental_cost": round(incremental_cost),
        "bau_cost_during_migration": round(bau_cost),
        "annual_savings_projected": round(annual_savings),
        "monthly_cost_per_dev": round(monthly_cost_per_dev),
        "scenarios_npv": scenarios_npv,
        "weighted_npv": round(weighted_npv),
        "payback_months": payback_months,
        "savings_breakdown": {
            "code_sharing": round(savings_dual_platform),
            "quality_improvement": round(savings_quality),
            "support_reduction": round(savings_support),
        },
    }


def generate_kpi_section(kpis: dict) -> str:
    """Generate the KPI tables."""
    lines = []
    for category, items in kpis.items():
        lines.append(f"### {category.title()} KPIs")
        lines.append("")
        lines.append("| KPI | Unit | Baseline | Target | Improvement | Measurement |")
        lines.append("|-----|------|----------|--------|-------------|-------------|")
        for kpi in items:
            baseline = kpi.get("baseline_typical", "TBD")
            target = kpi.get("target_typical", "TBD")
            if isinstance(baseline, (int, float)) and isinstance(target, (int, float)):
                if kpi["unit"] in ("%", "stars"):
                    improvement = f"+{target - baseline:.1f}"
                else:
                    pct = ((baseline - target) / baseline * 100) if baseline != 0 else 0
                    improvement = f"-{pct:.0f}%"
            else:
                improvement = "—"
            lines.append(
                f"| {kpi['name']} | {kpi['unit']} | {baseline} | {target} | {improvement} | {kpi['measurement']} |"
            )
        lines.append("")
    return "\n".join(lines)


def generate_scenario_section(data: dict, financials: dict) -> str:
    """Generate the weighted scenario analysis."""
    lines = [
        "## Weighted Scenario Analysis",
        "",
        "Scenarios weighted using three-point estimation: Unfavorable (20%), "
        "Likely (60%), Highly Favorable (20%).",
        "",
        "| Scenario | Weight | Description | Cost Overrun | Timeline Overrun | Benefit Realization | 3-Year NPV |",
        "|----------|--------|-------------|-------------|-----------------|--------------------:|----------:|",
    ]

    for name, weight in SCENARIO_WEIGHTS.items():
        scenario = data["scenarios"][name]
        npv = financials["scenarios_npv"][name]
        label = name.replace("_", " ").title()
        lines.append(
            f"| {label} | {weight:.0%} | {scenario['description'][:80]}... "
            f"| +{scenario['cost_overrun_pct']}% | +{scenario['timeline_overrun_pct']}% "
            f"| {scenario['benefit_realization_pct']}% | ${npv:,} |"
        )

    lines.extend([
        "",
        f"**Weighted NPV (3-year horizon, 10% discount rate): ${financials['weighted_npv']:,}**",
        "",
    ])
    return "\n".join(lines)


def generate_business_case(data: dict) -> str:
    """Generate the full business case document."""
    financials = calculate_financials(data)

    total_cost = f"${financials['total_migration_cost']:,}"
    incr_cost = f"${financials['incremental_cost']:,}"
    annual_sav = f"${financials['annual_savings_projected']:,}"
    weighted = f"${financials['weighted_npv']:,}"
    annual_eng = f"${data['baseline']['annual_engineering_cost_usd']:,}"
    payback = f"**Payback period:** {financials['payback_months']} months" if financials.get('payback_months') else ""

    lines = [
        "# Business Case: " + data['project_name'],
        "",
        "**Client:** " + data['client_name'] + "  ",
        "**Prepared by:** " + data['prepared_by'] + "  ",
        "**Date:** " + data['date'] + "  ",
        "",
        "_Analysis methodology (c) RSP Management Solutions LLC. No assumption of ownership of client intellectual property._",
        "",
        "---",
        "",
        "## Executive Summary",
        "",
        "**Objective:** " + data['objective'],
        "",
        "**Total investment:** " + total_cost + " (" + incr_cost + " incremental over BAU)",
        "**Projected annual savings:** " + annual_sav,
        payback,
        "**Weighted 3-year NPV:** " + weighted,
        "",
        "---",
        "",
        "## Current State (Baseline)",
        "",
        data['baseline']['description'],
        "",
        "- **Team size:** " + str(data['baseline']['team_size']) + " developers",
        "- **Annual engineering cost:** " + annual_eng,
        "- **Current platforms:** " + ", ".join(data['baseline']['current_platforms']),
        "- **Target platforms:** " + ", ".join(data['baseline']['planned_platforms']),
        "",
        "### Known pain points",
        "",
    ]

    for pain in data["baseline"].get("known_pain_points", []):
        lines.append(f"- {pain}")

    # Pre-compute formatted values to avoid f-string parsing issues
    team_sz = data['baseline']['team_size']
    add_hc = data['investment'].get('additional_headcount', 0)
    dur_mo = data['investment']['migration_duration_months']
    tooling_cost = data['investment'].get('tooling_cost_usd', 0)
    training_cost = data['investment'].get('training_cost_usd', 0)
    labor_cost = financials['total_migration_cost'] - tooling_cost - training_cost
    total_mig = format(financials['total_migration_cost'], ',')
    bau_during = format(financials['bau_cost_during_migration'], ',')
    incr_cost = format(financials['incremental_cost'], ',')
    sav_code = format(financials['savings_breakdown']['code_sharing'], ',')
    sav_qual = format(financials['savings_breakdown']['quality_improvement'], ',')
    sav_supp = format(financials['savings_breakdown']['support_reduction'], ',')
    sav_total = format(financials['annual_savings_projected'], ',')
    npv_unf = format(financials['scenarios_npv']['unfavorable'], ',')
    npv_lik = format(financials['scenarios_npv']['likely'], ',')
    npv_fav = format(financials['scenarios_npv']['highly_favorable'], ',')
    npv_wgt = format(financials['weighted_npv'], ',')
    payback_line = ("| Payback period | " + str(financials['payback_months']) + " months |"
                    if financials.get('payback_months')
                    else "| Payback period | N/A |")

    lines.extend([
        "",
        "---",
        "",
        "## Investment Required",
        "",
        "| Component | Amount |",
        "|-----------|-------:|",
        "| Engineering labor (" + str(team_sz) + " + " + str(add_hc) + " devs x " + str(dur_mo) + " months) | $" + format(labor_cost, ',') + " |",
        "| Tooling and infrastructure | $" + format(tooling_cost, ',') + " |",
        "| Training and ramp-up | $" + format(training_cost, ',') + " |",
        "| **Total** | **$" + total_mig + "** |",
        "| Less: BAU cost during period | -$" + bau_during + " |",
        "| **Incremental investment** | **$" + incr_cost + "** |",
        "",
        "---",
        "",
        "## Projected Annual Savings (Post-Migration)",
        "",
        "| Source | Annual Savings | Basis |",
        "|-------|-------------:|-------|",
        "| Code sharing (KMP) | $" + sav_code + " | ~25% reduction in dual-platform development effort |",
        "| Quality improvement | $" + sav_qual + " | Fewer bugs, faster resolution via modern architecture + tests |",
        "| Support reduction | $" + sav_supp + " | ~50% fewer app-related support tickets |",
        "| **Total** | **$" + sav_total + "** | |",
        "",
        "---",
        "",
        "## KPIs and Improvement Targets",
        "",
        generate_kpi_section(data["kpis"]),
        "---",
        "",
        generate_scenario_section(data, financials),
        "---",
        "",
        "## Key Financials Summary",
        "",
        "| Metric | Value |",
        "|--------|------:|",
        "| Total migration cost | $" + total_mig + " |",
        "| Incremental cost over BAU | $" + incr_cost + " |",
        "| Annual projected savings | $" + sav_total + " |",
        payback_line,
        "| 3-year NPV (unfavorable) | $" + npv_unf + " |",
        "| 3-year NPV (likely) | $" + npv_lik + " |",
        "| 3-year NPV (highly favorable) | $" + npv_fav + " |",
        "| 3-year NPV (weighted) | $" + npv_wgt + " |",
        "",
        "---",
        "",
        "## Risks",
        "",
        "| # | Risk | Likelihood | Impact | Mitigation |",
        "|---|------|-----------|--------|------------|",
    ])

    default_risks = [
        ("KMP skill gap delays extraction", "Medium", "High",
         "Run a week-1 spike; engage a KMP consultant if needed"),
        ("Critical path slip on coroutines migration", "Medium", "High",
         "Architect owns the pattern; buffer sprint allocated"),
        ("Ebook reader production bug pulls resources", "Low", "High",
         "Explicitly out of scope; separate on-call rotation"),
        ("Serialization contract breaks during Gson→kotlinx migration", "Medium", "Medium",
         "Golden-file tests for every API response; run in parallel before cutover"),
        ("Key personnel departure (Senior Android Architect)", "Low", "Critical",
         "Document all patterns; pair programming during pattern-setting sprints"),
    ]

    risks = data.get("risks", []) or [
        {"risk": r[0], "likelihood": r[1], "impact": r[2], "mitigation": r[3]}
        for r in default_risks
    ]

    for i, risk in enumerate(risks, 1):
        if isinstance(risk, dict):
            lines.append(
                f"| {i} | {risk['risk']} | {risk['likelihood']} | {risk['impact']} | {risk['mitigation']} |"
            )

    lines.extend([
        "",
        "## Opportunities",
        "",
    ])

    default_opportunities = [
        "**iOS app launch via KMP:** Shared modules reduce iOS development from 12+ months to 4–6 months.",
        "**Accessibility as differentiator:** WCAG AA compliance is rare in library lending apps; positions Hoopla as the accessible choice.",
        "**Observability-driven product decisions:** Structured playback telemetry enables data-driven content licensing.",
        "**Reduced onboarding time:** Modern architecture (MVVM, DI, tests) cuts new developer ramp from 8 weeks to 3.",
        "**App Store rating improvement:** Crash rate and performance improvements historically correlate with +0.3–0.5 star increase.",
    ]

    opportunities = data.get("opportunities", []) or default_opportunities
    for opp in opportunities:
        lines.append(f"- {opp}")

    lines.extend([
        "",
        "---",
        "",
        "## Recommendation",
        "",
        f"Based on a weighted NPV of **${financials['weighted_npv']:,}** and a payback period of "
        f"**{financials['payback_months']} months**, the migration investment is justified under "
        f"the Likely and Highly Favorable scenarios. The Unfavorable scenario "
        f"({'shows a positive' if financials['scenarios_npv']['unfavorable'] > 0 else 'shows a negative'} "
        f"NPV of ${financials['scenarios_npv']['unfavorable']:,}), "
        f"{'confirming the investment is resilient to downside risk.' if financials['scenarios_npv']['unfavorable'] > 0 else 'indicating the investment carries meaningful downside risk that should be mitigated before commitment.'}",
        "",
        "**Recommended approach:** Commit to Scenario C (Phase 0 + Phase 1 complete, Phase 2 meaningfully underway) "
        "as the delivery target. This has a 60–70% probability of success within the proposed window.",
        "",
        "---",
        "",
        "_Analysis methodology (c) RSP Management Solutions LLC. "
        "Financial projections are estimates based on industry benchmarks and project-specific assessment. "
        "Actual results will vary. No assumption of ownership of Midwest Tape intellectual property._",
    ])

    return "\n".join(lines)


def interactive_input() -> dict:
    """Gather inputs interactively from the user."""
    data = get_default_input()

    print("=" * 60)
    print("Business Case Generator")
    print("(c) RSP Management Solutions LLC")
    print("=" * 60)
    print()
    print("Press Enter to accept defaults shown in [brackets].")
    print()

    data["project_name"] = input(f"Project name [{data['project_name']}]: ").strip() or data["project_name"]
    data["client_name"] = input(f"Client name [{data['client_name']}]: ").strip() or data["client_name"]
    data["objective"] = input(f"Objective [{data['objective'][:60]}...]: ").strip() or data["objective"]

    team = input(f"Current team size [{data['baseline']['team_size']}]: ").strip()
    if team:
        data["baseline"]["team_size"] = int(team)

    cost = input(f"Annual engineering cost USD [{data['baseline']['annual_engineering_cost_usd']}]: ").strip()
    if cost:
        data["baseline"]["annual_engineering_cost_usd"] = int(cost.replace(",", ""))

    duration = input(f"Migration duration months [{data['investment']['migration_duration_months']}]: ").strip()
    if duration:
        data["investment"]["migration_duration_months"] = int(duration)

    additional = input(f"Additional headcount [{data['investment'].get('additional_headcount', 0)}]: ").strip()
    if additional:
        data["investment"]["additional_headcount"] = int(additional)

    print()
    return data


def main():
    parser = argparse.ArgumentParser(
        description="Generate a business case for mobile migration projects. "
                    "(c) RSP Management Solutions LLC."
    )
    parser.add_argument(
        "--input", "-i",
        help="JSON file with business case inputs (default: interactive mode)"
    )
    parser.add_argument(
        "--output", "-o",
        default="docs/BUSINESS_CASE.md",
        help="Output markdown file (default: docs/BUSINESS_CASE.md)"
    )
    parser.add_argument(
        "--template",
        action="store_true",
        help="Write a template JSON input file and exit"
    )
    args = parser.parse_args()

    if args.template:
        template = get_default_input()
        template_path = "business_case_input.json"
        with open(template_path, "w") as f:
            json.dump(template, f, indent=2)
        print(f"Template written to {template_path}")
        print("Edit the values, then run: python3 scripts/business_case_generator.py --input business_case_input.json")
        return

    if args.input:
        with open(args.input) as f:
            data = json.load(f)
        # Merge with defaults for any missing fields
        defaults = get_default_input()
        for key in defaults:
            if key not in data:
                data[key] = defaults[key]
    else:
        data = interactive_input()

    document = generate_business_case(data)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(document)

    print(f"\nBusiness case written to {args.output}")

    # Also save the input data for reproducibility
    input_path = args.output.replace(".md", "_input.json")
    with open(input_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Input data saved to {input_path} (for reproducibility)")


if __name__ == "__main__":
    main()

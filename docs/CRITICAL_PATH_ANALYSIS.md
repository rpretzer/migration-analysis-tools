# Critical Path Analysis — Hoopla Migration Roadmap

Feasibility check performed against a 4-month delivery window. Derives directly from ROADMAP.md item dependencies, scope counts in ARCHITECTURE_AUDIT.md and MODULE_CLASSIFICATIONS.md, and finding counts in WCAG_AUDIT.md.

---

## 1. Critical path identification

The critical path is the longest serial dependency chain in the roadmap. Every item on it must complete before the next one can start. No amount of additional headcount can compress it below its sum, because each step's output is the next step's input.

```
0.5  Hilt foundation            (2 sprints)   ─┐
                                                ▼
1.4  AsyncTask → Coroutines     (3 sprints)   ─┐   [HIGH RISK]
                                                ▼
1.5  Repository layer           (2 sprints)   ─┐
                                                ▼
1.6  ViewModels — wave 1        (3 sprints)   ─┐   [HIGH RISK]
                                                ▼
2.2  Compose — leaf screens     (3 sprints)   ─┐
                                                ▼
2.3  Compose — core screens     (6 sprints)            [HIGH RISK]

─────────────────────────────────────────────────────
Total critical-path length:     19 sprint-slots
Compressed (2 devs on 2.3):     17 sprint-slots
```

All other roadmap items run in parallel against this chain. They extend the end date only if they slip badly enough to starve a critical-path item of a required input. The one parallel track with that potential is the KMP track (1.1 → 1.2 → 1.3), because 1.5 lists 1.2 as a preferred dependency. If 1.2 slips past the start of 1.5, the architect must decide whether to proceed without the shared HTTP client or wait.

---

## 2. Person-week inventory

| Phase | Items | Person-weeks | Serial calendar minimum (1 developer) | Calendar minimum (max parallelism) |
|-------|-------|-------------|---------------------------------------|-------------------------------------|
| 0 | 0.1–0.6 | ~9 PW | 9 weeks | ~2.5 weeks (4 people) |
| 1 | 1.1–1.10 | ~26 PW | 26 weeks | ~10 weeks (KMP track is the longer of the two parallel tracks) |
| 2 | 2.1–2.9 | ~51 PW | 51 weeks | ~9 weeks (2.1 runs alongside 2.2; 2.3 follows) |
| **Total** | | **~86 PW** | 86 weeks | **~18–19 weeks** |

86 person-weeks across 17 calendar weeks requires a minimum of 5 concurrent developers with zero idle time. Six developers provides ~19 % slack.

---

## 3. Scenario analysis against 4-month window

4 months ≈ 16–17 calendar weeks.

### Scenario A — Full roadmap delivered

| Attribute | Value |
|-----------|-------|
| Scope | All Phase 0, 1, and 2 items |
| Critical-path requirement | 17 sprint-slots compressed; every sprint is 1 week; zero slippage on 1.4, 1.6, and 2.3 |
| Minimum headcount | 5 developers (6 with buffer) |
| Likelihood | **Low — 15–20 %** |
| Why | Three high-risk items sit on the critical path. Each has an independent probability of slipping by one sprint. Joint probability of all three hitting first estimate: ~0.55³ ≈ 17 %. |

### Scenario B — Phase 0 + Phase 1 delivered; Phase 2 deferred

| Attribute | Value |
|-----------|-------|
| Scope | Items 0.1–0.6 and 1.1–1.10 |
| Critical-path requirement | ~12–13 calendar weeks |
| Minimum headcount | 3–4 developers |
| Likelihood | **High — 75–80 %** |
| Why | Fits comfortably within 4 months at standard 2-week sprint cadence. One sprint of buffer exists even if one high-risk item slips. |

### Scenario C — Phase 0 + Phase 1 delivered; Phase 2 meaningfully underway

| Attribute | Value |
|-----------|-------|
| Scope | All Phase 0 and 1 items. Phase 2 items 2.1, 2.2, 2.6, and 2.7 started. |
| Critical-path requirement | ~14–16 calendar weeks |
| Minimum headcount | 4 developers |
| Likelihood | **Medium-High — 60–70 %** |
| Why | Achievable if Phase 1 does not slip. Phase 2 start items are off the critical path and can absorb a 1-sprint delay without breaking the window. |

**Recommended plan target: Scenario C.** It is the most aggressive target with a majority probability of success. Scenario A should be treated as a stretch goal, not a commitment.

---

## 4. Resource allocation — Scenario C

| Role | Allocation | Weeks 1–4 | Weeks 5–8 | Weeks 9–13 | Weeks 14–17 |
|------|-----------|-----------|-----------|------------|-------------|
| Senior Android Architect | 1 × 100 % | 0.5 Hilt foundation | 1.4 Coroutines (pattern definition) | 1.6 ViewModels wave 1 (owns 2 of 4 screens) | Guides 2.2 Compose leaf; reviews 2.1 PRs |
| KMP Developer | 1 × 100 % | Module scaffold + spike | 1.1 bean/ extraction | 1.2 webservices/ extraction | 1.3 auth/ extraction |
| Android Developer — Modernisation | 1 × 100 % | 0.3 Observability baseline | 1.8 Nav Component + 1.5 Repositories | 1.7 Room migration | 2.1 ViewModels wave 2 (begins) |
| Android Developer — Accessibility / UI | 1 × 100 % | 0.2 Credentials + 0.4 WCAG Critical + 0.6 Test baseline | 1.9 WCAG High + 1.10 ui8/ | Joins 1.6 (delivers 2 of 4 ViewModels) | 2.1 ViewModels wave 2 + 2.7 WCAG |
| QA Engineer *(optional)* | 0.5–1 × | — | Regression on Hilt + coroutines | Regression on ViewModels + Room; TalkBack | Device-matrix regression on Compose |

**Total: 4 developers + optional QA.** To push toward Scenario A, add 2–3 developers in weeks 9–17 for 2.1, 2.3, and 2.8 in parallel — but the critical path, not headcount, remains the binding constraint.

---

## 5. Single points of failure

| # | What | Why it is a single point of failure |
|---|------|-------------------------------------|
| 1 | Senior Android Architect | Owns three critical-path items (0.5, 1.4, 1.6). Defines the patterns that all other developers follow. If this person is unavailable for more than one sprint, the critical path stalls. |
| 2 | KMP Developer experience | If no team member has shipped a KMP shared module, the week-1 spike may reveal that module setup is more complex than assumed. There is no way to parallelise around a skill gap. Run the spike before sprint 1 or identify a consultant. |

---

## 6. Top-five timeline risks

| Priority | Item | Failure mode | Impact |
|----------|------|--------------|--------|
| 1 | 1.2 KMP: webservices/ | Gson → kotlinx.serialization across 45 parsers surfaces implicit field-name contracts that break silently | Delays KMP track 2–4 weeks; delays 1.3 and 2.4 |
| 2 | 1.4 Coroutines | Threading bugs in top-10 controllers surface during regression, require a second pass | On the critical path — one sprint slip here propagates to the end date |
| 3 | KMP experience gap | Week-1 spike reveals shared-module setup is more involved than assumed | Adds 2–3 weeks to the entire KMP track |
| 4 | 1.6 ViewModels wave 1 | Pattern takes longer to nail down; architect is pulled into another fire | On the critical path — same propagation as risk 2 |
| 5 | Ebook reader scope creep | Deliberately excluded (~80 files). A production bug pulls it in during Phase 1 | Unpredictable; could consume 1–2 sprints of architect time and stall the critical path |

---

## 7. Decision points and go/no-go gates

These should be evaluated at the end of the sprint indicated. If the gate condition is not met, the team adjusts scope or timeline before committing to the next phase.

| Gate | End of | Condition to proceed |
|------|--------|----------------------|
| Phase 0 sign-off | Sprint 2–3 | All Phase 0 items complete. Hilt compiles and app smoke-tests green. Coverage baseline is measured. |
| KMP spike verdict | Sprint 1–2 | KMP module compiles for both JVM and iOS targets. Team has confirmed the serialisation strategy. If not, 1.1–1.3 are rescoped or a KMP consultant is engaged. |
| Coroutines pattern locked | Sprint 5 | Top-10 controllers pass regression on coroutines. The pattern is documented and the second developer can follow it without architect hand-holding. |
| ViewModel pattern locked | Sprint 8 | Four wave-1 ViewModels ship. Rotation survival confirmed. The pattern is documented. Wave 2 can begin without the architect on every PR. |
| Phase 1 sign-off | Sprint 8–10 | All Phase 1 items complete or have a firm completion date within 1 sprint. Phase 2 scope is confirmed based on actual Phase 1 velocity. |

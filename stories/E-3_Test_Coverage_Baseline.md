# Establish CI test-coverage baseline and define per-module thresholds

**Title:** Establish CI test-coverage baseline and define per-module thresholds

**Story:**
As a development team, I want CI to measure and report test coverage per package on every PR so that we have a factual baseline and can enforce minimum thresholds going forward.

**Context / Background:**
The codebase is expected to have near-zero unit and integration test coverage for app-owned code. Before any modernization work begins, the team needs a measured baseline, not an assumption. Coverage reporting must also work on the KMP shared module, not only on the Android app module, because stories A-1 through A-4 will add tests there.

**In scope:**
- [ ] Instrument CI to generate a unit and integration test coverage report per package
- [ ] Run the report against the current codebase and document the baseline numbers for every package
- [ ] Define per-module minimum coverage thresholds (the specific numbers are a team decision; this story delivers the mechanism and the baseline data needed to make that decision)
- [ ] Configure CI to fail the build if coverage drops below the agreed threshold on any package
- [ ] Verify coverage reporting works on the KMP shared module as well as the Android app module

**Out of scope:**
- [ ] Writing tests to close coverage gaps (that is the responsibility of each feature story)
- [ ] UI test coverage (this story covers unit and integration tests only)
- [ ] Coverage tooling selection beyond what is compatible with the existing Gradle setup

**Acceptance Criteria:**

```
Given a PR is opened against the main branch
When CI runs
Then a coverage report is generated showing unit and integration coverage per package
```

```
Given the baseline report has been generated
When it is reviewed by the team
Then every app-owned package has a documented baseline number and the expected near-zero finding is confirmed or corrected
```

```
Given per-module thresholds have been agreed by the team
When a PR is opened that reduces coverage below the threshold on any package
Then CI fails the build with a clear message identifying the package and the coverage drop
```

```
Given the KMP shared module has tests
When CI runs
Then coverage is reported for the shared module in the same dashboard as the Android app module
```

**Non-functional requirements:**
- Performance: Coverage instrumentation must not add more than 30 seconds to the CI build time.
- Accessibility: Not applicable to this story.
- Observability: The coverage report itself is the observability deliverable of this story.
- Testing: This story is entirely about testing infrastructure. The acceptance gate is that the tooling works correctly, not that coverage is high.

**Dependencies:**
- Roadmap item 0.1 (assessment) is complete.

**Assumptions:**
- The existing Gradle setup supports a standard coverage plugin (e.g., Jacoco for Android, Kover for KMP). If not, plugin selection is part of this story's scope.
- Near-zero coverage is the expected baseline. If the actual baseline is significantly higher, the team should update the roadmap assumptions.

**Effort estimate:** 3
**Estimation drivers:** CI tooling setup is the main work; baseline measurement is expected to confirm near-zero coverage; threshold negotiation is a team decision, not a code task; low risk.

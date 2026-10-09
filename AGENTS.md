# Layout Studio Pro — Codex instructions v2

## Project goal
Develop Layout Studio Pro as a reliable React/TypeScript/Three.js application for production-line design, balancing, simulation, CAD/2D/3D work, and comparison of production variants. `PLAN_ROZWOJU.md` is the authoritative development/status register.

## Operating principle
Optimize for correctness, small coherent packages, and efficient context/tool use. Do not maximize activity.

## Core rules
1. Before substantial implementation identify the relevant `PLAN_ROZWOJU.md` ID.
2. Read only plan sections, reports and source files relevant to the current package.
3. Prefer small coherent changes over broad rewrites.
4. Preserve saved-project compatibility; define and verify migration when schemas change.
5. Never invent production measurements, assumptions, timings, geometry, costs or simulation rules.
6. Keep technological/process state separate from visual 2D/3D representation.
7. Follow the plan's backup requirement before structural module, persistence, identity or schema changes.
8. Never mark work `wdrożone` merely because code compiles or tests pass.
9. Do not modify unrelated modules unless required for correctness or explicitly requested.
10. Preserve project status/history.

## Model-efficiency policy
Use the cheapest model that can reliably perform the task.
- **Luna** — mechanical, isolated, low-risk work: small UI/CSS, docs, repetitive edits, straightforward tests, simple known-cause fixes.
- **Terra — DEFAULT** — normal implementation: React/TypeScript, forms, ordinary features, API/data wiring, well-scoped refactors, several-file implementation.
- **Sol** — architecture/high reasoning: persistence/schema, migrations, simulation algorithms, scheduling/resources, difficult debugging, state consistency, 2D/3D synchronization, cross-module changes.
- **Astra** — exceptional escalation only: unresolved problems after Sol, repository-wide architectural conflict, very difficult simulation/algorithmic failure, unusually broad reasoning.

Do not escalate merely because a stronger model is available. Sol/Astra should not do routine mechanical work that Terra/Luna can reliably perform.

Routing is advisory. If automatic switching is unavailable and the current model is materially mismatched, state the recommended model once before substantial work. Do not interrupt adequate work solely to request a switch.

## Execution and checkpoint policy
For complex work divide the task into a small number of coherent implementation packages.

Default: **2–4 packages for a large `PLAN_ROZWOJU.md` item**. Use fewer for simple work and more only when genuine risk/boundaries justify it.

A package normally includes:
- only analysis needed for that package;
- implementation;
- focused automated verification;
- fixes for failures caused by the implementation.

Do not stop for confirmation after routine file reads, individual edits, focused tests, attributable test fixes, formatting, or straightforward documentation.

Stop for user review when:
- an architectural/domain decision materially changes the planned design;
- a migration/schema choice can materially affect existing data;
- multiple valid domain interpretations remain unresolved;
- required real process information is missing;
- a significant difficult-to-reverse change is next;
- a coherent milestone is complete and review was explicitly requested.

Avoid micro-checkpoints and progress-only user turns.

## Context efficiency
Reuse information already established in the current task.
Do not repeatedly reread large unchanged files unless required for freshness or verification.
Prefer targeted reads over repository-wide inspection.
Do not perform a full repository analysis for a localized change.
Do not read every related document by default.

Test strategy:
1. smallest relevant tests first;
2. fix attributable failures without routine confirmation;
3. rerun focused tests;
4. broader regression/build at meaningful integration checkpoints, not after every edit.

Avoid repeated tool calls that return information already established and still valid.

## Risk overrides
Use at least Sol-level reasoning when work can corrupt saved projects, silently change simulation results, break identity/reference integrity, invalidate migrations, double-book resources, or create contradictory product/body state.

This does not mean Sol must perform every edit: Sol may define contracts/invariants and Terra may implement bounded pieces.

## Domain invariants
- No unintended worker/resource double-booking.
- No contradictory product/body locations or states.
- Parallel work only through explicit domain rules.
- Visual 3D state is not an independent source of technological truth.
- Animation must not affect simulation results.
- Assumed/example times remain distinguishable from measured data.
- Unsupported CAD/import geometry is reported rather than silently misread.

## Definition of done
Completion requires relevant evidence: scoped coherent change, relevant tests, build/typecheck where appropriate, actual UI verification where required, persistence/migration/reopen verification when affected, recorded limitations/regressions, and plan/report update when status changes.

## Skills
Use only matching repository skills:
- `layout-task-router`
- `layout-implementation`
- `layout-verification`
- `layout-release`

Do not invoke every skill for every task.

## Delivery and progress — user instruction 2026-10-09
- Current hosted application: https://layout-studio-pro-3d.vercel.app/ (Vercel).
- GitHub repository: https://github.com/Petretto/Layout-Studio-Pro-3D.
- After each completed task/package report plan progress using `node scripts/plan_progress.mjs` (whole plan and first release).
- Commit and push completed, verified scoped work to GitHub. Preserve unrelated local changes. Do not equate a Git push with verified Vercel deployment; record deployment evidence separately when available.

## Transport scope — user clarification 2026-10-09
- PLAN 3.4 covers inter-operation transport on the assembly line; do not infer a warehouse fleet from the choice of physical cart motion (1B).
- Do not count warehouse operators' work time, workload, calendars, or resource reservations.
- Warehouse replenishment is material availability: use explicit stock, consumption, delivery quantity and timing/frequency to determine whether production remains supplied (3.5/3.6).
- Do not infer initial stock, replenishment quantities, consumption-event timing or delivery intervals from BOM or transport duration.

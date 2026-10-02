# Layout Studio Pro — Codex project instructions

## Project goal
Develop Layout Studio Pro as a reliable React/TypeScript/Three.js application for production-line design, balancing, simulation, CAD/2D/3D work, and comparison of production variants.

`PLAN_ROZWOJU.md` is the authoritative development/status register. Read only the sections relevant to the current task; do not load the whole document unnecessarily for trivial edits.

## Core rules
1. Identify the relevant `PLAN_ROZWOJU.md` task ID before substantial implementation.
2. Prefer small, coherent changes over broad rewrites.
3. Preserve saved-project compatibility. If a schema changes, provide and verify a migration path.
4. Never silently invent production measurements, process assumptions, capacities, timings, geometry, costs, or simulation rules.
5. Keep technological/process state separate from visual 2D/3D representation. Visual models must not become an independent source of process truth.
6. Before structural changes to modules, persistence, identity, or schemas, follow the backup requirement in `PLAN_ROZWOJU.md`.
7. Do not mark work as `wdrożone` merely because code compiles or tests pass. Use the acceptance evidence required by the plan, including UI verification where applicable.
8. Run the smallest relevant test set first, then broader regression tests/build when the change warrants it.
9. Do not modify unrelated modules just to clean them up unless explicitly requested or required for correctness.
10. After verified completion, update the relevant plan/status/report documentation. Preserve history.

## Model-efficiency policy
Use the cheapest model that can reliably perform the task. Do not escalate merely because a stronger model is available.

Suggested routing:
- **Luna** — mechanical, isolated, low-risk work: small UI/CSS changes, documentation, repetitive edits, straightforward tests, simple fixes.
- **Terra** — default implementation model: React/TypeScript work, forms, ordinary features, API/data wiring, well-scoped refactors, implementation across several files.
- **Sol** — high-reasoning engineering: architecture, persistence/schema changes, migrations, simulation algorithms, resource scheduling, difficult debugging, state consistency, 2D/3D synchronization, cross-module changes.
- **Astra** — exceptional escalation only: unresolved problems after Sol, repository-wide architectural conflicts, very difficult simulation/algorithmic failures, or tasks requiring unusually broad reasoning.

The model-routing guidance is advisory. If the current Codex environment cannot switch models automatically, state the recommended model before starting a substantial task when the current model is materially mismatched. Do not stop for a model change when the current model is adequate.

## Context discipline
- Read files because they are relevant, not by default.
- For schema/persistence work, inspect persistence types, migrations, serialization, undo/redo implications, and compatibility.
- For simulation work, inspect the simulation model and relevant acceptance scenarios.
- For UI-only work, avoid loading simulation/CAD documentation unless the change crosses those boundaries.
- For release work, consult installation, dependency, licensing, recovery, and user documentation.

## Definition of done
A task is done only when the implementation and the relevant verification are complete:
- code change is scoped and coherent;
- relevant automated tests pass;
- build/typecheck passes when appropriate;
- UI behavior is verified when required;
- persistence/migration/reopen behavior is verified when affected;
- regressions and remaining limitations are recorded;
- `PLAN_ROZWOJU.md` / verification report is updated when the task reaches a new status.

## Skills
Use the repository skills when their descriptions match:
- `layout-task-router` — classify task risk/complexity and recommend model/workflow.
- `layout-implementation` — implement a scoped plan item safely.
- `layout-verification` — verify acceptance, regressions, persistence, and UI.
- `layout-release` — prepare commercial/release-oriented work.

Do not invoke every skill for every task. Use only the workflow needed.

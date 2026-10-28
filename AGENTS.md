# Layout Studio Pro — Codex instructions v2

## Project goal
Develop Layout Studio Pro as a reliable React/TypeScript/Three.js application for production-line design, balancing, simulation, CAD/2D/3D work, and comparison of production variants. `PLAN_ROZWOJU.md` is the authoritative development/status register.

## Operating principle
Optimize for correctness, small coherent packages, and efficient context/tool use. Do not maximize activity.

## Core rules

### Repository organization — user instruction 2026-10-26
- Keep the repository root clean. Only the main `PLAN_ROZWOJU.md`, `AGENTS.md`, `README.md`, build/configuration files and required launchers belong there.
- Put new domain contracts/models/standards in `docs/modele/`, verification and acceptance reports in `docs/weryfikacja/`, detailed plans/notes in `docs/plany/`, product descriptions in `docs/produkt/`, data/scenario descriptions in `docs/dane/`, release history in `docs/historia/`, and UI design documents in `docs/projekty/`.
- Put `.pen` designs in `design/`, user manual sources/derivatives in `Instrukcja/`, and test evidence in `outputs/qa/`. Never create new `MODEL_*`, `WERYFIKACJA_*` or `RAPORT_*` files at the repository root.
- Use `docs/README.md` as the documentation index. Update links and script paths when moving documents. Keep historical backup paths and saved example data unchanged. Run `node scripts/verify_documentation.mjs` after documentation moves/additions.

### Implementation rules
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

### Manual model selection — user instruction 2026-10-26
- Before substantial work, briefly state the workflow and recommend models separately for initial task assessment/routing, implementation, and verification. Include a short reason based on complexity and risk.
- Keep routing inexpensive: recommend Luna for an obvious, bounded classification; Terra for ordinary assessment; use Sol when deciding the scope itself requires architecture, persistence or simulation reasoning. Do not use a stronger model merely to decide that a routine task needs a cheaper one.
- Choose the verification model independently of the implementation model. Mechanical checks can use Luna/Terra; correctness review of migrations, identity, simulation and resource reservations requires at least Sol-level reasoning.
- The user switches the active chat model manually. A recommendation or declared reasoning level is not an actual model switch; never claim otherwise.
- If recommending a manual switch, present that recommendation and pause before the substantial work that requires the change, allowing the user to switch. Minimal routing reads and small instruction updates do not require a separate switch. Do not repeatedly request an unchanged recommendation within one coherent package.
- At delivery, recommend the model for assessment of the next known package as well as its implementation and verification when the scope is known. Flag uncertainty instead of inventing scope or escalating automatically.

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
4. During implementation, run only tests of changed behavior and directly affected dependencies; use suite/name filters instead of running the full suite by default.
5. After a fix, rerun the failing tests and the relevant regression subset. Expand only for a concrete failure or unresolved risk; do not repeat checks solely because another file was edited.
6. Run the full suite periodically, by default after three completed implementation packages since the last full run, or earlier at a substantial integration/migration checkpoint whose effects cannot reliably be covered by a scoped subset. State the reason for the full run. Documentation-only tasks do not require automated regression.
7. Build/typecheck at a meaningful package checkpoint when applicable, not after each small edit. Run UI and save/reopen checks only for affected paths.
8. Routine focused tests and attributable fixes are authorized by the user (2026-10-14); do not ask for permission per test. If the execution environment requires escalation, request only that concrete tool permission.
9. Record which tests actually ran (focused or full), their scope and result; do not report skipped tests as executed. Last full baseline at adoption: 213 tests, commit 3eebffd (2026-10-14).

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
- User instruction 2026-10-26: routine Vercel verification is not required. Check deployment only when explicitly requested or necessary for a reported hosting issue; omit repetitive reminders that Vercel was not verified.
- GitHub repository: https://github.com/Petretto/Layout-Studio-Pro-3D.
- After each completed task/package report plan progress using `node scripts/plan_progress.mjs` (whole plan and first release).
- Commit and push completed, verified scoped work to GitHub. Preserve unrelated local changes. Do not equate a Git push with verified Vercel deployment; record deployment evidence separately when available.

## Transport scope — user clarification 2026-10-09

User clarification 2026-10-25: assemblers perform transport only between operations within the assembly line/process. Other people deliver materials from the warehouse. Never assign warehouse deliveries to assembly workers or treat the C1 assembler-transport decision as warehouse staffing. Warehouse replenishment remains availability events, without modeling warehouse crew workload in the current scope.
- PLAN 3.4 covers inter-operation transport on the assembly line; do not infer a warehouse fleet from the choice of physical cart motion (1B).
- Do not count warehouse operators' work time, workload, calendars, or resource reservations.
- Warehouse replenishment is material availability: use explicit stock, consumption, delivery quantity and timing/frequency to determine whether production remains supplied (3.5/3.6).
- Do not infer initial stock, replenishment quantities, consumption-event timing or delivery intervals from BOM or transport duration.

## Multi-cart approaches — user decision 2026-10-12
- Empty approaches for an assembly transport set always execute sequentially in the stored equipmentIds order, even when crews are disjoint.
- Loaded movement waits for the actual arrival and joint availability of all required carts. Do not infer parallel approaches.

## Process-only simulation — user instruction 2026-10-12
- Provide an explicit opt-in just-in-time mode for simulation without configuring transport. Default OFF.
- Skip transport durations, routes, reservations and physical body-location tracking in this mode; preserve operation dependencies and assembly resource/calendar constraints.
- Label results as process-only with assumed material availability. Keep saved transport configuration unchanged.

## Subassembly flow — user decision 2026-10-12
- Approved rule A: the whole explicitly declared subassembly lot becomes available at producer completion; the assigned quantity is consumed atomically at recipient start.
- Quantities, units and producer/recipient execution assignments remain explicit; do not derive stock or quantities from BOM.

User decision 2026-10-25 (C2 finite buffers): capacity counts pieces of subassembly, not lots. A lot of 5 pieces occupies 5 capacity units. Integration remains pending under `docs/modele/MODEL_BUFOROW_PODMONTOW_C2.md`; do not claim finite branch buffers are supported by C2-A.

User decision 2026-10-25 (C2 remainder): when 3 of 5 pieces are consumed, the remaining 2 stay in the recipient buffer, continue to occupy capacity and remain visible as stock. Without an explicit new assignment, do not consume or transport the remainder again. B1 implements this only in the internal quantity ledger; scheduler and UI integration remain pending.

User decision 2026-10-26 (C2 capacity scopes): each subassembly has its own explicit capacity, separate from other subassemblies and body capacities. `subassemblyBuffers` is an optional model-6 configuration; existing `stationBuffers` retain their body-buffer meaning. B2a supports positive subassembly capacities with output policy `bbas-worker-released`, including residual stock in the recipient buffer and UI inspection. Zero capacity, held-worker output policy and simultaneous finite body buffers with branches remain pending; reject unsupported combinations rather than ignore limits. Do not infer a shared pool from the unit `szt.`.

Verified B2b scope 2026-10-26: subassembly output policy `bbas` with explicit presence from operation start to finish; hold workers after processing until the last pending lot leaves the producer. Never promise an unknown release time to another operation, approach or return. Output 0 holds the lot on the producer until departure. Input 0 supports one incoming lot, full consumption without remainder, and a recipient whose body is already at its target copy (or needs no body). Arrival equals actual recipient start, with future worker/station/equipment/material commitments protected. A loaded departure may release its own held source worker; an empty approach may not. Multiple direct lots, simultaneous body delivery, local input+output both zero, partial producer presence under bbas, mixed output policies for lots of one producer, direct recipients with their own held-worker output, recipient concurrency/changeovers, and finite body buffers with branches remain explicitly unsupported until B3. These are implementation limits, not new process assumptions.


User decision 2026-10-27 (mixed producer output policies): if one producer execution has lots with both held-worker and worker-released output policies, hold its common crew until all pending lots have left the producer work position. Depositing or dispatching only the held-policy lot does not release the crew while another lot still waits on that producer. Preserve the full-presence guard and future-resource protections. B3a also supports one direct incoming lot together with lots already in separate positive input buffers; consuming all assignments occurs at the same actual recipient start. The body must already be at the recipient copy. Multiple direct lots and finite body buffers with branches remain pending.

## Buffers and material supply — user decisions 2026-10-14
- Material consumption quantities must be explicit for each operation. Consume the whole assigned quantity at actual operation start; process deliveries before consumption at equal time.
- Delivery times, including the first periodic delivery, are explicit. Do not infer zero as the first delivery time.
- Full output buffers block after processing has finished: retain the product and block the station/equipment until space is released. The configuration explicitly selects whether the operator remains occupied or is released.


## Buffer scope and transport — user decisions 2026-10-14
- copy=null applies the declared capacity separately to each copy, not as one shared station pool. Overlapping all-copy and individual-copy declarations require explicit correction.
- Reserve destination buffer space before transport departure. Capacity 0 means direct handoff to a ready operation, without waiting in that buffer.


## Same-copy continuation — user decision 2026-10-15
- For consecutive operations on the same station copy, the body stays on that copy. Buffers apply when leaving for another copy.
- The station and previous equipment remain occupied until the next local operation actually starts. Do not invent an intermediate body move or a buffer deposit.
- Worker presence still follows the explicit profile; local continuation waiting is distinct from an output-buffer blockage.
- Current verified implementation scope is the buffered linear scheduler (one explicit candidate per operation); broader routing remains subject to its recorded limitations.

Verified B3b scope 2026-10-27: positive finite body buffers with subassembly branches share the graph scheduler for one ordered body spine with one explicit copy per operation and different successive copies. Finite body outputs require `bbas-worker-released`; final output must be unlimited without an explicit finished-product pickup. Reserve body destination before departure, retain copy/equipment on a full output, and release positive input at actual operation start. Body zero capacity, held-worker body outputs, graph local continuation, variable body routing, changeovers and direct subassembly input together with finite body buffers remain explicitly unsupported. The previously verified linear scheduler keeps its broader zero/local scope.

Verified B3c scope 2026-10-28: successive body operations on the same explicit copy can continue locally in the graph. Keep body, copy and previous equipment occupied until the actual next local start; do not create an intermediate buffer deposit or body movement. Worker presence still follows each explicit operation profile. Use `continuationWaitSeconds` separately from output blockage, with atomic body release/reserve at the actual handoff. Zero body capacities, held-worker body output policy, variable routing, changeovers and direct subassembly input combined with finite body buffers remain unsupported in this graph scope.

Historical checkpoints: 257/257 in 3.5b2c4 (2026-10-15), 458/458 in B2b (2026-10-26), followed by focused checks. Latest full integration checkpoint: **B3b 471/471 PASS (109 core +362 network, 2026-10-27)**. B3c: 146/146 scoped tests including 7 new, build and actual UI/save/reload/export PASS (2026-10-28). Use the scoped-test policy until the next justified checkpoint. Evidence: `docs/weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3C.md`.

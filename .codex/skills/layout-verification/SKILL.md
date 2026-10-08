---
name: layout-verification
description: Verify Layout Studio Pro work proportionately against PLAN_ROZWOJU.md, including tests, UI, undo/redo, save/reopen/migration, simulation invariants and CAD geometry.
---
# Verification
Read only the relevant plan ID, parent acceptance criteria and report sections.

Baseline: relevant automated tests, build/typecheck when appropriate, new warnings/errors, requested scope.

UI when affected: actual selection/edit path, undo/redo, form refresh, 2D/3D synchronization, save/reopen if relevant.

Persistence/migration: old-data readability or explicit migration, original protected on failure, stable IDs, reference integrity, save/reopen/import round trip.

Simulation/resources: small hand-checkable scenarios first; no unintended overlap, no contradictory location/state, parallel work only under explicit rules, waits distinguishable from processing, deadlock reported, animation does not alter results.

CAD: units/scale, coordinate conversion, snapping, undo/redo, 2D/3D agreement, unsupported geometry reporting.

Use focused tests during implementation and broader suite/build at meaningful integration/final checkpoints. Do not rerun the full suite repeatedly without a state change that justifies it.

Record evidence. Missing required evidence means `w trakcie`, not `wdrożone`.

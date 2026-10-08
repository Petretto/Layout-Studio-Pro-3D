---
name: layout-implementation
description: Implement a scoped Layout Studio Pro PLAN_ROZWOJU.md item with efficient context, coherent packages, focused tests, safe migrations and project invariants.
---
# Implementation
Identify plan ID, expected result, affected subsystem and risk. Read only relevant plan/report/source sections.

For large items define 2–4 coherent packages. Within each: focused analysis -> implementation -> focused verification -> fix attributable failures. Stop only at a meaningful checkpoint/decision.

For persistence/schema/identity/structural work: follow backup procedure, identify affected saved-data versions, define migration/fallback, protect originals on migration failure, state invariants.

Preserve one source of truth for process data; keep 2D/3D derived/synchronized; do not infer missing production values; do not silently double-book resources; preserve stable identities; require explicit split/merge identity rules; keep undo/redo coherent.

Testing: `focused edit -> focused test -> fix -> focused retest`; then broader regression/build/typecheck and required UI/persistence checks at meaningful integration checkpoints. No confirmation needed for routine test/fix cycles.

Do not repeatedly reopen unchanged large files, inspect unrelated subsystems, or perform repository-wide searches when bounded files are known.

Record plan ID, changed files, verification, UI/persistence results, limitations and status/docs changes. Mark `wdrożone` only with required evidence.

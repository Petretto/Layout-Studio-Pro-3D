---
name: layout-implementation
description: Implement a scoped Layout Studio Pro plan item while preserving data compatibility, process-model correctness, undo/redo behavior, and 2D/3D consistency. Use when coding or refactoring a concrete PLAN_ROZWOJU.md task or subtask.
---

# Implementation workflow

## Scope
1. Identify the relevant plan ID and acceptance expectation.
2. Read only the source files and plan/report sections needed for that ID.
3. State important invariants before editing when the task touches persistence, simulation, identity, resources, or geometry.
4. Prefer the smallest coherent implementation that satisfies the acceptance criteria.

## Before risky changes
For structural changes to persistence, schemas, identity, or major modules:
- follow the project's backup procedure;
- identify affected saved-data versions;
- define migration/fallback behavior;
- protect the original data on migration failure.

## Engineering constraints
- Preserve a single source of truth for technological/process data.
- Keep visual 2D/3D representation derived/synchronized rather than independently authoritative.
- Do not infer missing real-world process values.
- Do not automatically divide operation time by worker count unless the domain model explicitly defines that variant.
- Do not permit hidden resource double-booking.
- Maintain stable identities across reorderings and unrelated operation changes.
- For split/merge behavior, require explicit identity-preservation rules.
- Keep undo/redo semantics coherent for user-visible edits.

## Implementation loop
1. Make one logical change.
2. Run focused tests/type checks.
3. Inspect failures before adding workarounds.
4. Continue with the next logical change.
5. Run broader regression/build checks once the package is coherent.
6. Verify UI manually/tool-assisted when acceptance requires UI behavior.
7. Verify save → close/reload/import → reopen when persistence is affected.

## Avoid
- broad rewrites without necessity;
- speculative abstractions;
- changing unrelated files;
- marking a task complete based only on build success;
- hiding known limitations;
- changing simulation assumptions to make tests pass.

## Completion
Record:
- plan ID;
- changed modules/files;
- automated verification;
- UI verification if relevant;
- persistence/migration/reopen verification if relevant;
- remaining limitations/blockers;
- documentation/status updates.

Only set `wdrożone` when the plan's acceptance evidence is actually satisfied.

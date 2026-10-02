---
name: layout-verification
description: Verify Layout Studio Pro changes against PLAN_ROZWOJU.md acceptance criteria, including tests, UI behavior, undo/redo, save/reopen/migration, simulation invariants, and regression evidence. Use for QA, code review, acceptance, regression checks, or before marking a plan item wdrożone.
---

# Verification workflow

Verification is evidence, not a formality.

## 1. Identify acceptance target
Read the relevant plan ID, its parent-stage acceptance criteria, and the current verification report if one exists.

## 2. Choose checks by impact

### Always
- relevant automated tests;
- typecheck/build where appropriate;
- inspect new warnings/errors;
- confirm no unrelated behavior was intentionally changed.

### UI/editor changes
Verify the actual UI path, not only functions:
- selection/edit;
- undo/redo;
- forms refresh correctly;
- 2D/3D selection and geometry remain synchronized when applicable;
- save/reopen retains the change.

### Persistence/identity/migration
Verify:
- old data remains readable or migrates through an explicit path;
- original data is protected on migration failure;
- stable IDs survive reorder/unrelated edits;
- references do not silently point to another object;
- save → reopen/import round trip.

### Simulation/resource logic
Use small hand-checkable scenarios first:
- one worker cannot perform overlapping work;
- one body/product cannot occupy contradictory locations;
- parallel work occurs only under explicit allowed rules;
- waits and resource blocking are distinguishable from processing;
- deadlock/stall is reported rather than disguised as completion;
- animation does not alter simulation results.

### CAD/geometry
Verify:
- units and scale;
- coordinate conversions;
- snapping on/off;
- undo/redo;
- 2D/3D agreement;
- unsupported import geometry is reported rather than silently misread.

## 3. Regression level
Run the smallest meaningful regression set first. Run the broader project suite/build after risky or cross-cutting changes.

## 4. Evidence
For each completed plan ID record:
- date/version;
- exact result;
- commands/tests and results;
- UI scenario and result;
- persistence/migration result when applicable;
- report/file reference;
- known limitations.

Do not mark `wdrożone` if required evidence is missing. Leave `w trakcie` and record the blocker.

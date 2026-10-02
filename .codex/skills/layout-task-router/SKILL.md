---
name: layout-task-router
description: Classify Layout Studio Pro development tasks by risk and complexity, recommend Luna, Terra, Sol, or Astra, and choose the lightest safe workflow. Use for new implementation, debugging, refactoring, migration, simulation, CAD/3D, or multi-module work when model choice or execution scope is not obvious.
---

# Layout Studio Pro task router

Classify before substantial work. Do not perform a long repository audit merely to classify a small task.

## 1. Determine task class

### LUNA
Recommend Luna when the task is isolated, deterministic, low-risk, and easy to verify:
- CSS/layout/text changes;
- small component edits;
- documentation/status formatting;
- repetitive edits with an established pattern;
- straightforward unit tests;
- tiny bug fixes with an already known cause.

### TERRA — default
Recommend Terra for normal engineering implementation:
- React/TypeScript components and forms;
- ordinary application logic;
- data/API wiring;
- well-defined features;
- refactors spanning a few files with stable contracts;
- implementation of a design already decided by Sol;
- editor functionality with limited state implications.

### SOL
Recommend Sol when correctness depends on non-local reasoning:
- architecture or domain-model decisions;
- persistent IDs, schemas, serialization, migrations;
- undo/redo and state-consistency changes;
- simulation engines, scheduling, shared resources, buffers, deadlocks;
- algorithms for balancing or bottleneck reasoning;
- difficult debugging without a known cause;
- 2D/3D synchronization and coordinate-system issues;
- DXF/import semantics;
- cross-module changes with data-loss or silent-result risk.

### ASTRA
Recommend Astra only when at least one applies:
- Sol has already failed or produced unresolved contradictions;
- a repository-wide architectural conflict must be resolved;
- a very difficult simulation/algorithmic defect remains after focused investigation;
- the task requires unusually broad, deep reasoning across many subsystems.

Do not recommend Astra for routine implementation.

## 2. Risk overrides
Escalate at least to Sol if the task can:
- corrupt or lose saved projects;
- silently change simulation results;
- break identity/reference integrity;
- invalidate migration compatibility;
- create double-booking of workers/resources;
- make one product/body exist in contradictory locations/states.

## 3. Split mixed tasks
If one request contains architecture plus mechanical implementation, split it:
1. Sol: decide contracts, invariants, migration, acceptance.
2. Terra: implement well-defined pieces.
3. Luna/Terra: add routine tests/docs.
4. Sol: review only if the change is high-risk.

Avoid making the strongest model do mechanical work.

## 4. Output before substantial work
If the current environment cannot automatically route models and the current model is materially mismatched, briefly report:

`Recommended model: <model> — <one-sentence reason>.`

Then either proceed if adequate or let the user switch models. Do not repeatedly announce the model.

## Project-specific examples
- PLAN 1.5 persistent workstation IDs: Sol for integration/migration design; Terra for bounded implementation after contracts are fixed.
- PLAN 1.7 project migration/recovery: Sol; Astra only for unresolved systemic migration failures.
- PLAN 2.4 shared operators: Sol.
- PLAN 3.5 finite buffers / 3.7 deadlocks: Sol.
- PLAN 5.3 multi-select/group/copy/alignment: Terra.
- PLAN 5.8 DXF import: Sol for supported-subset semantics, Terra for bounded implementation.
- PLAN 6.2 parametric equipment: Terra.
- PLAN 6.6 animation tied to simulation schedule: Sol for state contract, Terra for rendering implementation.
- PLAN 7.8 documentation/screenshots: Luna or Terra.

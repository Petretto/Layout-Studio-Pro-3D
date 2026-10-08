---
name: layout-task-router
description: Classify Layout Studio Pro work by complexity/risk, recommend Luna, Terra, Sol, or Astra, and split complex work into a few coherent packages.
---
# Task router
Classify with minimal investigation; never audit the whole repository merely to choose a model.

**Luna:** isolated deterministic low-risk UI/CSS/docs/repetitive edits/simple tests/known-cause fixes.
**Terra (default):** normal React/TypeScript/application implementation, API/data wiring, well-defined features, stable-contract refactors, implementation after design is decided.
**Sol:** architecture/domain model, IDs/schema/serialization/migrations, undo/redo/state consistency, simulation/scheduling/resources/buffers/deadlocks, difficult debugging, 2D/3D synchronization, DXF semantics, risky cross-module changes.
**Astra:** only after unresolved focused Sol work, repository-wide architectural conflict, or exceptionally difficult simulation/algorithmic reasoning.

Risk override to Sol for potential data corruption/loss, silent simulation changes, broken reference integrity, invalid migrations, resource double-booking, or contradictory product state.

For large items normally create 2–4 coherent packages:
1. Sol contracts/invariants/architecture if needed.
2. Terra bounded implementation + focused tests.
3. Terra/Luna routine UI/tests/docs.
4. Sol final review only if risk warrants it.

Do not checkpoint between routine actions. If current model is materially mismatched and routing is unavailable, report once: `Recommended model: <model> — <reason>.`

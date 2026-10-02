---
name: layout-release
description: Prepare Layout Studio Pro for a release or commercial pilot, covering packaging, clean-machine startup, updates, backup/recovery, dependencies, licenses, documentation, known limitations, and acceptance evidence. Use for PLAN stage 7 release/distribution work or release-readiness reviews.
---

# Release workflow

## Scope first
Define the release/pilot scope explicitly. Do not imply replacement of full CAD/simulation platforms or industrial certification beyond the documented scope.

## Release checks
1. Build/package from a clean state.
2. Test installation/startup on the target environment.
3. Verify save, backup, restore, and project recovery.
4. Verify update behavior and compatibility with supported saved-project versions.
5. Review runtime/build dependencies and licenses.
6. Review licenses/source metadata for bundled 3D models/assets.
7. Confirm documented browser/computer/offline requirements.
8. Run agreed acceptance scenarios, especially the Eko reference scenario where applicable.
9. Record known limitations and unresolved non-critical issues.
10. Update editable user instructions, screenshots, feature description, and changelog.

## Data and claims
- Separate measured production data from assumed/example values.
- Do not claim validated accuracy outside the tested scenarios/tolerances.
- Do not describe geometric warnings as BHP/safety certification.
- Do not double-count explicitly modeled losses and OEE reserve.

## Completion evidence
A release is ready only when installation/update/recovery, acceptance scenarios, documentation, and known limitations are recorded.

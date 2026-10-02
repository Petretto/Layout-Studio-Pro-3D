# Layout Studio Pro Codex skills

Repository-scoped Codex skills.

- `layout-task-router` — recommends Luna/Terra/Sol/Astra and the appropriate workflow.
- `layout-implementation` — safe implementation workflow for PLAN_ROZWOJU.md items.
- `layout-verification` — acceptance/regression workflow.
- `layout-release` — release/commercial-pilot workflow.

Important: the router's model recommendation is advisory in ordinary Codex use. A Skill does not itself guarantee that Codex will switch the active model. Automatic per-task model handoffs require an orchestration layer that supports model selection.

Codex discovers repository skills from `.codex/skills/<skill-name>/SKILL.md` in current OpenAI examples. If your installed Codex version exposes a different repository skill directory, move these four skill folders to that supported skills directory without changing their contents.

# whiteboard-mode

## Agent skills

### Issue tracker

Issues live as GitHub issues on `KahKitZheng/whiteboard-mode`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — label strings match the canonical role names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root (created lazily, absence is fine). See `docs/agents/domain.md`.

## Git conventions

- Branch off `origin/development` with `--no-track`; never commit to `development`/`staging`/`main`. PRs are drafts targeting `development`
- PR bodies follow `.github/pull_request_template.md`; `What changes for users` feeds the release notes
- Label `feature` or `bug`: it decides the version bump on release

> Before committing or creating a PR, READ `.claude/version-control.md`

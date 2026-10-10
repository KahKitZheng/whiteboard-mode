# Release notes plan (PoC)

Release notes for non-devs, drafted by AI from merged PRs and proofread by a human before publishing. whiteboard-mode is the first source. This is a proof of concept: if it proves worth it, whiteboard-mode lands in app-react and the release-notes app moves to the `faqta` org.

## Why

Releases are announced in Slack today. That's the bare minimum: quality depends on who writes it, there's no archive, and there's no way to show different notes to different audiences. The goal is consistent, human-readable notes on their own URL, with deep dives and video for the changes that matter.

## Overview

```
whiteboard-mode                                   release-notes (Astro, Vercel)
──────────────────────────────────────────────    ─────────────────────────────────────
feature branch ─PR─> development
development ─(Action: promotion PR)─> staging ──> dev runs the skill
                                                    -> drafts / updates the release PR
                                                    -> Vercel preview, dev adds media
staging ─(Action: promotion PR)─> main             -> Dutch proofread
main merge ─(Action)─> semver tag + GitHub Release -> merge PR = publish
```

Git (tags, GitHub Releases) is the dev-facing changelog. The release-notes app is the non-dev-facing one.

## whiteboard-mode

- Branches: `development` → `staging` → `main`. Feature branches come off `development`.
- Promotion PRs: copy app-react's `automated-promotion-pr.yml`, without the PPP/QA ticket parsing.
- PR template with app-react's headings: `What changes for users`, `Where`, `Impact`. The skill reads `What changes for users`.
- Labels: only `feature` and `bug`.
- On a `staging` → `main` merge, an Action creates a semver tag on the merge commit and a GitHub Release (`gh release create --generate-notes`). Any `feature` PR → minor bump, otherwise patch. Major bumps are manual.
- A glossary and Dutch translations, so the skill can use the real UI terms.

## release-notes app

- Astro, plain `.md` content collections, hosted on Vercel. Add MDX only when a component is needed.
- Separate repo: a release spans more than one source repo, and no app-react components are needed.
- Pages per product filter on frontmatter. Only the internal audience exists for now.

### Content layout

```
<product>/<draft-start-date>/
  en.md        # source of truth, edited by devs
  nl.md        # derived from en.md by the skill
  media/       # screenshots, demo videos
```

The folder is named after the date the draft started, so media paths don't break on publish.

Frontmatter:

```yaml
product: whiteboard
version: 1.4.0          # filled in from the GitHub Release tag
publishedAt: 2026-10-20 # set on merge
prs:
  - { number: 12, audience: internal, area: Annotaties }
  - { number: 15, audience: skip }
```

### Page shape

1. A list of changes, grouped by `area`. One bullet per change a reader notices, not per PR: a PR can give several bullets, and related PRs can share one. Each line describes the effect, not the code change, with a badge: new / fixed / improved. No commit prefixes (`Fix:`, `Chore:`), no jargon, no internal abbreviations, no feature flags.
2. Deep dives below the list. `feature` PRs get one by default, and their bullet links to it. A dev can promote any other item in the release PR.
3. When published, a link to the source's GitHub Release for that version.

### Media

- Stored locally in the release folder. The skill warns above ~5 MB per file. Move to GCS once that limit becomes a problem.
- Video: a raw Playwright recording from a demo spec in the source repo (`e2e/demos/<slug>.demo.ts`, `video: 'on'`). The dev runs it and drops the `.webm` into `media/`. Captions and spotlights are a later post-edit layer.

## The skill

Lives in the release-notes repo (`.claude/skills/`), because it changes together with the content schema. It is run manually by whoever drops something on staging.

Config:

```yaml
sources:
  - repo: KahKitZheng/whiteboard-mode
    product: whiteboard
    glossary: GLOSSARY.md
    locales: src/locales/nl/*.json  # optional
    areas: [Annotaties, Navigatie]  # closed list, anything unclear goes to Overig
```

Moving whiteboard-mode into app-react later means changing that entry. api can join as a second source.

Per run:

1. Read the open promotion PR of each source and the PRs it lists.
2. Skip PRs already in the entry's `prs`, so text a dev already edited stays as it is.
3. Classify each new PR:
   - Dependabot PRs: always `skip` (filtered by author).
   - Refactors, tests, CI, tooling: `skip`.
   - Feature flags, analytics: `internal`.
   - Security fixes: never `customer` automatically.
   - Everything else: `customer`. The levels are nested, so the internal page shows internal + customer.
4. Pick an `area` from the source's closed list.
5. Write `en.md`, then derive `nl.md`. Terms come from, in order: `terms/<product>.md` in release-notes (how readers know things, kept by devs), the source's `glossary.json` locale, its glossary, then its locales. Terms none of these confirm are listed in the PR for the proofreader.
6. Open the release PR, or push to it if it exists. The PR body lists every skipped PR with a one-line reason, so the reviewer can catch a wrong classification.

## Release PR

- One PR per release. Later staging drops push to the same PR.
- The Vercel preview shows the draft. Devs edit `en.md` and add media there.
- PR template checklist: a Dutch speaker proofreads `nl.md` for language and readability before merging (required).
- Merging when prod goes out publishes the notes. There's no draft/live status field.
- Announcing in Slack stays manual.

## Later, not now

- `customer` audience: a separate Vercel deployment per audience with a build-time filter, plus auth in front of it when a target group needs it. Then Dutch proofreading becomes stricter.
- A `status` field, if an "upcoming" page is wanted.
- A post-edit layer for demo videos (captions, spotlights, trims).
- GCS for media.
- A Slack announcement step.
- A dev-side override label for the audience classification, if the skill's classification turns out unreliable.
- Links to support articles from bullets and deep dives, once support articles exist for the features.
- A colour per badge type. Astro 7 needs `@astrojs/markdown-remark` for a markdown plugin, so for now badges share one style.

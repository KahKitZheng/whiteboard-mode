# Release notes plan (PoC)

Release notes for non-devs, drafted by AI from merged PRs and proofread by a human before publishing. Sources: whiteboard-mode, and Faqta (app-react + api). This is a proof of concept: if it proves worth it, whiteboard-mode lands in app-react and the release-notes app moves to the `faqta` org.

The source repos are only read. Everything is written in release-notes, plus the release setup in whiteboard-mode; app-react and api get no commits or PRs.

## Why

Releases are announced in Slack today. That's the bare minimum: quality depends on who writes it, there's no archive, and there's no way to show different notes to different audiences. The goal is consistent, human-readable notes on their own URL, with deep dives and video for the changes that matter.

## Overview

```
source repos (read only)                          release-notes (Astro, Vercel)
──────────────────────────────────────────────    ─────────────────────────────────────
feature branch ─PR─> development
development ─> staging ───────────────────────>  dev runs /release-notes <product>
                                                   -> drafts / updates the release PR
                                                   -> Vercel preview, dev adds media
                                                   -> Dutch proofread
staging ─> main/master, tag + GitHub Release ──>  dev runs /release-notes <product> publish
                                                   -> merge PR = live
```

Git (tags, GitHub Releases) is the dev-facing changelog. The release-notes app is the non-dev-facing one. Runs are manual: releases are infrequent, so a schedule would mostly run for nothing.

## whiteboard-mode

- Branches: `development` → `staging` → `main`. Feature branches come off `development`.
- PR template with app-react's headings: `What changes for users`, `Where`, `Impact`. The skill reads `What changes for users`.
- Labels: only `feature` and `bug`.
- On a merge into `main`, an Action tags the merge commit and creates a GitHub Release (`gh release create --generate-notes`). Any `feature` PR since the last tag → minor bump, otherwise patch. Major bumps are manual. The first release is `0.1.0`.
- No promotion PR workflow: the skill reads commit ranges, so it isn't needed.

## release-notes app

- Astro, plain `.md` content collections, hosted on Vercel. Badges and deep-dive cards come from two small rehype plugins.
- Separate repo: a release spans more than one source repo, and no app-react components are needed.
- URLs: `/<lang>/<product name slug>/<date>/`. Only the internal audience exists for now.

### Content layout

```
releases/<product>/<date>/
  en.md        # source of truth, edited by devs
  nl.md        # derived from en.md by the skill
  media/       # screenshots, demo videos
```

The folder is named after the date the draft started. Publishing renames it to the publish date, so the URL carries that date; media paths are relative, so they move along.

Frontmatter:

```yaml
product: faqta
versions:               # each repo's release tag, for devs; not shown to readers
  app-react: 3.20.31
  api: 3.24.5
publishedAt: 2026-10-06 # set on publish
prs:
  - { repo: app-react, number: 3482, audience: customer, area: Platform }
  - { repo: api, number: 1557, audience: skip }
```

### Page shape

1. A list of changes, grouped by `area`. One bullet per change a reader notices, not per PR: a PR can give several bullets, and related PRs (also across repos) share one. Each line describes the effect, with a badge: new / improved / fixed, in that order. No commit prefixes, no jargon, no feature flags.
2. Deep dives below the list, as cards. `feature` PRs get one by default, and their bullet links to it. A dev can promote any other item in the release PR.

### Media

- Stored locally in the release folder. The skill warns above ~5 MB per file. Move to GCS once that limit becomes a problem.
- Video: a raw Playwright recording from a demo spec in the source repo (`e2e/demos/<slug>.demo.ts`, `video: 'on'`). The dev runs it and drops the `.webm` into `media/`. Captions and spotlights are a later post-edit layer.

## The skill

Lives in the release-notes repo (`.claude/skills/`), because it changes together with the content schema. Three modes:

- `/release-notes <product>`: draft the upcoming release, after a drop on staging.
- `/release-notes <product> publish`: fill in `versions` and `publishedAt` and rename the folder, once prod is out.
- `/release-notes <product> <YYYY-MM-DD>`: backfill a past release, together with the user, straight on `main`.

Config (`sources.json`): a product has a name, a closed list of `areas` (anything unclear goes to `Overig`) and one or more repos, each with its branches and optional locales.

There is one glossary: `glossary.md` in release-notes, with per concept the English and Dutch name and the words that are wrong (a **Never** column, enforced by `scripts/check-terms.mjs`). The source repos' own glossaries describe code, not what readers call things, so they aren't read; their locales stay the source for literal UI labels.

Per run:

1. `scripts/collect.mjs` reads each repo's commit range: `<prod>...staging` for the upcoming release, or the previous tag up to that day's tag for a past one. PR numbers come from merge and squash commit titles, with GitHub's "PRs for this commit" as a fallback; promotion PRs are left out. It also reads the GitHub Release text (the draft one for an upcoming release), which is the devs' own summary and the best context for technical PRs like api's.
2. Skip PRs already in the entry's `prs`, so text a dev already edited stays as it is.
3. Classify each new PR:
   - Dependabot PRs: always `skip` (filtered by author).
   - Refactors, tests, CI, tooling: `skip`. Fixes to something new in the same release: `skip`.
   - Feature flags, analytics, permission changes: at least `internal`. api changes count only when users notice them.
   - Security fixes: never `customer` automatically.
   - Everything else: `customer`. The levels are nested, so the internal page shows internal + customer.
4. Pick an `area` from the product's list.
5. Write `en.md`, then derive `nl.md`. Pages go by their navigation label in sentence case.
6. Trace every name and claim. Names come from, in order: `glossary.md`, the team's own words (release text, PR titles), the locales, then the code. The skill never coins a name: without a source it describes what the reader sees, and lists the term for the proofreader. Claims about scope and history need a source too, or go on a "Claims to check" list. Then the term check runs.
7. Open the release PR, or push to it if it exists. The PR body lists every skipped PR with a one-line reason, so the reviewer can catch a wrong classification.

## Release PR

- One PR per release. Later staging drops push to the same PR.
- The Vercel preview shows the draft. Devs edit `en.md` and add media there.
- PR checklist: a Dutch speaker proofreads `nl.md` for language and readability before merging (required).
- Merging when prod goes out publishes the notes. There's no draft/live status field.
- Publishing first turns every name a reviewer replaced into a glossary row, so the skill learns from each review.
- Announcing in Slack stays manual.

## Later, not now

- Three views from the same releases:
  - Company view of Faqta: a "Begrippen" page from the terms file, and a badge on bullets customers can see, so sales reads one page.
  - Customer view: a separate deployment, Faqta only, teacher tone (benefit first, grouped by teacher task), maybe monthly. Support owns the tone.
  - Dev view: only if devs miss it. Its value is grouping FE and BE PRs per ticket plus a "let op" section, not a copy of the PR list.
- api adopting the `What changes for users` PR format (to propose to the team).
- A post-edit layer for demo videos (captions, spotlights, trims).
- GCS for media.
- A Slack announcement step.
- A dev-side override label for the audience classification, if the skill's classification turns out unreliable.
- Links to support articles from bullets and deep dives, once support articles exist for the features.

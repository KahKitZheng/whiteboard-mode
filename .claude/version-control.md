# Git Conventions

This file provides guidance for using Git in this repository.

## Commits

Follow atomic commit principles to keep history clean and reviewable.

**Atomic Commits:**

- Each commit should do one logical thing
- If a commit title contains "and", consider splitting it into multiple commits
- Exception: When the second part is a necessary consequence of the first (e.g., "Add feature and update tests")

```bash
# Good — atomic commits
git commit -m "Add user authentication context"
git commit -m "Update login form to use auth context"
git commit -m "Add logout functionality"

# Bad — multiple concerns in one commit
git commit -m "Add auth context and update login form and add logout"

# Acceptable — consequence of the change
git commit -m "Rename getCwd to getCurrentWorkingDirectory and update callers"
git commit -m "Add dark mode toggle and persist user preference"
```

**Split by layer/concern:**

Even when building one feature, commit each layer separately (e.g., feature flags, types, constants, translations, utils, redux, components). Each commit should leave the app in a working state. Order based on dependencies, not a fixed sequence.

```bash
# Good — split by layer
git commit -m "Add TileExtended type with settings and media"
git commit -m "Add workFormatUtils helper"
git commit -m "Add TeachingTileCardDetailsBase component"
git commit -m "Integrate tile details panel in teaching mode"
git commit -m "Add work format translations"

# Bad — everything in one commit
git commit -m "Add tile details panel to teaching mode"
```

**When to split commits:**

- Multiple unrelated features or fixes
- Refactoring + behavior change (split into two commits)
- Multiple domain changes (e.g., updating both auth and course modules)
- Different layers within the same feature (see above)

**When it's okay to keep together:**

- Change + its tests
- Rename + updating all callers (this is integration)
- Changes that must be together for the app to work

**Commit Prefixes:**

Use optional prefixes for clarity, but apply them correctly based on context:

```bash
# Feature branches (during active development) — plain descriptive messages
git commit -m "Add tile details panel"
git commit -m "Integrate contexts in layout"
git commit -m "Correct details panel grid layout"

# Use "Fix:" only for actual bugs (broken behavior, regressions)
git commit -m "Fix: Details panel not rendering on mobile"
git commit -m "Fix: Course selection state persisting after logout"

# Other useful prefixes
git commit -m "Refactor: Extract tile state into context"
git commit -m "Docs: Update API integration guide"
git commit -m "Chore: Update dependencies"
```

## Branches

Branching off a remote-tracking ref (`origin/development`) makes Git set that ref as the new branch's upstream. A plain `git push` — or VS Code's Sync/Publish button — then pushes the commits straight onto `development`. So always branch with `--no-track` and set the upstream to the branch's own name on the first push.

```bash
# Good — no tracking on create, upstream = own remote branch
git fetch origin development
git checkout -b fix/some-bug --no-track origin/development
git push -u origin fix/some-bug

# Bad — silently tracks origin/development; the next push lands on development
git checkout -b fix/some-bug origin/development
git push
```

Before the first push, verify the upstream with `git status -sb`. It must show `## fix/some-bug` (none) or `## fix/some-bug...origin/fix/some-bug`, never `...origin/development`. If it's wrong, run `git branch --unset-upstream` and push with `-u`.

## Pull requests

Never commit or push directly to `development`, `staging`, or `main`: create a new branch first, even for a one-line fix. All three only change through merged PRs.

PRs target `development` (a stacked PR targets its base PR's branch until that one merges; see Scope) and are always created as a draft (`gh pr create --draft`). The author marks one ready once it's set to merge or be reviewed. A PR documents every change, reviewed or not.

### Risk

Risk is how likely the change is to hurt users, times how many it hurts. How big the diff is doesn't count: a one-line change to a data write is not low-risk, and a large CSS-only PR can be.

**Needs a review:**

- Data writes or a change to the stored shape (it propagates, and nobody sees it break)
- Shared selectors, reducers, or hooks
- Student-facing flows: navigation, redirects, access
- Auth and permissions
- Generated or mechanical changes across many files (codemods)
- An "(⚠️ Extra)" that would need a review on its own (see Scope)
- A large PR in general: one person can't verify it alone

**Low-risk:**

- CSS/layout and copy
- A new prop that only one caller opts into
- A change confined to one screen whose worst case is visible right away

When in doubt, treat the PR as needing a review.

The author makes the risk call and states it in the `Impact` section.

Labels drive the version bump when `staging` is merged into `main`: `feature` (new functionality) → minor, `bug` → patch. Anything else gets no label and counts as a patch. Claude suggests the label but leaves applying it to the author.

### Scope

Keep a PR to one scoped change: related changes grouped together.

- Small unrelated changes may ride along, as long as they don't raise the PR's risk. List each one in `What changes for users` marked "(⚠️ Extra)", so it's visible: a bare "(Extra)" is easy to overlook.
- An extra that would need a review on its own makes the whole PR need one. Moving it to its own PR is the author's call. Claude doesn't split branches or PRs on its own: it flags the extra in `Impact` and proposes a split plan, then waits for the author to approve.
- Stack PRs only when one depends on another. Independent changes each branch off `development`, so they merge in any order and don't block each other.
- In a stacked PR, name the base PR in `Notes`: "Based on #1234. Merge that one first, then retarget this PR to `development`."

### Body

One template for every PR. Only the depth of `How to test` changes with risk.

Keep the prose about why the change is needed and what it means for users. Leave out implementation details: the diff already shows them. Mention a technical detail only when the reader needs it to understand the problem or the risk.

```md
Closes #12

## What changes for users

1-2 sentences: what changes, and why.

## Where

Screens/flows affected.

## Impact

**User risk:** low | needs review. The worst case, in one line.
Trade-offs, with the real one in bold.

## How to test

<!-- see below -->

## Notes

Optional: stacked PRs, BE tickets, known issues.
```

- Link the GitHub issue with `Closes #<n>`. Without an issue, leave the line out.
- `What changes for users` feeds the release notes (the `release-notes` repo drafts them from it), so write it for a colleague who isn't a dev. Keep the heading exactly as written.
- `How to test` is always a `- [ ]` checklist of steps, in order, written for someone without your context. Start with the setup when it isn't obvious (live API or mocks, which template/course), then one action per step followed by "Check that \_\_\_". Mark optional steps as optional.
- A **low-risk** PR usually needs one or two steps. A PR that **needs a review** covers every case, including the edge paths.
- No screenshots or evidence per step. The section guides the reviewer; it is not a report of what was verified. An image is fine when it explains the change.

```md
<!-- Needs review -->

Run against the live API.

- [ ] Open a template with an arrow block that has an icon.
- [ ] Clear the icon (`Geen icoon`). Check that it disappears right away and the save bar shows.
- [ ] Save. Check that the save bar disappears.
- [ ] Reload. Check that the icon is still cleared.
- [ ] Optional: publish, then open a course made from that template. Check that the icon is gone there too.

<!-- Low-risk -->

- [ ] Open a legacy course with a wide cover image. Check that the sidebar cover is filled.
```

#!/usr/bin/env bash
# Prints the next version for what's on HEAD: any PR labelled `feature` since the latest tag
# bumps the minor version, otherwise the patch. Major bumps are manual. Without tags: 0.1.0.
# Uses the latest tag by version rather than `git describe`: staging doesn't contain the merge
# commit on main that carries the tag, so describe would find an older one there.
set -euo pipefail

last=$(git tag --list '[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -1)
if [ -z "$last" ]; then
  echo 0.1.0
  exit 0
fi

# PR numbers from merge commits (`Merge pull request #12`) and squash commits (`Title (#12)`)
numbers=$(git log --format=%s "$last..HEAD" \
  | { grep -oE '^Merge pull request #[0-9]+|\(#[0-9]+\)$' || true; } \
  | { grep -oE '[0-9]+' || true; } | sort -u)
bump=patch
for n in $numbers; do
  if gh pr view "$n" --json labels -q '.labels[].name' | grep -qx feature; then
    bump=minor
    break
  fi
done

IFS=. read -r major minor patch <<< "$last"
if [ "$bump" = minor ]; then
  echo "$major.$((minor + 1)).0"
else
  echo "$major.$minor.$((patch + 1))"
fi

#!/usr/bin/env bash
# Downloads the study-note folders that aren't checked out locally into a scratch
# dir, so scripts/import-tutorials.mjs can import them the same way it imports the
# local DevOps notes. Read-only: uses the GitHub API (gh), never clones.
#
# Usage: scripts/fetch-remote-notes.sh   (needs the `gh` CLI, authenticated)
set -euo pipefail

DEST="${1:-/tmp/tutorial-import}"

fetch_dir() {
  local repo="$1" src_path="$2" out_dir="$3"
  mkdir -p "$out_dir"
  echo "Fetching $repo/$src_path → $out_dir"
  # List the .md files in the folder and download each one's raw content.
  gh api "repos/$repo/contents/$src_path" --jq '.[] | select(.type=="file" and (.name|endswith(".md"))) | .name' |
    while IFS= read -r name; do
      gh api "repos/$repo/contents/$src_path/$name" --jq '.content' |
        base64 -d >"$out_dir/$name"
    done
}

# Embedded-Linux-Notes is checked out locally now (see import-tutorials.mjs's
# TRACKS), so there's nothing to fetch here at the moment — add fetch_dir calls
# above for any future study-note repo that isn't checked out locally.

echo "Done → $DEST"

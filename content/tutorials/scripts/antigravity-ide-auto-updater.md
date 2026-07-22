---
title: Antigravity IDE Auto-Updater Script
description: >-
  Automated Bash script to check the official website for IDE releases, download, verify integrity, extract, and install into system directories with zero manual steps.
order: 1
tags:
  - bash
  - scripts
  - automation
  - ide
draft: false
author: abdallah-shehawey
---

`antigravity-update.sh` is an automated updater script that checks the official download portal for new releases of the Antigravity IDE, downloads the tarball with resume capabilities, verifies archive integrity, and safely installs it into system directories with root ownership.

## Script Source (`antigravity-update.sh`)

```bash
#!/usr/bin/env bash
# Antigravity IDE auto-updater
# Steps (all in one run):
#   1. Read the locally installed version.
#   2. Find the latest version + real download URL from the website.
#   3. If the site is newer: download the tar.gz to $HOME (resumable),
#      verify it, extract it, and install it into the system install dir.
set -euo pipefail

INSTALL_DIR="/usr/share/antigravity-ide"
PRODUCT_JSON="$INSTALL_DIR/resources/app/product.json"
DEST_DIR="$HOME"

# ---- arch -> URL arch segment -------------------------------------------------
case "$(uname -m)" in
  x86_64)        ARCH="linux-x64" ;;
  aarch64|arm64) ARCH="linux-arm" ;;
  *) echo "Unsupported arch: $(uname -m)" >&2; exit 1 ;;
esac

# ---- 1) local version ---------------------------------------------------------
LOCAL="$(jq -r '.ideVersion // empty' "$PRODUCT_JSON" 2>/dev/null || true)"

# ---- 2) latest version + real download URL (URL carries version + build id) ---
URL="$(curl -sL --compressed https://antigravity.google/download \
  | grep -oiP "href=\"\Khttps://edgedl[^\"]*${ARCH}/Antigravity[^\"]*\.tar\.gz" \
  | head -n1)"
[[ -z "$URL" ]] && { echo "Could not find the ${ARCH} download link on the site." >&2; exit 1; }
REMOTE="$(grep -oP 'stable/\K[0-9]+\.[0-9]+\.[0-9]+' <<<"$URL" | head -n1)"

echo "Installed : ${LOCAL:-none}"
echo "Latest    : ${REMOTE}"

# ---- up-to-date? (highest of the two == local) --------------------------------
if [[ -n "$LOCAL" && "$(printf '%s\n%s\n' "$LOCAL" "$REMOTE" | sort -V | tail -n1)" == "$LOCAL" ]]; then
  echo "Already up to date. Nothing to do."
  exit 0
fi

# ---- 3a) download (resumable) -------------------------------------------------
TARBALL="${DEST_DIR}/Antigravity-IDE-${REMOTE}.tar.gz"
echo "New version available -> downloading to: $TARBALL"
curl -L --fail --retry 5 --retry-delay 2 -C - -o "$TARBALL" "$URL"

# verify the download is complete (size must match the server)
REMOTE_SIZE="$(curl -sIL "$URL" | awk 'tolower($1)=="content-length:"{v=$2} END{gsub(/\r/,"",v); print v}')"
LOCAL_SIZE="$(stat -c%s "$TARBALL")"
if [[ -n "$REMOTE_SIZE" && "$REMOTE_SIZE" != "$LOCAL_SIZE" ]]; then
  echo "Incomplete download (${LOCAL_SIZE}/${REMOTE_SIZE} bytes). Re-run to resume." >&2
  exit 1
fi
tar -tzf "$TARBALL" >/dev/null 2>&1 || { echo "Corrupt archive. Delete it and re-run." >&2; exit 1; }

# ---- 3b) extract to a temp dir ------------------------------------------------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "Extracting..."
tar -xzf "$TARBALL" -C "$TMP"
SRC="$TMP/Antigravity IDE"
[[ -d "$SRC" ]] || { echo "Unexpected archive layout." >&2; exit 1; }

# ---- 3c) install into the system dir (needs sudo) -----------------------------
echo "Installing into $INSTALL_DIR (sudo password may be requested)..."
sudo rsync -a --delete --chown=root:root \
  --exclude '.claude' --exclude 'antigravity' \
  "$SRC"/ "$INSTALL_DIR"/

sudo ln -sfn antigravity-ide "$INSTALL_DIR/antigravity"
sudo chown root:root "$INSTALL_DIR/chrome-sandbox"
sudo chmod 4755 "$INSTALL_DIR/chrome-sandbox"

NEW="$(jq -r '.ideVersion // empty' "$PRODUCT_JSON" 2>/dev/null || true)"
echo "Done. Antigravity IDE is now: ${NEW:-unknown}"

rm -f "$TARBALL"
echo "Cleaned up downloaded archive."
```

## Features & Usage

1. **Automatic Architecture Detection**: Supports `x86_64` and `aarch64`/`arm64`.
2. **Version Comparison**: Reads local `product.json` and compares with remote releases via `sort -V`.
3. **Resumable Downloads**: Uses `curl -C -` to resume interrupted downloads.
4. **Integrity Check**: Verifies HTTP `Content-Length` and tests archive validity with `tar -tzf`.
5. **Clean Installation**: Uses `rsync --delete` with proper `chrome-sandbox` SUID permissions.

Make executable and add to PATH:
```bash
chmod +x ~/.local/bin/antigravity-update.sh
```

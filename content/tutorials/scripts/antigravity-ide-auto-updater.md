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

## Summary of Paths & Locations

| Component | Path Location | Description |
|---|---|---|
| **Updater Script** | `~/.local/bin/antigravity-update.sh` | Main automated updater script |
| **Installation Directory** | `/usr/share/antigravity-ide/` | App target directory (`INSTALL_DIR`) |
| **Executable Binary** | `/usr/share/antigravity-ide/antigravity-ide` | Binary launcher invoked by `.desktop` |
| **Desktop Entry File** | `/usr/share/applications/antigravity-ide.desktop` | System application menu shortcut |
| **CLI Symlink** | `/usr/local/bin/antigravity` | Global command shortcut |

## Key Features

1. **Automatic Architecture Detection**: Supports `x86_64` and `aarch64`/`arm64`.
2. **Version Comparison**: Reads local `product.json` and compares with remote releases via `sort -V`.
3. **Resumable Downloads**: Uses `curl -C -` to resume interrupted downloads.
4. **Integrity Check**: Verifies HTTP `Content-Length` and tests archive validity with `tar -tzf`.
5. **Clean Installation**: Uses `rsync --delete` with proper `chrome-sandbox` SUID permissions.
6. **Desktop Integration**: Standard `.desktop` entry configuration pointing directly to the installed application binary and icon.

## Step-by-Step Manual Setup

Follow these manual setup steps to prepare your system, install dependencies, and configure the desktop shortcut:

### 1. Install Required Dependencies
Make sure `jq`, `curl`, `rsync`, and `tar` are installed on your system:
```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y jq curl rsync tar

# Fedora / RHEL
sudo dnf install -y jq curl rsync tar

# Arch Linux
sudo pacman -S --needed jq curl rsync tar
```

### 2. Prepare System Installation Directory
Create the target installation directory defined in the script (`INSTALL_DIR="/usr/share/antigravity-ide"`):
```bash
sudo mkdir -p /usr/share/antigravity-ide
```

### 3. Save Script and Set Executable Permissions
Save `antigravity-update.sh` inside your local bin directory (`~/.local/bin`) and grant execution permissions:
```bash
mkdir -p ~/.local/bin
chmod +x ~/.local/bin/antigravity-update.sh
```

Ensure `~/.local/bin` is included in your `$PATH` (e.g., in `~/.bashrc` or `~/.zshrc`):
```bash
export PATH="$HOME/.local/bin:$PATH"
```

### 4. Create Desktop Entry & Register Launcher
Save the `.desktop` content provided below to `/usr/share/applications/antigravity-ide.desktop` (requires `sudo`) or `~/.local/share/applications/antigravity-ide.desktop`:

```bash
sudo nano /usr/share/applications/antigravity-ide.desktop
```

After saving, update your desktop database to register the new launcher icon in your app menu:
```bash
sudo update-desktop-database
```

### 5. Create Global CLI Command (Optional)
To launch the IDE from any terminal prompt by typing `antigravity`, create a symlink in `/usr/local/bin`:
```bash
sudo ln -sfn /usr/share/antigravity-ide/antigravity-ide /usr/local/bin/antigravity
```

### 6. Run Initial Update
Run the script to download, verify, and install the latest release for the first time:
```bash
antigravity-update.sh
```

---

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
# Replace files, drop stale ones, force root ownership, but keep local extras.
sudo rsync -a --delete --chown=root:root \
  --exclude '.claude' --exclude 'antigravity' \
  "$SRC"/ "$INSTALL_DIR"/
# Keep the convenience symlink and the setuid sandbox that the app needs.
sudo ln -sfn antigravity-ide "$INSTALL_DIR/antigravity"
sudo chown root:root "$INSTALL_DIR/chrome-sandbox"
sudo chmod 4755 "$INSTALL_DIR/chrome-sandbox"

NEW="$(jq -r '.ideVersion // empty' "$PRODUCT_JSON" 2>/dev/null || true)"
echo "Done. Antigravity IDE is now: ${NEW:-unknown}"

# Clean up the downloaded archive after successful installation
rm -f "$TARBALL"
echo "Cleaned up downloaded archive."
```

## Desktop Entry Configuration (`antigravity-ide.desktop`)

To launch Antigravity IDE from your application launcher, create a `.desktop` file at `/usr/share/applications/antigravity-ide.desktop` (or `~/.local/share/applications/antigravity-ide.desktop` for user-level installation):

```ini
[Desktop Entry]
Name=Antigravity
Comment=Experience liftoff
GenericName=Text Editor
Exec=/usr/share/antigravity-ide/antigravity-ide %F
Icon=/usr/share/antigravity-ide/resources/app/resources/linux/code.png
Type=Application
StartupNotify=false
StartupWMClass=antigravity-ide
Categories=TextEditor;Development;IDE;
MimeType=application/x-antigravity-workspace;
Actions=new-empty-window;
Keywords=vscode;

[Desktop Action new-empty-window]
Name=New Empty Window
Name[cs]=Nové prázdné okno
Name[de]=Neues leeres Fenster
Name[es]=Nueva ventana vacía
Name[fr]=Nouvelle fenêtre vide
Name[it]=Nuova finestra vuota
Name[ja]=新しい空のウィンドウ
Name[ko]=새 빈 창
Name[ru]=Новое пустое окно
Name[zh_CN]=新建空窗口
Name[zh_TW]=開新空視窗
Exec=/usr/share/antigravity-ide/antigravity-ide --new-window %F
Icon=/usr/share/antigravity-ide/resources/app/resources/linux/code.png
```

> **Important**: The executable binary path specified in the `Exec=` directives (`/usr/share/antigravity-ide/antigravity-ide`) must correspond directly to the installation directory (`INSTALL_DIR="/usr/share/antigravity-ide"`) defined in the `antigravity-update.sh` script. If you customize `INSTALL_DIR` in the updater script, ensure you update the `Exec=` path in your `.desktop` file accordingly.

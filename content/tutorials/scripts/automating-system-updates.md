---
title: Automating Full System Updates (update-every-thing)
description: >-
  A resilient update-every-thing script with automatic retry loops covering DNF system packages, Flatpaks, firmware via fwupdmgr, GNOME extensions, and IDE updates.
order: 2
tags:
  - bash
  - scripts
  - fedora
  - automation
draft: false
author: abdallah-shehawey
---

`update-every-thing` is a single Bash script that updates your entire Fedora desktop system in one go with built-in retry mechanisms for network resilience.

## Script Source (`update-every-thing`)

```bash
#!/usr/bin/env bash
# Script: update-every-thing
# Function: Full Fedora system updater
#
# Update order:
#   1. Antigravity IDE
#   2. DNF System Packages
#   3. Firmware
#   4. Flatpak
#   5. GNOME Extensions

set -e

retry_command() {
    local cmd="$1"
    local name="$2"

    while true; do
        echo
        echo "============================================================"
        echo "🔄 Trying: $name..."
        echo "============================================================"

        if eval "$cmd"; then
            echo "✅ $name finished successfully"
            break
        else
            echo "❌ $name failed."
            echo "🔁 Retrying in 2 seconds..."
            sleep 2
        fi
    done
}

echo
echo "============================================================"
echo "🚀 Starting Full Fedora Update"
echo "============================================================"

# 1. Antigravity IDE Update
if command -v antigravity-update.sh &> /dev/null; then
    if antigravity-update.sh; then
        echo "✅ Antigravity IDE check/update finished successfully"
    else
        echo "⚠️ Antigravity IDE update failed. Continuing..."
    fi
else
    echo "⚠️ antigravity-update.sh not found in PATH — skipping"
fi

# 2. DNF System Update
retry_command \
    "sudo dnf upgrade -y --refresh" \
    "DNF System Update"

# 3. Firmware Update
if command -v fwupdmgr &> /dev/null; then
    retry_command \
        "sudo fwupdmgr refresh --force" \
        "Firmware Metadata Refresh"

    retry_command \
        "sudo fwupdmgr update -y" \
        "Firmware Update"
else
    echo "⏭️ fwupdmgr not installed — skipping firmware update"
fi

# 4. Flatpak Update
if command -v flatpak &> /dev/null; then
    retry_command \
        "flatpak update -y" \
        "Flatpak Update"
else
    echo "⏭️ Flatpak not installed — skipping"
fi

# 5. GNOME Extensions
if command -v gnome-extensions &> /dev/null; then
    retry_command \
        "sudo dnf upgrade -y 'gnome-shell-extension-*'" \
        "GNOME Extensions Update"

    echo "📋 Installed GNOME Extensions:"
    gnome-extensions list || true
else
    echo "⏭️ GNOME Extensions CLI not installed — skipping"
fi

echo
echo "============================================================"
echo "🎉 All Updates Completed Successfully!"
echo "============================================================"
```

## Features

- **Retry Loop**: Retries failing commands every 2 seconds until successful (great for unstable network connections).
- **Comprehensive Coverage**: Updates system DNF packages, Flatpaks, hardware firmware (`fwupdmgr`), GNOME extensions, and IDEs.
- **Graceful Fallbacks**: Safely skips components that are not installed on the system.

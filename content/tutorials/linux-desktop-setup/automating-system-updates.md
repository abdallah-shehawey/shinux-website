---
title: Automating System Updates
description: >-
  Keeping a Linux desktop current means touching several update mechanisms every
  time: the system package manager, Flatpak, GNOME extensions, and firmware.
  Running each one by hand gets old fast, so…
order: 1
tags:
  - linux
draft: false
author: abdallah-shehawey
---
Keeping a Linux desktop current means touching several update mechanisms every time: the system package manager, Flatpak, GNOME extensions, and firmware. Running each one by hand gets old fast, so it's worth wrapping them in a single script — one for Ubuntu, one for Fedora — that updates everything except NVIDIA drivers by default (those are best updated deliberately, not as a side effect of a routine update).

## What the Script Covers

Both scripts do the same job on their respective distro:

- Full system package update
- Flatpak updates
- GNOME extensions update
- Firmware updates (Fedora, via `fwupd`)
- Cleanup of unused packages afterward
- NVIDIA drivers **skipped by default**, with an explicit `--with-nvidia` flag to opt in

## Installing the Script

Save the script as an executable on your `$PATH` so it's callable as a plain command:

```bash
sudo nvim /usr/local/bin/update-every-thing
sudo chmod +x /usr/local/bin/update-every-thing
```

Usage is identical on both distros:

```text
update-every-thing              # normal update, NVIDIA skipped
update-every-thing --with-nvidia # also update NVIDIA drivers
```

## The Ubuntu Script

```bash
#!/bin/bash
# Script: update-every-thing
# Function: Update everything in Ubuntu
# Default: skip NVIDIA drivers
# Option: --with-nvidia

echo "Starting full Ubuntu update..."

WITH_NVIDIA=false

if [[ "$1" == "--with-nvidia" ]]; then
  WITH_NVIDIA=true
  echo "NVIDIA drivers WILL be updated."
else
  echo "NVIDIA drivers will be skipped."
  sudo apt-mark hold nvidia-driver-* nvidia-dkms-* nvidia-kernel-* libnvidia-* >/dev/null 2>&1
fi

sudo apt update -y
sudo apt upgrade -y
sudo apt full-upgrade -y
sudo apt install -y linux-generic
sudo apt autoremove -y
sudo apt autoclean -y

sudo snap refresh
flatpak update -y

pro security-status || true
sudo pro fix || true

gnome-extensions update || true
sudo ubuntu-drivers autoinstall || true

if [ "$WITH_NVIDIA" = false ]; then
  sudo apt-mark unhold nvidia-driver-* nvidia-dkms-* nvidia-kernel-* libnvidia-* >/dev/null 2>&1
fi

echo "Update finished!"
```

The key trick is `apt-mark hold`/`unhold`: instead of trying to exclude NVIDIA packages from an `apt upgrade` run (fragile with wildcards), the script freezes them before the upgrade and unfreezes them right after, so a normal upgrade simply can't touch them unless `--with-nvidia` was passed.

## The Fedora Script

```bash
#!/bin/bash
# Script: update-everything-fedora
# Function: Update everything in Fedora
# Default: skip NVIDIA drivers
# Option: --with-nvidia (update NVIDIA as well)

echo "Starting full Fedora update..."

WITH_NVIDIA=false
EXCLUDE_NVIDIA=""

if [[ "$1" == "--with-nvidia" ]]; then
  WITH_NVIDIA=true
  echo "NVIDIA drivers WILL be updated."
else
  echo "NVIDIA drivers will be skipped."
  EXCLUDE_NVIDIA="--exclude=\*nvidia\* --exclude=\*cuda\*"
fi

echo "Optimizing DNF..."
sudo dnf -y install dnf-plugins-core >/dev/null 2>&1
sudo dnf makecache --refresh

echo "Updating Fedora packages..."
sudo dnf upgrade -y --refresh $EXCLUDE_NVIDIA

echo "Updating firmware (fwupd)..."
sudo fwupdmgr refresh --force
sudo fwupdmgr update -y || true

if command -v flatpak &> /dev/null; then
  echo "Updating Flatpak packages..."
  flatpak update -y
fi

if command -v gnome-extensions &> /dev/null; then
  echo "Checking GNOME extensions..."
  if command -v dnf &> /dev/null; then
    sudo dnf upgrade -y "gnome-shell-extension-*" || true
  fi
  echo "Installed extensions:"
  gnome-extensions list || true
fi

if [[ "$WITH_NVIDIA" == true ]]; then
  echo "Verifying NVIDIA driver state..."
  sudo dnf list installed \*nvidia\* || true
fi

echo "Cleaning system..."
sudo dnf autoremove -y
sudo dnf clean all

echo "Fedora update finished!"
```

Fedora's exclusion mechanism differs from Ubuntu's: instead of holding packages, it passes `--exclude` globs straight to `dnf upgrade`, and separately checks firmware via `fwupdmgr` — something Ubuntu's script doesn't need to handle explicitly.

> **Notes:**
>
> - Fedora requires RPMFusion for NVIDIA drivers to be manageable via `dnf` at all.
> - Ubuntu's script uses `apt-mark hold` to freeze NVIDIA packages; Fedora's uses `--exclude` globs.
> - Both scripts are safe to run repeatedly — every step is idempotent.

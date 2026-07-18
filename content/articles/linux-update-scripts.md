---
title: One Script to Update Everything on Ubuntu & Fedora
description: >-
  A single command that updates apt/dnf, Flatpak, and GNOME extensions, with
  NVIDIA drivers skipped by default.
date: 2026-05-24T00:00:00.000Z
tags:
  - ubuntu
  - fedora
  - bash
  - maintenance
locale: en
draft: false
author: abdallah-shehawey
---

Unified, clean update scripts for **Ubuntu** and **Fedora**. Both scripts update the system, Flatpak, and GNOME extensions, and **skip NVIDIA drivers by default** (NVIDIA updates can occasionally break things mid-session, so it's safer to opt in explicitly).

## Features

- Full system update
- Flatpak updates
- GNOME extensions update
- Optional NVIDIA driver update (`--with-nvidia`)
- Cleanup after update

## Ubuntu

### Install the script

```bash
sudo nvim /usr/local/bin/update-every-thing
sudo chmod +x /usr/local/bin/update-every-thing
```

### Usage

Normal update (skip NVIDIA):

```bash
update-every-thing
```

Update including NVIDIA drivers:

```bash
update-every-thing --with-nvidia
```

### The script

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

## Fedora

### Install the script

```bash
sudo nvim /usr/local/bin/update-every-thing
sudo chmod +x /usr/local/bin/update-every-thing
```

### Usage

```bash
update-every-thing
update-every-thing --with-nvidia
```

### The script

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
  echo "Note: user-installed GNOME extensions are updated via GNOME Software or the browser."
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

## Notes

- Fedora requires RPMFusion for NVIDIA drivers
- The Ubuntu script uses `apt-mark hold` to freeze NVIDIA updates
- Safe to run multiple times

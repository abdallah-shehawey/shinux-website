---
title: Useful Linux Commands & Notes
description: >-
  A running collection of handy one-liners: Bluetooth, GPU switching,
  clang-format, coredumps, and more.
date: 2026-05-10T00:00:00.000Z
tags:
  - tips
  - cli
locale: en
draft: false
author: abdallah-shehawey
---

A grab-bag of small commands that come up often enough to be worth keeping in one place.

## Bluetooth

```bash
sudo systemctl restart bluetooth
```

## Download a playlist from YouTube

```bash
yt-dlp -f 137+140 "Playlist Link"
# OR
yt-dlp -f "bv*+ba/b" -o "%(title)s.%(ext)s" "Playlist Link"

# and to update it
sudo yt-dlp -U
```

## Unrar a folder

```bash
unrar x -o+ "Folder.rar" "Folder/"
```

## Kill any program

```bash
sudo xkill
```

## Python virtual environment

```bash
python3 -m venv my_env
source my_env/bin/activate
```

## Run apps with an external NVIDIA GPU

```bash
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia <program>
```

### Default GPU select

```bash
sudo prime-select intel
sudo prime-select nvidia
```

## Clang-format one-liner

```bash
clang-format -i -style="{BasedOnStyle: Microsoft, IndentWidth: 2, TabWidth: 2, UseTab: Never}" file.c
```

## NVIDIA package hold/unhold

Useful before/after a full system upgrade if you want to control exactly when NVIDIA driver updates land.

```bash
sudo apt-mark hold nvidia-driver-* nvidia-dkms-* nvidia-kernel-* libnvidia-*
sudo apt-mark unhold nvidia-driver-* nvidia-dkms-* nvidia-kernel-* libnvidia-*
sudo apt upgrade
```

## Change the default terminal

```bash
sudo update-alternatives --config x-terminal-emulator
```

## Replace a word across files

```bash
find . -type f -exec sed -i 's/oldword/newword/g' {} +
```

With a specific file extension:

```bash
find . -type f -name "*.txt" -exec sed -i 's/oldword/newword/g' {} +
```

## Force a program into dark mode

```bash
GTK_THEME=Adwaita:dark program
```

## Laptop conservation mode (battery charge limiter)

```bash
# enable
echo 1 | sudo tee /sys/bus/platform/drivers/ideapad_acpi/*/conservation_mode

# disable
echo 0 | sudo tee /sys/bus/platform/drivers/ideapad_acpi/*/conservation_mode
```

## Delete all coredumps

```bash
sudo rm -f /var/lib/systemd/coredump/*
```

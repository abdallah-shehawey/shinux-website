---
title: Useful Linux Commands & Tips
description: >-
  A running collection of small, easy-to-forget commands that come up often
  enough on a day-to-day Linux desktop to be worth keeping in one place —
  Bluetooth resets, GPU switching, bulk…
order: 5
tags:
  - linux
draft: false
author: abdallah-shehawey
---
A running collection of small, easy-to-forget commands that come up often enough on a day-to-day Linux desktop to be worth keeping in one place — Bluetooth resets, GPU switching, bulk find-and-replace, and disabling core dumps.

## 1. Bluetooth acting up

```bash
sudo systemctl restart bluetooth
```

## 2. Downloading a playlist with yt-dlp

```bash
yt-dlp -f 137+140 "Playlist Link"
# or, a more portable format selector:
yt-dlp -f "bv*+ba/b" -o "%(title)s.%(ext)s" "Playlist Link"

# keep yt-dlp itself up to date
sudo yt-dlp -U
```

## 3. Extracting a `.rar` archive

```bash
unrar x -o+ "Folder.rar" "Folder/"
```

## 4. Force-killing an unresponsive program

```bash
sudo xkill
```

Click the offending window and it's gone — faster than hunting for the PID with `ps`/`kill` when a GUI app is frozen.

## 5. Python virtual environments

```bash
python3 -m venv my_env
source my_env/bin/activate
```

## 6. Hybrid GPU (Optimus) laptops

Force a program onto the discrete NVIDIA GPU:

```bash
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia <program>
```

Switch the system-wide default GPU:

```bash
sudo prime-select intel
sudo prime-select nvidia
```

## 7. Formatting C/C++ with clang-format

```bash
clang-format -i -style="{BasedOnStyle: Microsoft, IndentWidth: 2, TabWidth: 2, UseTab: Never}" testing.c
```

## 8. Holding/unholding NVIDIA packages

Useful when an update needs to skip NVIDIA temporarily (see the update-automation lesson, which does exactly this):

```bash
sudo apt-mark hold nvidia-driver-* nvidia-dkms-* nvidia-kernel-* libnvidia-*
sudo apt-mark unhold nvidia-driver-* nvidia-dkms-* nvidia-kernel-* libnvidia-*
sudo apt upgrade
```

## 9. Changing the default terminal emulator

```bash
sudo update-alternatives --config x-terminal-emulator
```

## 10. Bulk find-and-replace across files

```bash
find . -type f -exec sed -i 's/oldword/newword/g' {} +
```

Restricted to a specific extension:

```bash
find . -type f -name "*.txt" -exec sed -i 's/oldword/newword/g' {} +
```

## 11. Printing the duration of a batch of video files

```bash
for file in "session-1.mkv" "session-2.mkv" "session-3.mkv"; do
  echo -n "$file: "
  ffprobe -v quiet -show_entries format=duration -of csv="p=0" "$file" | \
  awk '{printf "%02d:%02d:%02d\n",$1/3600,($1%3600)/60,$1%60}'
done
```

## 12. Forcing dark mode for a single program

```bash
GTK_THEME=Adwaita:dark program
```

## 13. Laptop battery conservation mode (Lenovo/ideapad)

```bash
# enable
echo 1 | sudo tee /sys/bus/platform/drivers/ideapad_acpi/*/conservation_mode
# disable
echo 0 | sudo tee /sys/bus/platform/drivers/ideapad_acpi/*/conservation_mode
```

## 14. Disabling core dumps

Core dumps are useful for debugging a crash, but on a daily-driver machine they just eat disk space in `/var/lib/systemd/coredump/`. To disable them going forward:

```bash
sudo mkdir -p /etc/systemd/coredump.conf.d
printf '[Coredump]\nStorage=none\nProcessSizeMax=0\n' | sudo tee /etc/systemd/coredump.conf.d/99-disable.conf
sudo systemctl daemon-reload
```

To clear out ones that already exist:

```bash
sudo rm -f /var/lib/systemd/coredump/*
```

---
title: Custom App Launch Behavior via .desktop Files
description: >-
  Changing how a Linux application launches — forcing dark mode, injecting an
  environment variable, adding a HiDPI scale flag — doesn't require patching the
  app itself. Every launchable app on the…
order: 13
tags:
  - linux
draft: false
author: abdallah-shehawey
---
Changing how a Linux application launches — forcing dark mode, injecting an environment variable, adding a HiDPI scale flag — doesn't require patching the app itself. Every launchable app on the system has a `.desktop` file describing how to run it, and it's possible to override that safely without touching the original.

## 1. Why not edit the system file directly

Editing `/usr/share/applications/*.desktop` directly is a bad idea for two reasons: system updates will silently overwrite it, and the change affects every user on the machine. The fix is to copy the file into `~/.local/share/applications/` — the system always prefers a user-local `.desktop` file over the system-wide one with the same name.

## 2. Create the local applications directory

```bash
mkdir -p ~/.local/share/applications
```

## 3. Copy the original `.desktop` file

Example for GParted:

```bash
cp /usr/share/applications/gparted.desktop ~/.local/share/applications/
```

## 4. Edit the `Exec=` line

Open the copy:

```bash
nvim ~/.local/share/applications/gparted.desktop
```

The `Exec=` line is the actual command the system runs to launch the app. To force dark mode, prefix it with an environment variable via `env`:

```ini
# Before
Exec=/usr/sbin/gparted %f

# After — force a dark theme
Exec=env GTK_THEME=Adwaita:dark /usr/sbin/gparted %f
```

Any other program-specific flag can be added the same way — e.g. `--force-device-scale-factor=1.5` for HiDPI scaling.

## 5. Update the desktop database

```bash
update-desktop-database ~/.local/share/applications
```

This makes the system pick up the local override immediately.

## 6. Adjusting privilege escalation

For tools like GParted that need root, make sure `Exec=` routes through the correct wrapper for the desktop environment — `pkexec` is the standard PolicyKit wrapper:

```ini
Exec=pkexec /usr/sbin/gparted
```

Once saved and the database updated, the next launch from the application menu uses the new behavior — dark mode, custom flags, or the adjusted privilege escalation — without ever touching the original system file.

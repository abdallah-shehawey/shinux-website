---
title: "Fixing No Audio After a PipeWire Update"
description: "The three commands that fix 90% of 'no sound' issues on PipeWire."
date: 2026-07-10
tags: [audio, pipewire, troubleshooting]
locale: en
draft: false
---

If sound stopped working right after a system update, PipeWire's user
services probably crashed or got out of sync. Before anything drastic,
try restarting them.

## Step 1 — restart the PipeWire user services

```bash
systemctl --user restart pipewire pipewire-pulse wireplumber
```

## Step 2 — check they're actually running

```bash
systemctl --user status pipewire
```

You want to see `active (running)`. If it's crash-looping, check the logs:

```bash
journalctl --user -u pipewire -b --no-pager | tail -n 50
```

## Step 3 — as a last resort, reset the user config

```bash
mv ~/.config/pipewire ~/.config/pipewire.bak
systemctl --user restart pipewire pipewire-pulse wireplumber
```

This regenerates a clean default config. You can compare against your
backup afterward if you had custom tweaks in there.

Nine times out of ten, step 1 alone fixes it.

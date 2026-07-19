---
title: Enabling Hibernate on Linux (Debian-based & Fedora)
description: >-
  Configure swap, GRUB, and initramfs so your machine can hibernate and resume
  exactly where you left off.
date: 2026-04-26T00:00:00.000Z
tags:
  - debian
  - fedora
  - power-management
locale: en
draft: false
author: abdallah-shehawey
---

## Overview

Hibernate saves the entire RAM state to disk and powers off the machine. When you power it back on, the system restores exactly where you left off.

For hibernate to work properly:

- Swap must exist
- Swap size should be >= RAM
- The kernel must know where the swap is

## Debian-based distributions

Examples: Ubuntu, Linux Mint, Pop!_OS.

### Check swap

```bash
swapon --show
```

If nothing appears, you need to create swap. Check RAM:

```bash
free -h
```

Recommended: swap >= RAM.

### Find swap UUID

```bash
blkid
```

Example output:

```text
/dev/sda3: UUID="xxxx-xxxx" TYPE="swap"
```

Copy the UUID.

### Configure GRUB

Edit the GRUB config:

```bash
sudo nano /etc/default/grub
```

Find:

```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"
```

Change to:

```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash resume=UUID=YOUR_SWAP_UUID"
```

### Update GRUB

```bash
sudo update-grub
```

### Test hibernate

```bash
systemctl hibernate
```

## Fedora

Fedora uses Dracut instead of initramfs-tools, so the process differs slightly.

### Check swap

```bash
swapon --show
```

### Find swap UUID

```bash
blkid
```

### Add the resume parameter

Edit the GRUB config:

```bash
sudo nano /etc/default/grub
```

Modify:

```text
GRUB_CMDLINE_LINUX="resume=UUID=YOUR_SWAP_UUID"
```

### Rebuild GRUB

BIOS systems:

```bash
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

UEFI systems:

```bash
sudo grub2-mkconfig -o /boot/efi/EFI/fedora/grub.cfg
```

### Rebuild initramfs

```bash
sudo dracut -f
```

### Test hibernate

```bash
systemctl hibernate
```

## Troubleshooting

Check if the system supports hibernate:

```bash
cat /sys/power/state
```

If `disk` appears, hibernate is supported. Check the log:

```bash
journalctl -b
```

## Notes

- Swap must be large enough for RAM
- A swapfile works, but a swap partition is more reliable
- Secure Boot may sometimes interfere with resume

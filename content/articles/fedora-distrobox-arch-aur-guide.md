---
title: Fedora + Distrobox + Arch + AUR Setup Guide
description: >-
  Run an Arch Linux container inside Fedora with Distrobox, enable NVIDIA GPU
  support, and install AUR packages.
date: 2026-04-19T00:00:00.000Z
tags:
  - fedora
  - arch
  - distrobox
  - containers
locale: en
draft: false
author: abdallah-shehawey
---

This guide explains how to:

- Install Distrobox on Fedora
- Create an Arch Linux container
- Enable NVIDIA GPU support
- Install and use AUR inside Arch
- Export GUI applications back to Fedora
- Troubleshoot common errors

## Install Distrobox on Fedora

```bash
sudo dnf install distrobox
```

Install Podman if not already installed:

```bash
sudo dnf install podman
```

Verify installation:

```bash
distrobox --version
```

## Create an Arch Linux container

Create the container (recommended lowercase name):

```bash
distrobox create --name arch --image archlinux:latest
```

If you want NVIDIA GPU support (recommended for CUDA, AI, gaming, or GPU rendering), create the container with explicit NVIDIA integration:

```bash
distrobox create \
  --name arch \
  --image archlinux:latest \
  --nvidia
```

What `--nvidia` does:

- Mounts NVIDIA device files into the container
- Shares host NVIDIA driver libraries
- Enables CUDA / OpenGL / Vulkan acceleration inside Arch

Requirements before using `--nvidia`:

1. NVIDIA drivers must be correctly installed on Fedora (host).
2. `nvidia-smi` must work on the host system.
3. You must NOT use `sudo distrobox create` (rootless is recommended).

Verify host GPU before creating the container:

```bash
nvidia-smi
```

If this works on Fedora, the GPU will work inside the container. Enter the container:

```bash
distrobox enter arch
```

## First-time Arch setup

Update the system:

```bash
sudo pacman -Syu
```

Install build tools required for AUR:

```bash
sudo pacman -S base-devel git
```

## Install yay (AUR helper)

```bash
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si
```

Test installation:

```bash
yay -S google-chrome
```

## Installing WhatsApp from AUR (example)

Search for the correct package name:

```bash
yay -S whatsapp-for-linux
```

If prompted for a clean build:

- Choose `A` for clean build
- Press `q` to exit diff view
- Confirm with `Y`

Launch the application:

```bash
whatsapp-for-linux
```

## Export Arch apps to Fedora

To make an installed Arch application available in the Fedora menu:

```bash
distrobox-export --app whatsapp-for-linux
```

## NVIDIA GPU usage inside the container

Ensure the NVIDIA driver works on the Fedora host:

```bash
nvidia-smi
```

Inside Arch, install utilities:

```bash
sudo pacman -S nvidia-utils
```

Test the GPU:

```bash
nvidia-smi
```

For hybrid GPU systems (Optimus), force NVIDIA usage:

```bash
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia program-name
```

## Common mistakes & troubleshooting

### Mistake: deleting `~/.cache` during setup

Do **not** run:

```bash
rm -rf ~/.cache
```

Distrobox stores required files in:

```text
~/.cache/distrobox/
```

If broken:

```bash
distrobox rm arch
rm -rf ~/.cache/distrobox
```

Then recreate the container.

### Error: "crun: ptsname: Inappropriate ioctl for device"

Possible causes:

- Interrupted container setup
- Terminal session issue

Fix:

```bash
podman system reset
```

Or simply reboot / logout-login.

## Remove the container

```bash
distrobox rm arch
```

## Key notes

- Arch inside Distrobox does NOT affect Fedora
- Home directory is shared
- GPU, sound, and themes are integrated
- You can safely experiment with AUR

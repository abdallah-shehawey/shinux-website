---
title: Mirroring Your Android Phone with scrcpy (USB & Wi-Fi)
description: >-
  Install scrcpy and control your Android phone from Linux over USB or wireless
  debugging, no root required.
date: 2026-05-17T00:00:00.000Z
tags:
  - android
  - tools
locale: en
draft: false
author: abdallah-shehawey
---

`scrcpy` lets you display and control your Android phone from a Linux PC. It works over **USB** or **Wi-Fi**, has low latency, and does not require root.

This guide covers installing scrcpy, enabling Developer Options on the phone, and using it over both USB and Wi-Fi (wireless debugging).

## Installation

### Prebuilt packages (recommended)

```text
Debian / Ubuntu : apt install scrcpy        (obsolete version in repos)
Arch Linux      : pacman -S scrcpy
Fedora          : dnf copr enable zeno/scrcpy && dnf install scrcpy
Gentoo          : emerge scrcpy
Snap            : snap install scrcpy       (obsolete)
```

For up-to-date package availability across distros, see [repology.org/project/scrcpy](https://repology.org/project/scrcpy/versions).

### Building / dependencies (Debian / Ubuntu)

If you want to build scrcpy from source or ensure all required libraries are present:

```bash
sudo apt install ffmpeg libsdl2-2.0-0 adb wget \
                 gcc git pkg-config meson ninja-build libsdl2-dev \
                 libavcodec-dev libavdevice-dev libavformat-dev libavutil-dev \
                 libswresample-dev libusb-1.0-0 libusb-1.0-0-dev
```

## Phone setup (Android)

### 1. Enable Developer Options

1. Open **Settings** → **About phone**
2. Tap **Build number** 7 times
3. You will see: _"You are now a developer"_

### 2. Enable debugging

Go to **Settings → Developer options** and enable:

- **USB debugging**
- **Wireless debugging** (Android 11+ recommended)

## Method 1: USB connection (most stable)

1. Connect the phone to the PC via USB
2. Accept the debugging prompt on the phone
3. Run:

```bash
scrcpy
```

The phone screen appears instantly.

## Method 2: Wi-Fi connection (no cable)

Both phone and PC must be on the same Wi-Fi network.

### Option A — Legacy TCP/IP (may not work on some phones)

```bash
adb tcpip 5555
```

Find your phone's IP address (**Settings → Wi-Fi → Network details**), then connect:

```bash
adb connect <IP_ADDRESS>:5555
```

Verify the connection:

```bash
adb devices
```

Start scrcpy over Wi-Fi:

```bash
scrcpy -e
```

### Option B — Wireless Debugging (recommended, Android 11+)

This is the official and stable method.

On the phone: **Settings → Developer options → Wireless debugging → ON**, then pair the device with a pairing code. The phone will display an IP address, pairing port, and pairing code.

On the PC:

```bash
adb pair <IP_ADDRESS>:<PAIR_PORT>
```

Enter the pairing code when prompted, then connect using the shown connect port:

```bash
adb connect <IP_ADDRESS>:<CONNECT_PORT>
```

Verify and run:

```bash
adb devices
scrcpy -e
```

Fully wireless, stable, no USB cable needed.

## Verify device connection

At any time, check connected devices with:

```bash
adb devices
```

Expected output:

```text
<IP_ADDRESS>:<PORT>    device
```

## Useful scrcpy options

Front camera:

```bash
scrcpy --camera-facing=front
```

Limit bitrate (better Wi-Fi stability):

```bash
scrcpy -e --bit-rate=4M
```

Limit FPS:

```bash
scrcpy --max-fps=30
```

## Notes & tips

- USB is always the most stable option
- Wi-Fi depends on router quality and signal strength
- Wireless Debugging is preferred over `adb tcpip 5555`
- No root access is required

scrcpy works on all major Linux distros, supports both USB and Wi-Fi, and Wireless Debugging is the modern, stable way to run it.

---
title: Installing and Using yt-dlp
description: >-
  Install yt-dlp on Ubuntu, Fedora, and Windows, and the handful of commands
  you'll actually use.
date: 2026-06-07T00:00:00.000Z
tags:
  - tools
  - cli
locale: en
draft: false
author: abdallah-shehawey
---

**yt-dlp** is an advanced command-line tool for downloading videos and audio from YouTube and hundreds of other sites — a feature-rich fork of `youtube-dl` with frequent updates and better performance. This guide covers installing it on Ubuntu/Debian, Fedora, and Windows.

## Install on Ubuntu / Debian

### Method 1: apt (official repo)

The easiest method for most users.

```bash
sudo apt update
sudo apt install yt-dlp -y
```

### Method 2: pip (latest version)

Requires Python 3. Best for getting the absolute latest features.

```bash
python3 -m pip install -U yt-dlp
```

### Method 3: standalone binary (recommended)

Downloads the binary directly — good if you don't want dependencies.

```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
```

Verify installation:

```bash
yt-dlp --version
```

## Install on Fedora

### Method 1: dnf

```bash
sudo dnf install yt-dlp -y
```

### Method 2: standalone binary (latest version)

```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
```

Verify installation:

```bash
yt-dlp --version
```

## Install on Windows

### Method 1: standalone EXE (easiest way)

1. Download the latest `yt-dlp.exe` from the [official releases page](https://github.com/yt-dlp/yt-dlp/releases/latest).
2. Move `yt-dlp.exe` to a permanent folder, e.g. `C:\yt-dlp\`.
3. Add it to PATH: search **"Edit the system environment variables"** in Windows Search → **Environment Variables** → select **Path** → **Edit** → **New** → paste the folder path.
4. Test in CMD or PowerShell:

```bash
yt-dlp --version
```

### Method 2: Chocolatey (optional)

```bash
choco install yt-dlp -y
```

## Quick usage examples

Download best quality video:

```bash
yt-dlp "https://www.youtube.com/watch?v=VIDEO_ID"
```

Download audio only (convert to MP3):

```bash
yt-dlp -x --audio-format mp3 "https://www.youtube.com/watch?v=VIDEO_ID"
```

Download a full playlist:

```bash
yt-dlp -f best "PLAYLIST_URL"
```

## Update yt-dlp

If you installed via the standalone binary or pip, update easily:

```bash
yt-dlp -U
```

## Notes

- Stay updated — always use the latest version for better site support
- Some sites may block excessive downloads; use responsibly
- Respect copyrights and platform policies

Official repository: [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

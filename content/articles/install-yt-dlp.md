---
title: Installing and Using yt-dlp
description: >-
  yt-dlp هي أداة سطر أوامر ممتازة لتنزيل الفيديوهات والصوتيات من يوتيوب، زوم، تيمز، وجوجل درايف وغيرها بكفاءة عالية.
date: 2026-06-07T00:00:00.000Z
tags:
  - tools
  - cli
  - linux
locale: ar
draft: false
author: abdallah-shehawey
---

لا يا قوم 🤍

بما إننا اتفقنا قبل كده إن أي حاجة إحنا شايفينها **"بديهيات"** ومفكرين إن كل الناس عارفينها، لازم نحط في دماغنا دايمًا إن أكيد فيه على الأقل شخص واحد مش عارفها... وأول مرة يعرفها هيعرفها منك 😅

لو لسه ما اتعاملتش معاها، ففيه أداة ممتازة اسمها **`yt-dlp`**!

دي عبارة عن **Command Line Tool** (أداة سطر أوامر)، كل اللي عليك إنك تديها اللينك وهي تتكفل بالباقي:
- تنزيل فيديو بأعلى جودة 🎥
- تنزيل قوائم تشغيل (Playlist) كاملة 🎶
- تنزيل الصوت فقط وتحويله لـ MP3 🎧

🔥 **الميزة الأهم:** أنها بتنزل أي ميديا من أي موقع تقريباً طالما اللينك عام (Public)، زي مثلاً:
- اجتماعات مسجلة من **Zoom**
- اجتماعات مسجلة من **Microsoft Teams**
- فيديوهات مرفوعة على **Google Drive**
- وبشكل عام... أي فيديو أو صوت يخطر على بالك طالما اللينك Public! 😅

---

## Overview / نبذة عن الأداة

`yt-dlp` is an advanced command-line tool for downloading videos and audio from YouTube and hundreds of other sites — a feature-rich fork of `youtube-dl` with frequent updates and better performance. This guide covers installing it on Ubuntu/Debian, Fedora, and Windows.

---

## Install on Ubuntu / Debian

### Method 1: apt (official repo)

```bash
sudo apt update
sudo apt install yt-dlp -y
```

### Method 2: pip (latest version)

```bash
python3 -m pip install -U yt-dlp
```

### Method 3: standalone binary (recommended)

```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
```

Verify installation:

```bash
yt-dlp --version
```

---

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

---

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

---

## Quick usage examples / أمثلة استخدام سريعة

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

---

## Update yt-dlp / التحديث

If you installed via the standalone binary or pip, update easily:

```bash
yt-dlp -U
```

---

> **Notes:**
> - Stay updated — always use the latest version for better site support
> - Some sites may block excessive downloads; use responsibly
> - Respect copyrights and platform policies

🔗 **Official Repository**: 👉 [https://github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

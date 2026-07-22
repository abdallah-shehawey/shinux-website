---
title: Downloading Media with Yt-dlp
description: >-
  yt-dlp هي أداة سطر أوامر ممتازة لتنزيل الفيديوهات والصوتيات من يوتيوب، زوم، تيمز، وجوجل درايف وغيرها بكفاءة عالية.
order: 7
tags:
  - linux
  - cli
  - tools
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

`yt-dlp` is a feature-rich, actively-maintained command-line utility for downloading video and audio from YouTube, Zoom, Teams, Google Drive, and hundreds of other platforms. It is an improved fork of `youtube-dl` with faster updates and better performance.

---

## Install on Ubuntu / Debian

### Method 1: apt (simplest)

```bash
sudo apt update
sudo apt install yt-dlp -y
```

### Method 2: pip (latest features)

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

```bash
sudo dnf install yt-dlp -y
```

---

## Install on Windows

1. Download `yt-dlp.exe` from the [Official Releases Page](https://github.com/yt-dlp/yt-dlp/releases/latest).
2. Save it to a directory like `C:\yt-dlp\`.
3. Add the folder path to your System Environment Variables (`PATH`).

Or using Chocolatey:

```bash
choco install yt-dlp -y
```

---

## Quick Usage Examples / أمثلة استخدام سريعة

```bash
# Download best quality video
yt-dlp "https://www.youtube.com/watch?v=VIDEO_ID"

# Download audio only (convert to MP3)
yt-dlp -x --audio-format mp3 "https://www.youtube.com/watch?v=VIDEO_ID"

# Download a full playlist
yt-dlp -f best "PLAYLIST_URL"
```

---

## Update yt-dlp / التحديث

If installed via standalone binary or pip:

```bash
yt-dlp -U
```

---

> **Notes:**
> - Stay updated — site support changes constantly as platforms tweak their players.
> - Some sites throttle or block excessive automated downloads; use it responsibly.
> - Respect copyright and each platform's terms of service.

🔗 **Official Repository**: 👉 [https://github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

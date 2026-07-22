---
title: Automating Meeting Downloads and Cloud Uploads
description: >-
  A script utilizing yt-dlp with cookies and rclone to download recorded Zoom/Teams meetings automatically and sync them to cloud storage (Google Drive / Mega).
order: 6
tags:
  - bash
  - scripts
  - yt-dlp
  - rclone
draft: false
author: abdallah-shehawey
---

`auto_download_upload.sh` automates downloading recorded meetings (Zoom, Microsoft Teams, SharePoint) using `yt-dlp` and uploading them to cloud storage via `rclone`, followed by local cleanup.

## Script Source (`auto_download_upload.sh`)

```bash
#!/bin/bash

DOWNLOAD_DIR="$HOME/videos_downloaded"
COOKIE_FILE="$HOME/cookies.txt"
DRIVE_FOLDER="gdrive:15Py9VYjQivP8TzeFCDqkDi9G75pQZXF9"

mkdir -p "$DOWNLOAD_DIR"

links=(
  "https://eitesal-my.sharepoint.com/personal/.../Meeting_Recording.mp4"
)

echo "🚀 Start..."

for link in "${links[@]}"; do
    echo "⬇️ Downloading..."

    yt-dlp \
        --cookies "$COOKIE_FILE" \
        --continue \
        --no-part \
        --concurrent-fragments 5 \
        --retries 10 \
        --fragment-retries 10 \
        --file-access-retries 10 \
        --output "$DOWNLOAD_DIR/%(title)s.%(ext)s" \
        "$link"

    # Get latest downloaded file
    FILE=$(ls -t "$DOWNLOAD_DIR" | head -n 1)

    echo "☁️ Uploading $FILE ..."
    rclone copy "$DOWNLOAD_DIR/$FILE" "$DRIVE_FOLDER" -P

    echo "🧹 Deleting local copy..."
    rm "$DOWNLOAD_DIR/$FILE"
done

echo "✅ All Done"
```

## How It Works

1. **Authentication**: Uses browser cookies (`--cookies cookies.txt`) to access protected meeting recordings (SharePoint/Teams/Zoom).
2. **Parallel Fragments**: Uses `--concurrent-fragments 5` for maximum download speed.
3. **Cloud Sync**: Invokes `rclone copy` to push completed files to Google Drive or remote cloud storage with progress indicators (`-P`).
4. **Auto-Cleanup**: Deletes local copies once verified.

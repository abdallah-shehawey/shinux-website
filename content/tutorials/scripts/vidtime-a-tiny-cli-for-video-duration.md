---
title: 'vidtime: A Tiny CLI for Video Duration'
description: >-
  A Bash script using ffprobe and awk to print the exact duration of media files and calculate total duration for playlists or folders.
order: 4
tags:
  - bash
  - scripts
  - ffmpeg
  - media
draft: false
author: abdallah-shehawey
---

`vidtime` is a tiny CLI utility that reads media files (MP4, MKV, MP3, etc.), prints the formatted `HH:MM:SS` duration for each file using `ffprobe`, and calculates the grand total duration.

## Script Source (`vidtime`)

```bash
#!/usr/bin/env bash
set -o pipefail

RED="\e[38;5;196m"
RESET="\e[0m"

total=0

if [ "$#" -eq 0 ]; then
  echo -e "${RED}Usage: vidtime <file|pattern> [more files...]${RESET}" >&2
  exit 1
fi

for file in "$@"; do
  if [ ! -e "$file" ]; then
    echo -e "${RED}Error: '$file' does not exist${RESET}" >&2
    continue
  fi

  if [ ! -f "$file" ]; then
    echo -e "${RED}Error: '$file' is not a regular file${RESET}" >&2
    continue
  fi

  duration=$(ffprobe -v quiet -show_entries format=duration -of csv="p=0" "$file")
  if [ $? -ne 0 ] || [ -z "$duration" ]; then
    echo -e "${RED}Error: '$file' is not a valid media file${RESET}" >&2
    continue
  fi

  printf "%s: " "$file"
  echo "$duration" | awk '{printf "%02d:%02d:%02d\n",$1/3600,($1%3600)/60,$1%60}'

  secs=$(printf "%.0f" "$duration")
  total=$((total + secs))
done

if [ $total -ne 0 ]; then
  printf "\nTotal: %02d:%02d:%02d\n" $((total/3600)) $(((total%3600)/60)) $((total%60))
  exit 0
else
  exit 1
fi
```

## Usage Examples

```bash
# Check a single file
vidtime lesson-01.mp4

# Check all video files in the current folder
vidtime *.mkv

# Output:
# lesson-01.mkv: 00:15:30
# lesson-02.mkv: 00:22:10
#
# Total: 00:37:40
```

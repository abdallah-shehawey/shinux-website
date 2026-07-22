---
title: Smart File Renaming with padnum & rename.sh
description: >-
  Advanced numeric prefix formatting with auto-padding detection, dry-run mode, colorized history, multi-level undo support, and regex batch renaming.
order: 5
tags:
  - bash
  - scripts
  - cli
  - tools
draft: false
author: abdallah-shehawey
---

This lesson covers two smart file renaming scripts: `padnum` (a multi-feature numeric formatter with undo history) and `rename.sh` (a lightweight pattern renaming helper).

## 1. `padnum` (Smart Numeric Formatter with Multi-Level Undo)

`padnum` detects numeric prefixes at the beginning of filenames, applies zero-padding (e.g. `1` → `001`), and preserves the rest of the filename exactly as-is (Arabic, spaces, underscores, dots, etc).

### Features
- **Auto-Padding Detection**: Automatically calculates required digit padding width (e.g., 3 digits if max number is 100+).
- **Dry-Run Mode (`-n`)**: Inspect expected changes without modifying files.
- **Multi-Level Undo (`--undo [N]`)**: Revert up to 10 previous batch renaming operations safely.
- **Colorized History (`--history`)**: View historical renaming logs with ANSI color formatting.

### Script Source (`padnum`)

```bash
#!/bin/bash

shopt -s nullglob

PADNUM_VERSION="1.0.0"
MAX_UNDO=10
UNDO_FILE=".padnum.undo"

padding=""
dry_run=false
ext_filter=""
separator=" "
undo_level=0
show_history=false

to_decimal() {
    local n
    n="$(echo "$1" | sed 's/^0*//')"
    [[ -z "$n" ]] && n=0
    echo "$n"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--padding) padding="$2"; shift 2 ;;
        -n|--dry-run) dry_run=true; shift ;;
        --ext) ext_filter="$2"; shift 2 ;;
        --sep) separator="$2"; shift 2 ;;
        --undo)
            undo_level=1
            [[ "$2" =~ ^[0-9]+$ ]] && undo_level="$2" && shift
            shift
            ;;
        --history) show_history=true; shift ;;
        -h|--help) echo "Usage: padnum [-n] [-p padding] [--ext ext] [--sep sep] [--undo [N]] [--history]"; exit 0 ;;
        *) shift ;;
    esac
done

# Execute rename loop
for file in *; do
    [[ -d "$file" ]] && continue
    [[ -n "$ext_filter" && "${file,,}" != *.${ext_filter,,} ]] && continue
    [[ "$file" =~ ^([0-9]+)(.*)$ ]] || continue

    raw="${BASH_REMATCH[1]}"
    rest="${BASH_REMATCH[2]}"
    rest="$(echo "$rest" | sed -E 's/^[[:space:]_.-]+//')"

    dec="$(to_decimal "$raw")"
    printf -v new_num "%0*d" "$padding" "$dec"

    new_name="${new_num}${separator}${rest}"
    [[ "$file" == "$new_name" ]] && continue

    if $dry_run; then
        echo mv "$file" ">>>" "$new_name"
    else
        echo -e "$file\t$new_name" >> "$UNDO_FILE"
        mv -n -- "$file" "$new_name"
    fi
done
```

---

## 2. `rename.sh` (Batch Hash-Prefix Renamer)

A lightweight helper script to reformat filenames carrying `#number` pattern prefixes:

```bash
#!/bin/bash
for file in *"#"*; do
  num=$(echo "$file" | grep -oE '#[0-9]+')
  rest=$(echo "$file" | sed -E "s/ *$num *//")
  newname="$num $rest"
  mv -- "$file" "$newname"
done
```

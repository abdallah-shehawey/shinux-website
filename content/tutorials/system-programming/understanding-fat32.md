---
title: Understanding Fat32
description: >-
  FAT — the File Allocation Table — is one of the oldest file systems still in
  everyday use. It shipped as the default for MS-DOS and the Windows 9x family,
  dating back to 1977, originally designed for…
order: 2
tags:
  - systems
draft: false
author: abdallah-shehawey
---
FAT — the File Allocation Table — is one of the oldest file systems still in everyday use. It shipped as the default for MS-DOS and the Windows 9x family, dating back to 1977, originally designed for floppy disks and later stretched to hard disks as capacities grew. NTFS replaced it as Windows' default starting with Windows XP, but FAT32 (and its successor exFAT) is still the default choice for USB flash drives, SD cards, and embedded/eMMC storage — precisely because almost every OS and embedded system on Earth can read and write it with minimal effort.

## The Four Regions of a Fat Volume

| Region | Size | Contents |
| --- | --- | --- |
| Reserved Sectors | fixed count | Boot Sector (VBR) + BIOS Parameter Block; FAT32 adds an FS Information Sector and a Backup Boot Sector |
| FAT Region | (number of FATs) × (sectors per FAT) | One or more copies of the File Allocation Table |
| Root Directory Region | FAT12/FAT16 only | Fixed-size root directory table |
| Data Region | everything else | Actual file and directory data |

The traditional sector size is 512 bytes, though most modern drives physically use 4096-byte sectors (Advanced Format). The key architectural change in FAT32 versus FAT12/FAT16 is that the **root directory moved into the Data Region**, stored like any other folder — which is why FAT32 doesn't impose a fixed maximum size on the root directory the way FAT12/16 do. Because the Directory Entry uses a 32-bit field for file size, a single file on FAT32 is capped at **4 GB**, full stop — no way around it without leaving FAT32 entirely (which is exactly why exFAT exists).

## The Directory Entry

Every file and folder has a 32-byte Directory Entry — its metadata card. The fields that matter most:

- **Filename/Extension (11 bytes)** — 8 characters for the name, 3 for the extension (the classic "8.3" format).
- **Attributes (1 byte)** — read-only, hidden, system, etc.
- **Timestamps** — creation and modification times.
- **File Size (4 bytes)** — the field responsible for the 4 GB ceiling.
- **First Cluster # (4 bytes)** — the address of the file's *first* cluster on disk. Everything else about where the file's data lives is derived from here via the FAT itself.

## The File Allocation Table

The FAT is the filesystem's master index: one entry per cluster, where the entry's position *is* the cluster number. Each entry holds one of three things:

- `Free` — the cluster is unused.
- `EOC` (End of Chain) — this is the last cluster of the file.
- Another cluster number — "after this cluster, continue reading at cluster N."

## How a File Gets Read, End to End

1. The OS reads the Directory Entry to learn the file's first cluster (say, cluster `4`) and its total size.
2. It looks up entry `4` in the FAT and finds `6` — "the next part is at cluster 6."
3. It reads cluster 4's data, then follows the chain: `4 → 6 → 8 → 3 → 5 → 10 → 11`.
4. At entry `11` it finds `EOC` — the file is complete, and reading stops.

The Directory Entry gives the starting point of the chain; the FAT lets the OS walk that chain, one link at a time, until it hits the end marker. It's a simple design — no B-trees, no extents — which is exactly why it's trivial to implement correctly on a microcontroller with a few KB of RAM, and why it remains the lingua franca for removable storage.

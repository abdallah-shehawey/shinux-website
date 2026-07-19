---
title: 'Magic Numbers in Linux: A Deep Systems Guide'
description: >-
  How Linux really identifies file types by content instead of extension — from
  libmagic internals to ELF headers.
date: 2026-06-14T00:00:00.000Z
tags:
  - systems
  - filesystems
  - security
locale: en
draft: false
author: abdallah-shehawey
---

A low-level, systems-oriented guide to understanding how Linux determines file types using **magic numbers** — going beyond basic definitions into kernel vs. user-space behavior, libmagic internals, binary layouts, and security implications.

## What magic numbers really are

Magic numbers are **constant byte sequences embedded into binary data structures** to provide early identification hints for file formats, executables, disk layouts, and network protocols. They act as a weak contract between producers and consumers of binary data.

Key properties:

- Positioned at well-known offsets
- Endian-aware when numeric
- Designed for fast rejection of invalid data

## Why file extensions fail

| Problem        | Explanation             |
| --------------- | ------------------------ |
| User-controlled | Filenames are arbitrary |
| Ambiguous       | `.dat`, `.bin` mean nothing |
| Spoofable       | `evil.exe → photo.jpg`  |

Linux always trusts content over name.

## Magic numbers vs MIME types

| Aspect  | Magic Numbers   | MIME              |
| -------- | --------------- | ------------------ |
| Source  | Binary content  | Mapping rules      |
| Trust   | High            | Medium              |
| Used by | Kernel / tools  | Desktop / browsers |

`file --mime-type` bridges both worlds.

## Kernel vs. user-space detection

**Kernel:**

- Does not rely on file magic
- Executes ELF only if loaders exist
- Uses shebang (`#!`) interception

**User space:**

- `file`, desktops, scanners
- Powered by libmagic

## libmagic architecture

Execution pipeline:

```text
open() → read() → pattern engine
     → indirect offsets
     → strength scoring
     → description synthesis
```

Capabilities: conditional rules, nested patterns, offset arithmetic.

## File header layouts

Example (PNG):

```text
Offset  Size  Meaning
0x00    8     Signature
0x08    4     IHDR length
```

Magic numbers rarely act alone — they validate structure presence, not full correctness.

## Common magic numbers (extended)

| Format | Hex                     | Offset |
| ------- | ----------------------- | ------ |
| ELF    | 7F 45 4C 46             | 0x00   |
| PDF    | 25 50 44 46             | 0x00   |
| PE     | 4D 5A                   | 0x00   |
| Mach-O | FE ED FA CE             | 0x00   |
| GPT    | 45 46 49 20 50 41 52 54 | 0x200  |

Notice: not all magic appears at offset 0.

## ELF internals

Beyond the magic bytes: `e_ident[EI_CLASS]`, `e_ident[EI_DATA]`, program headers.

```bash
readelf -h file
```

## Executable detection & shebang

`#!` works via kernel loader redirection:

```text
#! /usr/bin/python3
```

Kernel steps: reads the first 2 bytes, parses the interpreter path, re-execs.

## Disk structures as magic numbers

**MBR:** offset 510 → `0x55AA`.

**GPT:** primary header at LBA 1, magic = `EFI PART`.

Disk formats are file formats.

## Byte-level inspection

```bash
xxd -l 64 file
hexdump -C file
od -An -tx1 file
```

## Writing file detectors

Python:

```python
magic = f.read(4)
```

C:

```c
memcmp(buf, "\x7FELF", 4)
```

Avoid trusting magic alone.

## Advanced magic files

Features: indirect offsets, numeric comparisons, strength modifiers.

```text
0  string  ELF
>4 byte =2 64-bit ELF
```

## Security implications

Threats: polyglot files, content spoofing, malformed headers.

Mitigations: full structure validation, size & bounds checking, sandboxing.

## Reverse engineering

Magic numbers help identify packed binaries, firmware, and unknown dumps — paired with `binwalk`, `strings`, `radare2`.

## Cross-platform notes

| OS      | Format |
| ------- | ------ |
| Linux   | ELF    |
| Windows | PE     |
| macOS   | Mach-O |

Multi-format binaries exist.

## Performance considerations

Early short-circuit, read minimal bytes, cache detection results — used heavily by antivirus engines.

## Practical labs

Beginner → dump headers. Intermediate → parse MBR. Advanced → implement a detector. Expert → fuzz malformed headers.

## Further reading

`man magic`, libmagic source, the OSDev Wiki, the ELF specification.

This guide is aimed at Linux system programmers, reverse engineers, security researchers, and low-level developers. Understanding magic numbers means understanding how systems recognize reality from raw bytes.

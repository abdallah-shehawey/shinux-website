---
title: Magic Numbers in Linux Deep Systems Guide
description: >-
  A low-level, systems-oriented, production-grade guide to understanding how
  Linux determines file types using magic numbers. This document goes far beyond
  basic definitions and explains kernel vs…
order: 6
tags:
  - linux
draft: false
author: abdallah-shehawey
---
A **low-level, systems-oriented, production-grade guide** to understanding how Linux determines file types using **magic numbers**.
This document goes far beyond basic definitions and explains **kernel vs user-space behavior, libmagic internals, binary layouts, security implications, and real system programming workflows**.

---

## Table of Contents

1. What Magic Numbers Really Are

2. Why File Extensions Are Unreliable

3. Magic Numbers vs MIME Types

4. Kernel vs User Space File Identification

5. libmagic Architecture (How `file` Really Works)

6. File Header Layouts & Binary Structure

7. Common Magic Numbers (Extended Reference)

8. ELF Internals & Program Headers

9. Executable Formats & Interpreters (Shebang)

10. Disk Structures as Magic Numbers (MBR & GPT)

11. Inspecting Files at Byte Level

12. Writing Reliable File Detectors

13. Custom Magic Files (Advanced Patterns)

14. Security Implications & Content Sniffing

15. Reverse Engineering with Magic Numbers

16. Cross-Platform Considerations

17. Performance & Scaling Considerations

18. Practical Labs (Beginner → Advanced)

19. Further Reading & Research Directions


---

## What Magic Numbers _really_ Are

Magic numbers are **constant byte sequences embedded into binary data structures** to provide **early identification hints** for:

- File formats

- Executables

- Disk layouts

- Network protocols


They act as a _weak contract_ between producers and consumers of binary data.

Key properties:

- Positioned at **well-known offsets**

- **Endian-aware** when numeric

- Designed for **fast rejection** of invalid data


---

## Why File Extensions Fail

|Problem|Explanation|
|---|---|
|User-controlled|Filenames are arbitrary|
|Ambiguous|`.dat`, `.bin` mean nothing|
|Spoofable|`evil.exe → photo.jpg`|

Linux always trusts **content over name**.

---

## Magic Numbers vs Mime Types

|Aspect|Magic Numbers|MIME|
|---|---|---|
|Source|Binary content|Mapping rules|
|Trust|High|Medium|
|Used by|Kernel / tools|Desktop / browsers|

`file --mime-type` bridges both worlds.

---

## Kernel vs User Space Detection

### Kernel

- Does **not** rely on file magic

- Executes ELF only if loaders exist

- Uses **shebang (`#!`)** interception


### User Space

- `file`, desktops, scanners

- Powered by **libmagic**


---

## Libmagic Architecture

Execution pipeline:

```text
open() → read() → pattern engine
     → indirect offsets
     → strength scoring
     → description synthesis
```

Capabilities:

- Conditional rules

- Nested patterns

- Offset arithmetic


---

## File Header Layouts

Example (PNG):

```text
Offset  Size  Meaning
0x00    8     Signature
0x08    4     IHDR length
```

Magic numbers rarely act alone — they validate **structure presence**, not full correctness.

---

## Common Magic Numbers (extended)

|Format|Hex|Offset|
|---|---|---|
|ELF|7F 45 4C 46|0x00|
|PDF|25 50 44 46|0x00|
|PE|4D 5A|0x00|
|Mach-O|FE ED FA CE|0x00|
|GPT|45 46 49 20 50 41 52 54|0x200|

Notice: not all magic appears at offset 0.

---

## Elf Internals

Beyond magic:

- e_ident[EI_CLASS]

- e_ident[EI_DATA]

- Program headers


Use:

```text
readelf -h file
```

---

## Executable Detection & Shebang

`#!` works by kernel loader redirection:

```python
#! /usr/bin/python3
```

Kernel steps:

1. Reads first 2 bytes

2. Parses interpreter path

3. Re-execs


---

## Disk Structures as Magic Numbers

### Mbr

- Offset 510 → `0x55AA`


### Gpt

- Primary header at LBA 1

- Magic = `EFI PART`


Disk formats **are file formats**.

---

## Byte-level Inspection

Essential tools:

```text
xxd -l 64 file
hexdump -C file
od -An -tx1 file
```

---

## Writing File Detectors

Python example:

```ini
magic = f.read(4)
```

C example:

```text
memcmp(buf, "\x7FELF", 4)
```

Avoid trusting magic alone.

---

## Advanced Magic Files

Features:

- Indirect offsets

- Numeric comparisons

- Strength modifiers


Example:

```ini
0  string  ELF
>4 byte =2 64-bit ELF
```

---

## Security Implications

Threats:

- Polyglot files

- Content spoofing

- Malformed headers


Mitigations:

- Full structure validation

- Size & bounds checking

- Sandboxing


---

## Reverse Engineering

Magic numbers help identify:

- Packed binaries

- Firmware

- Unknown dumps


Paired with:

- `binwalk`

- `strings`

- `radare2`


---

## Cross-platform Notes

|OS|Format|
|---|---|
|Linux|ELF|
|Windows|PE|
|macOS|Mach-O|

Multi-format binaries exist.

---

## Performance Considerations

- Early short-circuit

- Read minimal bytes

- Cache detection results


Used heavily by antivirus engines.

---

## Practical Labs

Beginner → dump headers
Intermediate → parse MBR
Advanced → implement detector
Expert → fuzz malformed headers

---

## Further Reading

- `man magic`

- libmagic source

- OSDev Wiki

- ELF Specification


---

✅ This document is written for **Linux system programmers, reverse engineers, security researchers, and low-level developers**.

Understanding magic numbers means understanding how **systems recognize reality from raw bytes**.

Happy hacking 🐧

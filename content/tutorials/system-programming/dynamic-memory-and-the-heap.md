---
title: Dynamic Memory & the Heap
description: >-
  malloc() and free() look like they manage memory directly, but they actually
  sit on top of a much simpler primitive — sbrk(), which just moves a single
  pointer called the program break. This walks…
order: 10
tags:
  - systems
draft: false
author: abdallah-shehawey
---
`malloc()` and `free()` look like they manage memory directly, but they actually sit on top of a much simpler primitive — `sbrk()`, which just moves a single pointer called the **program break**. This walks through a small program (adapted from Kerrisk's *The Linux Programming Interface*, Listing 7-1) built specifically to make that boundary, and a common misconception about `free()`, visible.

## `sbrk()` and the Program Break

The program break is the current end of a process's data segment — everything below it is memory the process owns; `sbrk(0)` (a delta of zero) just reports where that boundary currently sits without moving it:

```ini
extern char end, edata, etext;

printf("etext = %p, edata=%p, end=%p, initial program break=%p\n",
       &etext, &edata, &end, (char*)sbrk(0));
```

`etext`, `edata`, and `end` are linker-provided symbols marking the end of the program's code, initialized data, and uninitialized data (BSS) respectively — `end` is where the original, pre-allocation program break starts out. The intended experiment: call `sbrk(0)` again after allocating a batch of blocks and see the break move upward, then again after freeing some of them:

```ini
printf("Initial program break:          %10p\n", sbrk(0));

for (j = 0; j < numAllocs; j++) {
  ptr[j] = malloc(blockSize);
  if (ptr[j] == NULL) { printf("malloc returned null\n"); exit(1); }
}
printf("Program break is now:           %10p\n", sbrk(0));

for (j = freeMin - 1; j < freeMax; j += freeStep) free(ptr[j]);
printf("After free(), program break is: %10p\n", sbrk(0));
```

## The Point: `free()` Usually Doesn't Shrink the Heap Back

Run this with real `malloc`/`free`, freeing every block that was just allocated, and the program break **after `free()` is typically unchanged** from right after the allocation loop — not back down near where it started. glibc's allocator keeps freed chunks on its own internal free lists for future reuse rather than immediately handing pages back to the kernel via `sbrk()`/`brk()`; it only releases memory to the OS in narrower circumstances (very large allocations that used `mmap()` instead of the regular heap, or a large enough contiguous free run at the very top of the heap). That's the core misconception this demo is built to correct: **freeing memory in a process almost never means the OS immediately gets that memory back** — it means the *allocator* now considers it free for the next `malloc()` call in the same process.

## Checking a Running Process's Actual Memory Map

Beyond the program's own `sbrk(0)` probes, the kernel's own view of a process's address space is directly readable:

```bash
cat /proc/$(pidof a.out)/maps
```

This lists every mapped region — the heap, each loaded shared library, the stack, and (for a statically-linked build) the binary's own code and data — which is the ground truth for what `sbrk()`'s movements actually correspond to in the process's real address space.

## Aslr Gets in the Way of Predicting Addresses

Address Space Layout Randomization means the *absolute* addresses printed by this demo will differ on every run — the base addresses for the heap, stack, and shared libraries are deliberately randomized as a security measure against exploits that hardcode addresses. For a controlled comparison across runs, it can be turned off temporarily:

```text
echo 0 > /proc/sys/kernel/randomize_va_space   # disable
echo 2 > /proc/sys/kernel/randomize_va_space   # restore
```

## A Note on This Specific Copy of the File

As checked into this repo, the `malloc`/`free`/`calloc`/`realloc` in this file are overridden as stubs (`malloc` unconditionally returns `NULL`, `free` is a no-op) — scaffolding, evidently, for dropping in a hand-written allocator later. Run exactly as-is, the program fails immediately at the first allocation, since `malloc()` never actually succeeds. To run the `sbrk()` experiment described above, those overrides need to be removed so the calls fall through to glibc's real allocator — at which point the break-movement behavior described in section 2 is exactly what shows up.

Building a static binary makes the memory map easier to read, since there's no dynamic linker or shared-library mappings mixed in:

```ini
gcc -Wl,-Map=output.map free_and_sbrk.c --static
```

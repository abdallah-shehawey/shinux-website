---
title: A Tour of FreeRTOS Concepts
description: >-
  Two ideas trip up almost everyone new to RTOS programming: what a "context
  switch" actually moves in memory, and when to reach for a mutex versus a
  semaphore. Both are concrete enough to walk through…
order: 13
tags:
  - systems
draft: false
author: abdallah-shehawey
---
Two ideas trip up almost everyone new to RTOS programming: what a "context switch" actually moves in memory, and when to reach for a mutex versus a semaphore. Both are concrete enough to walk through directly rather than just define.

## 1. What a context switch actually saves and restores

On an ARM Cortex-M (FreeRTOS's most common target), an interrupt or a `PendSV` exception — the mechanism FreeRTOS itself uses to trigger a context switch — splits register saving into two halves:

- **Hardware auto-stacking**: the CPU itself pushes `xPSR`, `PC`, `LR`, `R12`, `R3`, `R2`, `R1`, and `R0` onto the *current* stack the instant an exception is taken — no software involvement at all.
- **Software manual-stacking**: FreeRTOS's port-layer exception handler (`xPortPendSVHandler` on Cortex-M) pushes the remaining registers, `R4`–`R11`, by hand.

Together those two halves cover the entire CPU register file. The handler then does the actual switch:

1. Save the now-fully-stacked pointer (`SP`/`R13`) into the outgoing task's own Task Control Block.
2. Ask the scheduler which task runs next.
3. Load *that* task's saved `SP` from its own TCB — a completely different stack, e.g. Task A's stack based at `0x20001000` versus Task B's at `0x20002000`.
4. Manually pop `R4`–`R11` for the incoming task.
5. Return from the exception — which makes the hardware automatically pop `xPSR`/`PC`/`LR`/`R12`/`R3`–`R0` for the incoming task.

The task that resumes has no idea it was ever paused: its registers, its stack, and its program counter are exactly what they were the instant it was last interrupted — just with a completely different stack pointer underneath it than the task that was running a moment ago. This is the whole trick behind preemptive multitasking on a single core: there's no real parallelism, just very fast, very disciplined swapping of which stack the same physical registers are currently pointing into.

## 2. Mutex vs. binary semaphore vs. counting semaphore

These three FreeRTOS primitives look similar (all are "take"/"give" objects with a count), but they solve genuinely different problems, and picking the wrong one is a classic source of subtle bugs.

### Mutex — protecting a shared resource

- **Strict ownership**: only the task that took the mutex is allowed to give it back. FreeRTOS enforces this — another task calling `xSemaphoreGive()` on a mutex it doesn't hold fails.
- **Priority inheritance**: if a low-priority task is holding the mutex and a high-priority task blocks waiting for it, FreeRTOS temporarily boosts the holder's priority so it can finish and release the mutex sooner — this specifically prevents **priority inversion**, where a high-priority task is stuck behind a low-priority one indefinitely while an unrelated medium-priority task keeps preempting the holder.
- **Use it for**: protecting a shared peripheral (I2C/SPI/UART bus), thread-safe access to a global variable, or any read-modify-write critical section.

### Binary semaphore — signaling, not locking

- **No ownership** — unlike a mutex, whoever gives it doesn't need to be whoever takes it. The textbook case is an ISR giving the semaphore (`xSemaphoreGiveFromISR()`) and a task taking it (`xSemaphoreTake()`), which is exactly how **deferred interrupt processing** works: the ISR does the absolute minimum (signal the semaphore) and returns immediately, while a normal task — outside interrupt context, allowed to do real work — wakes up and handles the actual event.
- **Max count of 1**, which means it's "latching" rather than counting: giving an already-full binary semaphore a second time before it's taken has no additional effect — the event isn't queued, only "an event happened" is recorded.
- **Use it for**: task-to-task or ISR-to-task synchronization where only "did this happen" matters, not "how many times."

### Counting semaphore — managing a pool

- **Take** decrements the count and blocks if it's already `0`; **give** increments it and fails (or blocks, depending on how it's used) if it's already at its max.
- Unlike a binary semaphore, a counting semaphore actually **counts** — giving it multiple times before anything takes it accumulates, up to its configured maximum.
- **Use it for**: managing a fixed-size resource pool (a set of DMA channels, a set of network buffers) where multiple tasks need to check a resource out and back in, or for counting bursty events (button presses) that should each be processed once, even if several arrive before a task gets around to handling the first one.

The distinction that matters most in practice: a mutex is about **who currently owns a resource** (and protecting against priority inversion while they do); a semaphore — binary or counting — is about **signaling that something happened**, with no concept of ownership at all. Reaching for a mutex to signal an event (or a semaphore to guard a resource) will often *appear* to work in testing and then fail under real contention, which is exactly why the distinction is worth internalizing rather than treating both as interchangeable "lock-ish" primitives.

---
title: Process Creation with fork()
description: >-
  fork() is the one system call responsible for every process on a Linux system
  except PID 1 — it duplicates the calling process into two, and everything
  downstream (shells launching commands, servers…
order: 7
tags:
  - systems
draft: false
author: abdallah-shehawey
---
`fork()` is the one system call responsible for every process on a Linux system except PID 1 — it duplicates the calling process into two, and everything downstream (shells launching commands, servers handling connections) is built on it. These four small programs work through what actually happens across that duplication: the two different return values, what's shared versus copied, and what goes wrong if a child is never cleaned up.

## 1. One call, two returns

`fork()` is unusual among system calls in that it returns *twice* — once in the parent, once in the child — with a different value in each:

```c
#include <stdio.h>
#include <unistd.h>

int main(void)
{
  getchar();   // pause here so both processes can be inspected with `ps` first

  pid_t pid = fork();

  if (pid > 0)
  {
    printf("PARENT: my pid = %d, My child pid = %d\n", getpid(), pid);
  }
  else if (pid == 0)
  {
    printf("CHILD: my pid = %d, My Parent pid = %d\n", getpid(), getppid());
  }
  else
  {
    printf("PARENT: failed to fork\n");
  }

  getchar();
  return 0;
}
```

- In the **parent**, `fork()` returns the **child's PID** (a positive number) — the only way the parent ever learns the child's PID, since it can't `getpid()` its way to it.
- In the **child**, `fork()` returns **`0`** — the child already knows its own PID via `getpid()`, and can always find its parent via `getppid()`.
- A negative return means the fork failed (e.g. process-table exhaustion) — no child was created at all.

The initial `getchar()` is a deliberate pause: it gives a chance to run `ps -ef` or check `/proc` and see both processes actually existing simultaneously, each with the *same program counter position* right after the call.

## 2. Both processes keep running independently

`fork_demo2.c` replaces the one-shot prints with infinite loops in both branches, making the parallel execution obvious instead of instantaneous:

```c
if (pid > 0) {
  while (1) {
    printf("PARENT: my pid = %d, My child pid = %d\n", getpid(), pid);
    usleep(500000);
  }
} else if (pid == 0) {
  while (1) {
    printf("CHILD: my pid = %d, My Parent pid = %d\n", getpid(), getppid());
    usleep(500000);
  }
}
```

Both loops print every 500 ms, interleaved — two genuinely independent processes, scheduled separately by the kernel, both descended from the exact same `fork()` call.

## 3. Copy-on-write: each side gets its own memory

`fork_demo3.c` is the same shape, but tracks a global (`x`), a global BSS variable (`y`), and a stack variable (`z`) across the fork, incrementing them at different rates in each branch:

```c
int x = 5;
int y;

int main(void) {
  int z = 10;
  getchar();

  x++; y++; z++;
  printf("Parent: before fork x = %d, y = %d, z = %d \n", x, y, z);
  pid_t pid = fork();

  if (pid > 0) {
    while (1) {
      printf("Parent: after fork x = %d, y = %d, z = %d\n", x, y, z);
      x++; y++; z++;
      usleep(500000);
    }
  } else if (pid == 0) {
    while (1) {
      printf("CHILD: after fork x = %d, y = %d, z = %d\n", x, y, z);
      x++; y++; z++;   x++; y++; z++;   x++; y++; z++;   // child increments 3x as fast
      usleep(500000);
    }
  }
}
```

Right after `fork()`, parent and child have **identical values** for `x`, `y`, and `z` — the child got an exact copy of the parent's entire address space (globals, BSS, stack, heap). But once each side starts incrementing its own copy, the values **diverge immediately** and never resync. This is copy-on-write in action: the kernel doesn't actually duplicate physical memory pages at `fork()` time — both processes share the same pages, marked read-only, until either side *writes* to one, at which point the kernel copies just that page. From userspace the effect is indistinguishable from a full copy: each process owns its own private memory from the moment it writes, with zero risk of one process's increments corrupting the other's.

## 4. What happens if nobody calls wait() — zombies

`zombie_demo.c` is a minimal shell: read a command, `fork()`, and in the child, `execve()` it.

```c
pid_t pid = fork();

if (pid > 0) {
  printf("PARENT: my pid = %d, My child pid = %d\n", getpid(), pid);
  sleep(1);
} else if (pid == 0) {
  char *newargv[] = { buf, NULL };
  char *newenvp[] = { NULL };
  execve(buf, newargv, newenvp);
  printf("exec failed\n");
  exit(-1);
}
```

Look closely at the parent branch: it prints a message and `sleep(1)`s — but it never calls `wait()` or `waitpid()`. When the child process finishes running whatever command was `execve()`'d, the kernel can't fully discard it. A process's exit status has to be available for its parent to collect; until the parent reaps it, the kernel keeps a minimal record around — the process shows up in `ps` with a `Z` state and `<defunct>` in its name. That's a **zombie**: not consuming CPU or a real memory footprint, but still occupying an entry in the kernel's process table, and those tables have finite size. A long-running parent that keeps forking and never reaping (a shell like this one, or a buggy server spawning workers) will slowly accumulate zombies until it exhausts the process table and can't fork anything else.

The fix is exactly the call this demo omits: the parent should `waitpid(pid, &status, 0)` (or handle `SIGCHLD` and reap inside the handler) so the kernel can release each child's process-table entry as soon as it exits, instead of leaving it as a zombie until the parent itself terminates.

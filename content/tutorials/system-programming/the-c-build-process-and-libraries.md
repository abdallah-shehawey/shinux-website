---
title: The C Build Process & Libraries
description: >-
  Turning a .c file into a running program is four distinct steps, each of which
  gcc can be told to stop after — which is also exactly how to inspect what's
  happening at every stage. This also covers…
order: 4
tags:
  - systems
draft: false
author: abdallah-shehawey
---
Turning a `.c` file into a running program is four distinct steps, each of which `gcc` can be told to stop after — which is also exactly how to inspect what's happening at every stage. This also covers building and linking against both static (`.a`) and shared (`.so`) libraries, and the runtime gotcha that trips people up the first time they use a shared one.

## 1. The four stages of the build

### Preprocessing

The preprocessor expands everything starting with `#`: `#include` is replaced with the included file's contents, `#define` macros are substituted, and comments are stripped. Output is "pure" C source with a `.i` extension.

```bash
gcc -E source.c -o source.i   # -E: stop after preprocessing
```

### Compilation

The compiler turns the `.i` file into architecture-specific assembly, checking syntax and applying optimizations along the way. Output is a `.s` assembly file.

```bash
gcc -S source.i -o source.s   # -S: stop after compilation (uppercase S)
```

### Assembly

The assembler turns human-readable assembly (`MOV`, `ADD`, …) into actual machine code. Output is an object file (`.o`) — binary, but not yet executable, since it hasn't been linked.

```bash
gcc -c source.s -o source.o   # -c: compile+assemble, don't link (lowercase c)
```

### Linking

The linker combines the object file(s) with whatever libraries the program needs (e.g. `printf` from libc) into a complete executable.

```bash
gcc source.o -o program   # no -E/-S/-c → gcc runs the full pipeline, including the linker
```

**Generating a map file** — a text file showing exactly how the linker laid out functions and variables in memory, useful for debugging linker-level issues:

```bash
gcc test.c -o test -Wl,-Map=main.map
```

## 2. Static libraries

A static library (`.a`) is an archive of object files. Linking against it **copies** the needed code straight into the final executable — bigger binary, but fully self-contained.

**Build it:**

```bash
gcc -c file1.c -o file1.o
gcc -c file2.c -o file2.o
# or, all at once:
gcc -c *.c

ar rcs libfile.a file1.o file2.o *.o
```

`ar rcs`: `r` adds/replaces files in the archive, `c` creates it if missing, `s` builds an index (speeds up linking against it later). `ar t libfile.a` lists what's inside.

**Use it**, assuming `main.c` needs functions from `libfile.a` in a `mylib/` folder:

```bash
gcc -c main.c -o main.o -I./mylib
gcc main.o -o main_program -L./mylib -lfile
```

`-I` tells the compiler where to find headers; `-L` tells the linker where to find library *files*; `-lfile` asks it to link against `libfile.a` (the linker adds the `lib` prefix and `.a` suffix automatically).

## 3. Shared (dynamic) libraries

A shared library (`.so` on Linux) works differently: its code is **not** copied into the executable. The executable just holds a reference, and the OS loads the `.so` into memory at runtime. That means smaller executables, one shared copy in memory even if ten programs use the same library, and the ability to patch the library (e.g. a bug fix) without recompiling anything that links against it.

**Build it:**

```bash
gcc -c -fPIC file1.c -o file1.o
gcc -c -fPIC file2.c -o file2.o
# or in one step:
gcc -fPIC -shared *.c -o libfile.so
```

`-fPIC` (Position-Independent Code) is mandatory here — it's what lets the OS load the library at any address, since the exact load address can't be known at compile time the way it can for a statically-linked binary. `-shared` tells gcc to produce a `.so` instead of an executable.

**Link against it** — syntactically identical to the static case:

```bash
gcc main.c -o main_program -I./mylib -L./mylib -lfile
```

If both `libfile.a` and `libfile.so` exist in the same `-L` path, the linker prefers the `.so`.

## 4. The runtime gotcha

Running `./main_program` straight after linking against a `.so` typically fails:

```text
./main_program: error while loading shared libraries: libfile.so: cannot open shared object file: No such file or directory
```

`-L` only told the *linker* where to find the library at **build time** — the OS's runtime loader doesn't know to look there. It needs `LD_LIBRARY_PATH`:

```bash
# for one invocation only
LD_LIBRARY_PATH=./mylib ./main_program

# for the rest of the current shell session
export LD_LIBRARY_PATH=./mylib
./main_program
```

For a permanent install, the usual approach is copying the `.so` into a standard system path (e.g. `/usr/local/lib`) and running `sudo ldconfig` to refresh the system's library cache — at which point `LD_LIBRARY_PATH` isn't needed at all.

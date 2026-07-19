---
title: Static vs Dynamic Linking in C
description: >-
  A small worked example makes the static-vs-shared distinction from the C build
  process lesson in this track concrete: the exact same four-function math
  library, built both ways, linked against the…
order: 11
tags:
  - systems
draft: false
author: abdallah-shehawey
---
A small worked example makes the static-vs-shared distinction from the C build process lesson in this track concrete: the exact same four-function math library, built both ways, linked against the exact same `main.c`, so the only thing that differs is the linking method.

## 1. The library

Four tiny functions, one per file, plus a shared header:

```c
// mylib/myadd.c
double myadd(double a, double b) { return a + b; }
```

```c
// mylib/mylib.h
double myadd(double, double);
double mysub(double, double);
double mymul(double, double);
double mydiv(double, double);
```

`mydiv` guards the one interesting edge case:

```c
double mydiv(double a, double b) {
  if (b != 0) return a / b;
  return 0;
}
```

And the consumer:

```c
// main.c
#include <mylib.h>

int main() {
  double x, y;
  scanf("%lf", &x);
  scanf("%lf", &y);
  printf("a + b = %7.2lf\n", myadd(x, y));
  printf("a - b = %7.2lf\n", mysub(x, y));
  printf("a * b = %7.2lf\n", mymul(x, y));
  printf("a/b   = %7.2lf\n", mydiv(x, y));
  return 0;
}
```

## 2. Building it as a static library

```bash
gcc -c mylib/myadd.c mylib/mysub.c mylib/mymul.c mylib/mydiv.c -Imylib
ar rcs mylib/libmylib.a myadd.o mysub.o mymul.o mydiv.o

gcc main.c -o main_static -I./mylib -L./mylib -lmylib
```

`main_static` now contains the four functions' actual machine code, copied in at link time. Confirm it:

```bash
ldd main_static
# "not a dynamic executable" (or no libmylib.* listed at all)
```

## 3. Building it as a shared library

```bash
gcc -c -fPIC mylib/myadd.c mylib/mysub.c mylib/mymul.c mylib/mydiv.c -Imylib
gcc -shared -o mylib/libfile.so myadd.o mysub.o mymul.o mydiv.o

gcc main.c -o main_dynamic -I./mylib -L./mylib -lfile
```

`ldd main_dynamic` now lists `libfile.so` as a dependency the OS loader has to resolve at process start — and running it straight away reproduces the classic error from the build-process lesson (`cannot open shared object file`) until `LD_LIBRARY_PATH` points at `./mylib`, since it was never installed to a standard system library path.

## 4. What actually differs

| | Static (`.a`) | Shared (`.so`) |
| --- | --- | --- |
| Where the code lives | Copied into the executable | Loaded separately, at runtime |
| Executable size | Larger | Smaller |
| Multiple programs sharing it | Each gets its own copy in memory | One copy in memory, shared by every process using it |
| Updating the library | Requires recompiling/relinking every consumer | Drop in a new `.so`; every consumer picks it up on next run |
| Extra runtime requirement | None | Loader must be able to find the `.so` (`LD_LIBRARY_PATH` or `ldconfig`) |

For four tiny arithmetic functions the difference in executable size is trivial — the value of building it both ways here isn't the size delta, it's seeing `ldd` report a completely different answer for the exact same source code, depending purely on how it was compiled and linked.

## 5. Inspecting either binary

```bash
file main_static main_dynamic     # both report as ELF executables — file alone won't show the difference
ldd main_dynamic                   # lists libfile.so and its resolved path (or "not found")
nm mylib/libmylib.a                 # shows myadd/mysub/mymul/mydiv defined, ready to be copied in
readelf -d main_dynamic             # shows a NEEDED entry for libfile.so in the dynamic section
```

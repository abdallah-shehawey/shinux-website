---
title: 'MISRA C: Coding Rules for Safety-Critical C'
description: >-
  MISRA C (from the Motor Industry Software Reliability Association) is a set of
  coding guidelines aimed at one goal: making C — a language full of undefined
  and implementation-defined behavior —…
order: 5
tags:
  - systems
draft: false
author: abdallah-shehawey
---
MISRA C (from the Motor Industry Software Reliability Association) is a set of coding guidelines aimed at one goal: making C — a language full of undefined and implementation-defined behavior — predictable and analyzable enough to trust in safety-critical software. It's the de facto standard in automotive (AUTOSAR), medical devices, aerospace, and industrial controllers. The current editions in active use are MISRA C:2012 (still the most common in industry) and MISRA C:2023.

Rules fall into three severities: **Mandatory** (must never be violated), **Required** (should not be violated), and **Advisory** (recommended). In practice, no real project follows every rule 100% — deviations get documented in a **MISRA Deviation Report**, and that's completely normal.

The rules below are the ones that come up constantly in practice.

## 1. No implicit type conversion

```c
// avoid
uint8_t x = 300;

// prefer
uint8_t x = (uint8_t)300;
```

An explicit cast makes truncation/overflow a deliberate decision instead of a silent accident, and documents intent.

## 2. Use fixed-width integer types

```c
// avoid — size is compiler-dependent
int x;

// prefer — deterministic size
uint32_t x;
```

Embedded code in particular can't afford `int` meaning something different on a different toolchain.

## 3. Every variable is initialized

```c
// avoid
int x;
if (x > 5) { ... }

// prefer
int x = 0;
```

Reading an uninitialized variable is undefined behavior, not "probably zero."

## 4. No reliance on undefined behavior

```c
int x = 10 / 0;    // division by zero
*p = 5;             // NULL pointer dereference
x = i++ + i++;      // multiple unsequenced side effects on i
```

The compiler is free to generate literally anything for these — including code that "works" until an optimization flag changes.

## 5. One side effect per expression

```c
// avoid
a = i++ + i++;

// prefer
i++;
a = i;
i++;
a += i;
```

## 6. Always brace compound statements

```c
// avoid — z++ isn't actually part of the if
if (x > 0)
    y++;
    z++;

// prefer
if (x > 0)
{
    y++;
}
```

## 7. Every `if` gets an `else`; every `switch` gets a `default`

```c
if (status == OK)
{
    handle_ok();
}
else
{
    /* explicitly handled, even if a no-op */
}
```

```c
switch (state)
{
    case INIT: break;
    case RUN:  break;
    default:   break;   // guards against unexpected values
}
```

## 8. No `goto`

Breaks structured control flow and makes code harder to reason about; allowed only with strong, documented justification.

## 9. No dynamic memory allocation

```c
// avoid
malloc(); free();

// prefer
static uint8_t buffer[128];
```

`malloc`/`free` introduce fragmentation and non-deterministic timing — both unacceptable in hard real-time or safety-critical code. Static allocation is fully predictable.

## 10. No recursion

```c
// avoid
void func(void) { func(); }
```

Recursion depth isn't statically boundable in the general case, which means unpredictable stack usage — a real risk on a microcontroller with a few KB of stack.

## 11. One return statement per function

```c
// avoid
if (x) return 1;
return 0;

// prefer
int ret = 0;
if (x)
{
    ret = 1;
}
return ret;
```

A single exit point makes cleanup and reasoning about a function's control flow much simpler.

## 12. Function prototypes are mandatory

Every function must be declared (usually in a header) before it's used — no implicit declarations.

## 13. No magic numbers

```c
// avoid
if (speed > 120) { ... }

// prefer
#define MAX_SPEED 120U
if (speed > MAX_SPEED) { ... }
```

## 14. Explicit boolean expressions

```c
// avoid
if (x) { ... }

// prefer
if (x != 0U) { ... }
```

Makes the comparison's intent explicit instead of relying on implicit truthiness conversion.

## 15. Prefer `const` wherever possible

```c
const uint32_t MAX_SIZE = 64U;
```

Protects data from accidental modification and gives the compiler more room to optimize.

## 16. Correct use of `volatile`

Required for anything the compiler can't assume is stable across reads — hardware registers and variables shared with an ISR:

```c
volatile uint32_t * const GPIO_ODR = (uint32_t *)0x40020014;
```

## 17. Restricted pointer arithmetic

```c
// avoid
ptr = ptr + 5;

// prefer
ptr = &array[5];
```

Indexing through the array expresses the same operation with bounds clearly tied to a named array, rather than raw pointer math.

## 18. Header files declare, they don't define

```c
#ifndef GPIO_H
#define GPIO_H

void GPIO_Init(void);

#endif
```

No function definitions in headers, and always guard against multiple inclusion.

## 19. No macro side effects

```c
// avoid — SQR(a+b) expands to a+b*a+b, not (a+b)*(a+b)
#define SQR(x) x*x

// prefer
#define SQR(x) ((x) * (x))
```

## 20. Use the standard library carefully

Some standard functions are restricted or forbidden in safety-critical code — `printf` for timing unpredictability, `strcpy`/`strcat` for buffer-overflow risk. Prefer safer alternatives or custom, bounds-checked equivalents.

## 21. Never silently mix signed and unsigned types

```c
// avoid
uint32_t a;
int32_t b;
if (a > b) { ... }

// prefer
if (a > (uint32_t)b) { ... }
```

## 22. Limit variable scope

```c
void func(void)
{
    uint32_t i = 0U;   // scoped to this function only
}
```

## 23. Use enums carefully

Don't assume a particular underlying size for an enum, and don't mix enum values with plain integers.

---

MISRA-C isn't about writing more code for its own sake — it's about making C code predictable, reviewable, safe, and maintainable. Internalizing these rules is a real prerequisite for professional embedded work, automotive-industry interviews, and safety-critical firmware design generally.

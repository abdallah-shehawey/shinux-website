---
title: 'Misra C: Coding Rules for Safety-critical C'
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

## No Implicit Type Conversion

```ini
// avoid
uint8_t x = 300;

// prefer
uint8_t x = (uint8_t)300;
```

An explicit cast makes truncation/overflow a deliberate decision instead of a silent accident, and documents intent.

## Use Fixed-width Integer Types

```text
// avoid — size is compiler-dependent
int x;

// prefer — deterministic size
uint32_t x;
```

Embedded code in particular can't afford `int` meaning something different on a different toolchain.

## Every Variable is Initialized

```ini
// avoid
int x;
if (x > 5) { ... }

// prefer
int x = 0;
```

Reading an uninitialized variable is undefined behavior, not "probably zero."

## No Reliance on Undefined Behavior

```ini
int x = 10 / 0;    // division by zero
*p = 5;             // NULL pointer dereference
x = i++ + i++;      // multiple unsequenced side effects on i
```

The compiler is free to generate literally anything for these — including code that "works" until an optimization flag changes.

## One Side Effect Per Expression

```ini
// avoid
a = i++ + i++;

// prefer
i++;
a = i;
i++;
a += i;
```

## Always Brace Compound Statements

```text
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

## Every `if` Gets an `else`; Every `switch` Gets a `default`

```ini
if (status == OK)
{
    handle_ok();
}
else
{
    /* explicitly handled, even if a no-op */
}
```

```text
switch (state)
{
    case INIT: break;
    case RUN:  break;
    default:   break;   // guards against unexpected values
}
```

## No `goto`

Breaks structured control flow and makes code harder to reason about; allowed only with strong, documented justification.

## No Dynamic Memory Allocation

```c
// avoid
malloc(); free();

// prefer
static uint8_t buffer[128];
```

`malloc`/`free` introduce fragmentation and non-deterministic timing — both unacceptable in hard real-time or safety-critical code. Static allocation is fully predictable.

## No Recursion

```c
// avoid
void func(void) { func(); }
```

Recursion depth isn't statically boundable in the general case, which means unpredictable stack usage — a real risk on a microcontroller with a few KB of stack.

## One Return Statement Per Function

```ini
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

## Function Prototypes are Mandatory

Every function must be declared (usually in a header) before it's used — no implicit declarations.

## No Magic Numbers

```text
// avoid
if (speed > 120) { ... }

// prefer
#define MAX_SPEED 120U
if (speed > MAX_SPEED) { ... }
```

## Explicit Boolean Expressions

```ini
// avoid
if (x) { ... }

// prefer
if (x != 0U) { ... }
```

Makes the comparison's intent explicit instead of relying on implicit truthiness conversion.

## Prefer `const` Wherever Possible

```ini
const uint32_t MAX_SIZE = 64U;
```

Protects data from accidental modification and gives the compiler more room to optimize.

## Correct Use of `volatile`

Required for anything the compiler can't assume is stable across reads — hardware registers and variables shared with an ISR:

```ini
volatile uint32_t * const GPIO_ODR = (uint32_t *)0x40020014;
```

## Restricted Pointer Arithmetic

```ini
// avoid
ptr = ptr + 5;

// prefer
ptr = &array[5];
```

Indexing through the array expresses the same operation with bounds clearly tied to a named array, rather than raw pointer math.

## Header Files Declare, They Don't Define

```c
#ifndef GPIO_H
#define GPIO_H

void GPIO_Init(void);

#endif
```

No function definitions in headers, and always guard against multiple inclusion.

## No Macro Side Effects

```text
// avoid — SQR(a+b) expands to a+b*a+b, not (a+b)*(a+b)
#define SQR(x) x*x

// prefer
#define SQR(x) ((x) * (x))
```

## Use the Standard Library Carefully

Some standard functions are restricted or forbidden in safety-critical code — `printf` for timing unpredictability, `strcpy`/`strcat` for buffer-overflow risk. Prefer safer alternatives or custom, bounds-checked equivalents.

## Never Silently Mix Signed and Unsigned Types

```text
// avoid
uint32_t a;
int32_t b;
if (a > b) { ... }

// prefer
if (a > (uint32_t)b) { ... }
```

## Limit Variable Scope

```c
void func(void)
{
    uint32_t i = 0U;   // scoped to this function only
}
```

## Use Enums Carefully

Don't assume a particular underlying size for an enum, and don't mix enum values with plain integers.

---

MISRA-C isn't about writing more code for its own sake — it's about making C code predictable, reviewable, safe, and maintainable. Internalizing these rules is a real prerequisite for professional embedded work, automotive-industry interviews, and safety-critical firmware design generally.

---
title: Misra-c Guidelines Detailed Cheat Sheet
description: 'MISRA-C is widely used in:'
order: 902
tags:
  - linux
draft: false
author: abdallah-shehawey
---
> **Target audience:** Embedded Systems & Safety-Critical Software Developers
> **Language:** C (especially Bare‑Metal / MCU development)

---

## What is Misra-c?

**MISRA-C (Motor Industry Software Reliability Association)** is a set of coding guidelines designed to:

- Improve **code safety and reliability**

- Avoid **undefined / unspecified / implementation-defined behavior** in C

- Make code **predictable and analyzable**

- Reduce runtime failures in **embedded and safety‑critical systems**


MISRA-C is widely used in:

- Automotive (AUTOSAR)

- Medical devices

- Aerospace

- Industrial controllers


---

## Common Misra-c Versions

- MISRA-C:2004

- MISRA-C:2012 (most used in industry)

- MISRA-C:2023 (latest)


---

# Core Misra-c Rules (most Famous & Practical)

---

## No Implicit Type Conversion

❌ Not recommended:

```ini
uint8_t x = 300;
```

✅ Recommended:

```ini
uint8_t x = (uint8_t)300;
```

**Reason:**

- Prevent overflow

- Prevent hidden truncation

- Make programmer intent explicit


---

## Use Fixed-width Integer Types

❌ Not recommended:

```text
int x;
```

✅ Recommended:

```text
uint32_t x;
```

**Reason:**

- `int` size is compiler-dependent

- Embedded systems require deterministic size


---

## All Variables Must be Initialized

❌

```text
int x;
if (x > 5)
```

✅

```ini
int x = 0;
```

**Reason:**

- Uninitialized variables cause undefined behavior


---

## No Use of Undefined Behavior

Examples of forbidden behavior:

```ini
int x = 10 / 0;        // division by zero
*p = 5;                // NULL pointer dereference
x = i++ + i++;         // multiple side effects
```

**Reason:**

- Compiler may generate unpredictable code


---

## Avoid Multiple Side Effects in One Expression

❌

```ini
a = i++ + i++;
```

✅

```ini
i++;
a = i;
i++;
a += i;
```

---

## Always Use Braces `{}`

❌

```text
if (x > 0)
    y++;
    z++;
```

✅

```text
if (x > 0)
{
    y++;
}
```

**Reason:**

- Prevent logical errors


---

## Every `if` Must Have an `else` (recommended)

```ini
if (status == OK)
{
    handle_ok();
}
else
{
    /* explicitly handled */
}
```

---

## Every `switch` Must Have a `default`

```text
switch (state)
{
    case INIT:
        break;

    case RUN:
        break;

    default:
        break;
}
```

**Reason:**

- Protect against unexpected values


---

## No `goto` Statement

❌

```text
goto error;
```

**Reason:**

- Breaks control flow readability


(Allowed only with strong justification)

---

## No Dynamic Memory Allocation

❌

```text
malloc();
free();
```

✅

```text
static uint8_t buffer[128];
```

**Reason:**

- Fragmentation

- Non-deterministic timing


---

## No Recursion

❌

```c
void func(void)
{
    func();
}
```

**Reason:**

- Stack overflow risk

- No predictability


---

## One Return Statement Per Function

❌

```text
if (x) return 1;
return 0;
```

✅

```ini
int ret = 0;

if (x)
{
    ret = 1;
}

return ret;
```

---

## Function Prototypes are Mandatory

❌

```text
func();
```

✅

```c
void func(void);
```

---

## No Magic Numbers

❌

```text
if (speed > 120)
```

✅

```text
#define MAX_SPEED 120U

if (speed > MAX_SPEED)
```

---

## Explicit Boolean Expressions

❌

```text
if (x)
```

✅

```ini
if (x != 0U)
```

**Reason:**

- Improves readability

- Avoids implicit conversions


---

## Use `const` Whenever Possible

```ini
const uint32_t MAX_SIZE = 64U;
```

**Reason:**

- Protect data from modification

- Enables compiler optimizations


---

## Proper Use of `volatile`

Used for:

- Hardware registers

- ISR-shared variables


```ini
volatile uint32_t * const GPIO_ODR = (uint32_t *)0x40020014;
```

---

## Pointer Arithmetic is Restricted

❌

```ini
ptr = ptr + 5;
```

✅

```ini
ptr = &array[5];
```

---

## No Implicit Function Declarations

All functions must be declared before use.

---

## Header Files Rules

- Header files contain **declarations only**

- No function definitions

- Use include guards


```c
#ifndef GPIO_H
#define GPIO_H

void GPIO_Init(void);

#endif
```

---

## Avoid Macro Side Effects

❌

```text
#define SQR(x) x*x
```

✅

```text
#define SQR(x) ((x) * (x))
```

---

## Use Standard Library Carefully

Some standard library functions are restricted or forbidden:

- printf (timing issues)

- strcpy / strcat (buffer overflow)


Preferred safer alternatives or custom drivers.

---

## No Mixing Signed and Unsigned Types

❌

```text
uint32_t a;
int32_t b;
if (a > b)
```

✅

```text
if (a > (uint32_t)b)
```

---

## Limit Scope of Variables

```c
void func(void)
{
    uint32_t i = 0U;   // local, limited scope
}
```

---

## Use Enumerations Carefully

- Do not assume enum size

- Do not mix enums with integers


---

# Rule Classification

|Type|Meaning|
|---|---|
|Mandatory|Must never be violated|
|Required|Should not be violated|
|Advisory|Recommended|

---

# Important Industry Note

✔ No real project follows MISRA 100%
✔ Violations must be documented using:

> **MISRA Deviation Report**

This is completely normal in industry.

---

# Final Summary

MISRA-C is not about making code longer.

It is about making code:

- Predictable

- Reviewable

- Safe

- Maintainable


If you master MISRA-C, you are ready for:

- Professional Embedded projects

- Automotive interviews

- Safety-critical firmware design


---

**Author target:** Embedded Systems Engineers

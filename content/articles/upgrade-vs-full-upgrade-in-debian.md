---
title: "apt upgrade vs apt full-upgrade"
description: "The dependency-handling difference between a safe upgrade and an aggressive one, with a worked example."
date: 2026-07-13
tags: [debian, ubuntu, apt]
locale: en
draft: false
---

In Debian-based systems (Ubuntu, Debian, Kali, Mint), package upgrades go through `apt`. Two common commands — `apt upgrade` and `apt full-upgrade` — both upgrade packages, but behave very differently around dependencies.

## 1. `apt upgrade` — safe upgrade

Upgrades installed packages **only if the upgrade doesn't require removing any other package**. If an upgrade would require adding or removing dependencies, `apt upgrade` simply won't perform it. Suitable for everyday use.

Key characteristics: no package removals, no major system changes, only "safe" upgrades.

## 2. `apt full-upgrade` — smart/aggressive upgrade

Upgrades packages **even if doing so requires removing old packages or installing new dependencies**. Used for major dependency changes — kernel upgrades, big version jumps, new meta-packages. Equivalent to the older `apt-get dist-upgrade`.

Key characteristics: may install new dependencies, may remove conflicting packages, handles major system transitions.

## 3. A practical example

Imagine package `A` needs a new dependency `B`, but installing `B` requires removing old package `C`.

- `apt upgrade` → will **not** upgrade `A`, because it avoids removing `C`.
- `apt full-upgrade` → will upgrade `A`, install `B`, and remove `C` if necessary.

## 4. Summary

| Feature                        | `apt upgrade` | `apt full-upgrade`     |
| --------------------------------- | ---------------- | -------------------------- |
| Installs new dependencies      | Yes             | Yes                       |
| Removes packages               | No              | Yes                       |
| Safe for daily updates         | Yes             | Use with caution          |
| Handles major system changes   | No              | Yes                       |
| Equivalent old command         | —               | `apt-get dist-upgrade`   |

## 5. When to use each

**Use `apt upgrade`** for routine updates, when you want zero package removals, or when stability matters more than having the newest version.

**Use `apt full-upgrade`** for big system upgrades, kernel upgrades, meta-package or dependency structure changes, or upgrading to a new release.

Both commands are safe, but `apt upgrade` is conservative while `apt full-upgrade` is smart/aggressive — choose based on how much control you want over dependency changes.

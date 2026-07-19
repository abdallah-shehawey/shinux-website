---
title: Linux File Permissions and Ownership Complete Practical Guide
description: >-
  Linux is a multi-user system, and file permissions are the backbone of its
  security model. Every file and directory is protected by ownership rules that
  determine who can read, write, or execute it.
order: 12
tags:
  - linux
draft: false
author: abdallah-shehawey
---
## Introduction

Linux is a **multi-user system**, and file permissions are the backbone of its security model. Every file and directory is protected by ownership rules that determine **who can read, write, or execute** it.

This guide explains permissions from **kernel perspective to admin practice**.

---

## File Permission Model

Linux permissions are based on **three subjects** and **three actions**.

### Subjects

|Subject|Symbol|Description|
|---|---|---|
|Owner|`u`|User who owns the file|
|Group|`g`|Group owning the file|
|Others|`o`|Everyone else|

### Permissions

|Permission|Symbol|Meaning|
|---|---|---|
|Read|`r` (4)|View contents|
|Write|`w` (2)|Modify|
|Execute|`x` (1)|Run / access|

---

## Understanding `ls -l`

```text
-rw-r--r-- 1 alice developers 4096 file.txt
```

|Field|Meaning|
|---|---|
|`-`|File type|
|`rw-`|Owner|
|`r--`|Group|
|`r--`|Others|
|`alice`|Owner|
|`developers`|Group|

---

## Permission Bits Explained

|Numeric|Binary|Meaning|
|---|---|---|
|7|111|rwx|
|6|110|rw-|
|5|101|r-x|
|4|100|r--|

Example:

```text
chmod 755 script.sh
```

---

## Chmod Change Permissions

### Symbolic Mode

```text
chmod u+x script.sh
chmod g-w file.txt
chmod o-r secret.txt
```

### Numeric Mode

```text
chmod 640 file.txt
```

---

## Chown Change Ownership

```bash
sudo chown alice file.txt
sudo chown alice:developers file.txt
sudo chown -R alice /projects
```

---

## Chgrp Change Group

```bash
sudo chgrp developers project.txt
sudo chgrp -R admins /srv
```

---

## Directory Permissions (critical)

|Permission|Effect on Directory|
|---|---|
|`r`|List names|
|`w`|Create/delete files|
|`x`|Access directory|

✅ Without `x`, you cannot access files even if readable.

---

## Setuid, Setgid, Sticky Bit

### Setuid

```text
chmod u+s program
```

Program runs as file owner (e.g. passwd).

### Setgid

```text
chmod g+s directory
```

New files inherit group.

### Sticky Bit

```text
chmod +t /tmp
```

Prevents deleting others’ files.

---

## Umask

Controls default permissions.

```text
umask
umask 022
```

---

## Permission Resolution Order

1. Owner

2. Group

3. Others


The kernel stops at the first match.

---

## Common Permission Mistakes

- Forgetting execute bit on directories

- Overusing `777`

- Ignoring group strategy


---

## Summary

- Linux permissions are kernel enforced

- Numeric and symbolic modes exist

- Directories behave differently

- Special bits enable enterprise sharing


---

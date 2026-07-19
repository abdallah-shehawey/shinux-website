---
title: Su Command in Linux Complete Guide with Environment Variables
description: >-
  The su (substitute user / switch user) command is one of the oldest and most
  fundamental privilege-switching tools in Unix and Linux systems. It allows one
  user to temporarily become another user —…
order: 11
tags:
  - linux
draft: false
author: abdallah-shehawey
---
## Introduction

The `su` (substitute user / switch user) command is one of the oldest and most fundamental privilege-switching tools in Unix and Linux systems. It allows one user to temporarily become another user — most commonly `root` — either to execute a single command or to start an interactive shell.

Understanding `su` requires understanding **environment variables**, **login shells**, and **security implications**, which this guide covers in depth.

---

## Environment Variables in Linux

Environment variables are **key–value pairs** inherited by child processes from their parent shell. They define runtime behavior such as command lookup paths, user identity, language, and shell configuration.

### Common Environment Variables

|Variable|Purpose|Example|
|---|---|---|
|`USER`|Current username|`abdallah`|
|`UID`|Numeric user ID|`1000`|
|`HOME`|User home directory|`/home/abdallah`|
|`PATH`|Executable search path|`/usr/bin:/bin`|
|`SHELL`|Default login shell|`/bin/bash`|
|`PWD`|Current directory|`/home/abdallah/projects`|

### Viewing Environment Variables

```text
printenv
env

# individual variables
echo $USER
echo $HOME
echo $PATH
```

---

## What is `su`?

The `su` command starts a shell as another user after successful authentication. By default, it switches to **root**:

```text
su
```

But it can switch to any user:

```text
su alice
```

⚠ **Authentication rule**: you must know the target user’s password (unless running as root).

---

## Su Command Syntax

```text
su [OPTIONS] [USERNAME]
```

### Important Options

|Option|Meaning|
|---|---|
|`-` or `--login`|Start a full login shell|
|`-c "cmd"`|Run a single command|
|`-m / -p`|Preserve environment|
|`-s /bin/shell`|Use specific shell|

---

## `su` vs `su -` (critical Difference)

### `su` (no Dash)

- Keeps **current environment**

- Does NOT reset `HOME`, `PATH`, `USER`

- Working directory remains the same


Example:

```text
su ali
echo $HOME   # still original user's home
```

### `su -` (login Shell)

- Resets environment

- Loads `/etc/profile`, `~/.bash_profile`

- Changes working directory to target home


Example:

```text
su - ali
echo $HOME   # /home/ali
```

✅ **Best practice**: Always use `su -` when switching users.

---

## Environment Variable Behavior Demo

### Before Su

```text
echo $USER
echo $HOME
echo $PATH
```

### Using Su

```text
su ali
echo $USER   # still original user
exit
```

### Using Su -

```text
su - ali
echo $USER   # ali
exit
```

---

## Running Single Commands

```text
su - root -c "apt update"
```

Useful for scripts and auditing.

---

## Su vs Sudo

|Feature|su|sudo|
|---|---|---|
|Needs root password|✅|❌|
|Command-level control|❌|✅|
|Logging|❌|✅|
|Safer|❌|✅|

✅ Modern systems prefer `sudo`.

---

## Security Best Practices

- Disable direct root login where possible

- Prefer `sudo -i` over `su -`

- Limit shell access in `/etc/passwd`

- Log usage (`/var/log/auth.log`)


---

## Summary

- `su` switches user

- `su -` emulates a real login

- Environment variables define behavior

- Prefer `sudo` in production systems


---

---
title: Linux Users & Groups Deep Administration Guide
description: >-
  A production-grade, systems-level guide to Linux users, groups, and identity
  management. This document does not repeat basic commands only—it explains how
  Linux models identities internally, how…
order: 8
tags:
  - linux
draft: false
author: abdallah-shehawey
---
A **production-grade, systems-level guide** to Linux **users, groups, and identity management**.
This document does not repeat basic commands only—it explains **how Linux models identities internally**, how permissions are enforced, how administrators design group strategies, and how everything ties into security, filesystems, and enterprise setups.

---



## Why Users & Groups Exist

Linux is designed as a **multi-user, time-sharing operating system**.

Goals:

- Isolate users from each other

- Prevent accidental or malicious damage

- Enable controlled collaboration


Everything in Linux runs **as a user**, even system services.

---

## Identity Model in Linux

### Core Identifiers

|Identifier|Meaning|
|---|---|
|UID|User ID|
|GID|Group ID|
|EUID|Effective User ID|
|EGID|Effective Group ID|

Example:

```text
id
```

UIDs are what the **kernel actually checks**, not usernames.

---

## System vs Normal Users

|Type|UID Range|Purpose|
|---|---|---|
|root|0|Superuser|
|System users|1–999|Daemons & services|
|Normal users|≥1000|Human users|

System users **cannot usually log in**.

---

## Where Linux Stores User Data

### Key Files

|File|Purpose|
|---|---|
|`/etc/passwd`|User account database|
|`/etc/shadow`|Encrypted passwords|
|`/etc/group`|Group memberships|
|`/etc/gshadow`|Secure group data|

Never edit `/etc/shadow` manually.

---

## Authentication vs Authorization

|Phase|Meaning|
|---|---|
|Authentication|Who are you?|
|Authorization|What are you allowed to do?|

Linux users & groups control **authorization**, not authentication mechanisms.

---

## User Management (deep Dive)

### Creating Users (low-level)

```bash
sudo useradd -m -s /bin/bash alice
```

Key options:

- `-u` → UID

- `-g` → primary group

- `-G` → supplementary groups

- `-d` → home directory


Passwords:

```bash
sudo passwd alice
```

---

### Modifying Users

```bash
sudo usermod -s /bin/zsh alice
sudo usermod -aG sudo alice
```

⚠ `-G` replaces existing groups — always use `-aG`.

---

### Deleting Users Safely

```bash
sudo userdel alice
sudo userdel -r alice
```

Check for remaining files:

```bash
find / -uid 1001
```

---

## Group Management (deep Dive)

### Creating Groups

```bash
sudo groupadd developers
```

### Modifying Groups

```bash
sudo gpasswd -a alice developers
sudo gpasswd -d alice developers
```

Groups enable **permission abstraction**.

---

## Primary vs Supplementary Groups (deep Truth)

### Primary Group

- Exactly one per user

- Stored in `/etc/passwd`

- Default group for new files


### Supplementary Groups

- Multiple allowed

- Stored in `/etc/group`

- Grant additional access


Changing behavior with `setgid`.

---

## Useradd vs Adduser (truth Table)

|Aspect|useradd|adduser|
|---|---|---|
|Level|Low|High|
|Interactive|❌|✅|
|Scriptable|✅|⚠|
|Defaults|Minimal|Human-friendly|

Admins prefer **useradd in scripts**, **adduser on desktops**.

---

## Group-based Access Control (patterns)

### Pattern 1: Project Group

```text
projectA → groupA
```

Benefits:

- No per-user permissions

- Easy onboarding/offboarding


---

### Pattern 2: Role-based Groups

```text
sudo, docker, admins
```

Assign roles instead of permissions.

---

## File Ownership & Permission Resolution

Resolution order:

1. Owner

2. Group

3. Others


Kernel checks **IDs**, not names.

Example:

```bash
ls -l file
```

---

## Setgid, Umask & Collaboration

### Setgid Directory

```text
chmod g+s /shared
```

Effect:

- New files inherit group


### Umask

```text
umask 002
```

Ensures group write access.

---

## Advanced Permission Scenarios

### Shared Development Folder

```text
groupadd dev
chown :dev /project
chmod 2775 /project
```

Prevents permission conflicts.

---

## Auditing & Troubleshooting

Key commands:

```text
id user
groups user
getent passwd
group user
```

Find access failures:

```text
namei -l path
```

---

## Security Best Practices

- Use groups, not users

- Avoid root where possible

- Remove users cleanly

- Audit group membership regularly


Avoid permission creep.

---

## Enterprise & Server Scenarios

- LDAP / Active Directory

- Centralized identity

- sudo via group policy


Local users become **identity clients**.

---

## Hands-on Labs

Beginner:

```text
id
```

Intermediate:

```text
mkdir /shared
chmod 2770 /shared
```

Advanced:

```bash
find / -gid dev
```

---

✅ This guide is written for **Linux administrators, security engineers, DevOps, and embedded Linux developers**.

Understanding users and groups means understanding **Linux security itself**.

Happy administering 🐧🔐

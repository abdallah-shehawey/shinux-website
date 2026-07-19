---
title: User Management & File Permissions Deep Dive
description: >-
  Everything from "who am I" through user/group administration to the full
  permission model — standard rwx bits, ACLs, and the special SUID/SGID/sticky
  bits that make commands like passwd work at all.
order: 3
tags:
  - systems
draft: false
author: abdallah-shehawey
---
Everything from "who am I" through user/group administration to the full permission model — standard `rwx` bits, ACLs, and the special SUID/SGID/sticky bits that make commands like `passwd` work at all.

## Identifying Users and Sessions

| Command | Description |
| --- | --- |
| `whoami` | The effective username of the current user. |
| `w` | Who's currently logged in, and their session info. |
| `id` | Current UID plus primary/supplementary GIDs. |
| `hostname` | The machine's hostname. |

## Managing Users and Groups

```bash
sudo adduser username    # interactive: creates home dir, shell, prompts for a password
sudo useradd username    # non-interactive: for scripts, needs explicit options
groupadd groupname
```

```text
passwd                    # change your own password
sudo passwd username       # change someone else's (needs root)
```

```text
man usermod
```

Adding a user to an additional group is a classic footgun:

```text
# DANGEROUS: -G REPLACES all of the user's existing groups with only this list
sudo usermod username -G groupname

# CORRECT: -aG APPENDS this group, keeping every existing membership intact
sudo usermod username -aG groupname
```

```bash
sudo userdel username       # delete the user
sudo userdel -r username    # delete the user AND their home directory
```

## Root Privileges and `sudo`

| Command | Description |
| --- | --- |
| `sudo` | Run a command as root (or another user), if authorized. |
| `su` | Switch to another user; prompts for *that user's* password. |
| `sudo su - username` | Log in as another user entirely — new environment, new home directory (a login shell). |
| `sudo visudo` | The only safe way to edit `/etc/sudoers` — it syntax-checks before saving, so a broken edit can't lock everyone out. |

## The System's User/group Databases

```bash
sudo nvim /etc/passwd   # every account: 7 colon-separated fields (man 5 passwd)
nvim /etc/group          # group definitions (man 5 group)
nvim /etc/shadow         # hashed passwords + aging info — root-readable only (man 5 shadow)
```

## Exit Status and Password Hashing

The last command's exit status lives in `$?` — `0` means success, anything else is failure:

```text
echo $?
```

Passwords are never stored in plaintext; `/etc/shadow` holds a cryptographic hash instead. A good hash function is a one-way function (the input can't be recovered from the output) and collision-resistant (no two different inputs should produce the same hash). MD5 and SHA1 are considered outdated for this purpose; SHA-256/SHA-512 are the current recommendation. See `man 3 crypt` and `man 5 crypt` for how Linux applies this to `/etc/shadow`.

## Viewing Permissions

```bash
ls -l         # detailed listing: permissions, ownership, size
stat file.txt  # full inode-level detail
```

`ls -l` shows a 10-character string like `-rw-r--r--`:

| Position | Meaning | Values |
| --- | --- | --- |
| 1st | File type | `-` regular, `d` directory, `l` symlink, `c` character device |
| 2nd–4th | Owner permissions | `r`, `w`, `x`, `-` |
| 5th–7th | Group permissions | `r`, `w`, `x`, `-` |
| 8th–10th | Others' permissions | `r`, `w`, `x`, `-` |

## Changing Ownership and Permissions

```bash
sudo chown newuser file.txt                    # owner only
sudo chown :newgroup file.txt                  # group only
sudo chown newuser:newgroup file.txt           # both
sudo chown -R newuser:newgroup /path/to/dir    # recursively
```

**Octal `chmod`** — each permission bit has a value (`r=4`, `w=2`, `x=1`), summed per set (owner/group/others):

| String | Calculation | Octal |
| --- | --- | --- |
| `rwx` | 4+2+1 | 7 |
| `rw-` | 4+2+0 | 6 |
| `r-x` | 4+0+1 | 5 |
| `r--` | 4+0+0 | 4 |

```ini
chmod 754 script.sh   # owner=rwx, group=r-x, others=r--  →  -rwxr-xr--
```

**Symbolic `chmod`** — who (`u`/`g`/`o`/`a`), action (`+`/`-`/`=`), permission (`r`/`w`/`x`):

```ini
chmod u+x script.sh    # add execute for the owner
chmod o-w file.txt      # remove write from others
chmod g=rw data.log      # set group to exactly read+write
chmod a+r config.ini      # add read for everyone
```

## Access Control Lists (acls)

Standard owner/group/others permissions can't express "grant this one specific user access" — that's what ACLs are for:

```text
getfacl filename                       # view a file's ACL
setfacl -m u:user1:r filename           # grant user1 read access
setfacl -m g:devgroup:rw filename       # grant a group read+write
setfacl -x u:user1 filename            # remove one ACL entry
setfacl -b filename                     # clear all ACL entries
setfacl -R -m u:user1:rx /path/to/dir   # apply recursively
setfacl -d -m u:user1:rx /path/to/dir   # set a default ACL, inherited by new files
```

An ACL rule doesn't change what `chmod`/`ls -l` display — it's an additional rule the kernel evaluates alongside the standard permission bits, and default ACLs only apply to directories (governing what new files inside them inherit).

## Special Permission Bits: Suid, Sgid, Sticky

```text
man inode
```

| Octal | Bit | Symbol | Effect |
| --- | --- | --- | --- |
| `4000` | SUID | `u+s` | The process runs with the **file owner's** permissions, not the caller's. |
| `2000` | SGID | `g+s` | On files: runs with the file's **group** permissions. On directories: new files inside inherit the parent directory's group automatically. |
| `1000` | Sticky | `o+t` | In a shared, world-writable directory, only a file's owner (or root) can delete/rename it. |

**SUID in the wild — `passwd`:** changing your password means writing to `/etc/shadow`, which only root can write. `/usr/bin/passwd` has the SUID bit set, so running it temporarily grants root's permissions for that process. In `ls -l` this shows as a lowercase `s` in the owner's execute slot: `-rwsr-xr-x`.

**Sticky bit in the wild — `/tmp`:** typically `drwxrwxrwt` (octal `1777`) — everyone can create files there, but the sticky bit (`t`) means only each file's own owner (or root) can delete or rename it, which is what stops one user from tampering with another user's temp files.

Setting a special bit combines its octal code with the standard 3-digit code:

```text
chmod 4755 script.sh        # SUID + 755        →  -rwsr-xr-x
chmod 1777 /shared_folder    # sticky + 777       →  drwxrwxrwt
chmod 2770 /project           # SGID + 770 (dirs)  →  drwxrws---
```

If the underlying execute bit isn't already set for that owner/group, the special bit shows as an uppercase `S`/`T` instead of lowercase — a sign the special bit is set but currently has no effect.

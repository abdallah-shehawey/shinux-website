---
title: 'TTY vs PTS: What''s the Real Difference?'
description: >-
  Kernel virtual consoles vs software-emulated pseudo-terminals, explained with
  a real-life analogy and a boot-to-shell flow.
date: 2026-07-05T00:00:00.000Z
tags:
  - terminal
  - systems
locale: en
draft: false
author: abdallah-shehawey
---

## What is TTY?

**TTY** originally stands for **Teletypewriter** — historically, physical machines used to interact with computers. The term survives in Linux to describe kernel-managed terminals.

In modern Linux, a TTY is a **virtual console** managed directly by the kernel. Each TTY represents an independent login session, and you switch between them with `Ctrl + Alt + F1` through `F6`. These map to devices like `/dev/tty1`, `/dev/tty2`, and so on.

Characteristics:

- Works without a graphical interface
- Available even if X11/Wayland crashes
- Ideal for system recovery and debugging
- Each TTY runs a login service, usually `getty`

Common use cases: logging in when the desktop environment fails, fixing display drivers, system maintenance and rescue mode.

## What is PTS?

**PTS** stands for **Pseudo-Terminal Slave** — a software-emulated terminal used by terminal emulators and remote connections.

A pseudo-terminal has two parts: **PTMX (master)**, controlled by a terminal emulator or SSH, and **PTS (slave)**, which behaves like a real terminal to programs. When you open a terminal window, the system allocates a new PTS device, e.g. `/dev/pts/0`, `/dev/pts/1`.

Characteristics:

- Created dynamically when needed
- Requires a terminal emulator or SSH session
- Fully emulates a real terminal interface
- Depends on user-space processes, not kernel virtual consoles

Common use cases: GNOME Terminal, Konsole, Alacritty, SSH connections, Docker attached terminals.

## Key differences in architecture

| Feature       | TTY               | PTS                    |
| -------------- | ------------------ | ------------------------ |
| Managed by    | Linux kernel        | User-space + kernel     |
| Creation      | Static (boot time)  | Dynamic (on demand)     |
| Needs GUI     | No                  | Yes (for local use)     |
| Stability     | Very high           | Depends on emulator      |
| Recovery safe | Yes                 | No (if GUI fails)       |

## Important commands

Check current terminal:

```bash
tty
```

List logged-in users:

```bash
who
```

Example output: `/dev/tty2` is a kernel TTY, `/dev/pts/1` is a pseudo-terminal.

## A real-life analogy

Imagine a big office building — your computer — with a security system and building rules acting as the Linux kernel. You have two ways to work inside it:

1. **Fixed desks in a control room** — like TTYs.
2. **Flexible coworking spaces with laptops** — like PTS.

### The fixed control-room desks (TTY)

The building has several fixed desks, each numbered. In Linux, these are the virtual consoles `/dev/tty1`, `/dev/tty2`, ... — you move between them with `Ctrl + Alt + F1..F6`.

They're always there as long as the kernel is running, don't depend on fancy equipment, and are what admins reach for when something goes wrong. If the fancy office network dies, you still have the secure control room.

### The flexible coworking laptops (PTS)

Now imagine an open-office space where people sit anywhere with laptops connecting to internal systems over the network. In Linux, the laptops are terminal emulators or SSH clients, and each time you open one, the system gives you a new virtual plug into the system: `/dev/pts/0`, `/dev/pts/1`, `/dev/pts/2`.

These are created only when needed and depend on software — a GUI for local terminals, or SSH/container runtime for remote sessions. If the GUI crashes, all these sessions disappear, but the control room (TTYs) keeps working.

### Side by side

| Real-Life Analogy                              | Linux Concept                         |
| ------------------------------------------------ | --------------------------------------- |
| Building rules + security                        | Linux kernel                           |
| Fixed control-room desks                          | TTY (`/dev/tty1`, `/dev/tty2`, ...)   |
| Laptops in a coworking area                       | PTS (`/dev/pts/0`, `/dev/pts/1`, ...) |
| Sit at a control-room desk                        | Switch TTY (`Ctrl+Alt+F2`)             |
| Open a laptop terminal                            | Open GNOME Terminal / SSH               |
| Desks exist even if the Wi-Fi goes down           | TTY works even if GUI/network is broken |
| Laptops are useless without the network           | PTS dies if the GUI/SSH session dies    |

### When you actually see them

Log in on a black full-screen console → you're on a TTY (`tty` shows `/dev/tty2`). Open GNOME Terminal or Konsole → you're on a PTS (`tty` shows `/dev/pts/1`).

So: **TTY = fixed console inside the OS**, **PTS = software-emulated console via a program**.

## Process flow: kernel → getty → shell → GUI → terminal

1. **Boot and kernel** — the bootloader (GRUB, etc.) loads the Linux kernel, which initializes hardware, mounts the root filesystem, and starts PID 1 (usually `systemd`).

   ```text
   [Power On] → [Bootloader] → [Linux Kernel] → [PID 1 (systemd)]
   ```

2. **systemd starts getty on TTYs** — `getty@tty1.service`, `getty@tty2.service`, etc., each attached to a device like `/dev/tty1`. `getty` displays `login:`, waits for a username, and hands control to `login`/PAM.

3. **Login and shell on TTY** — once authenticated, `getty` + `login` start your shell (bash, zsh) on that TTY. You're now logged in directly talking to the kernel via the TTY device.

4. **Starting the GUI from a TTY** — you might run `startx`, or a display manager (`gdm`, `sddm`, `lightdm`) is started by systemd, showing the graphical login screen and starting your desktop session after login.

5. **Opening a terminal emulator (creating a PTS)** — inside the GUI, opening GNOME Terminal asks the kernel for a pseudo-terminal pair: a master handled by the terminal emulator, and a slave device `/dev/pts/N` for programs to use. The emulator starts your shell attached to that PTS.

   Keystrokes flow: terminal emulator → PTY master → PTY slave → shell. Output flows back the same way in reverse, drawn on your screen.

## Summary

- **TTY:** direct login on kernel virtual consoles — exists even without a GUI.
- **PTS:** terminal sessions inside a GUI or over the network (SSH), using pseudo-terminals created on demand.

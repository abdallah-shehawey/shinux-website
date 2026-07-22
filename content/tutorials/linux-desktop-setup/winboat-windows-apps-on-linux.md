---
title: Running Windows Applications on Linux Seamlessly with WinBoat (Docker)
description: >-
  How WinBoat uses Docker containers to run Windows applications like Microsoft
  Office and Photoshop directly on your Linux desktop with seamless menu integration.
order: 25
tags:
  - linux
  - windows
  - docker
  - desktop
draft: false
author: abdallah-shehawey
---

**WinBoat** is an open-source project designed to run Windows applications seamlessly on Linux desktops using Docker containers instead of traditional virtual machines.

Rather than launching a isolated desktop environment in a separate window, WinBoat runs Windows in a lightweight container in the background and publishes installed Windows applications directly into your Linux application menu.

---

## Key Features

- **Seamless Desktop Integration**: Windows apps appear in your Linux launcher/menu alongside native applications.
- **Docker-Powered Performance**: Uses containerized virtualization for reduced overhead compared to heavy full-system virtual machines.
- **One-Click Launch**: Clicking an app shortcut triggers the background container and opens the application window directly on your Linux desktop.
- **Beta Stage**: Actively developing with rapid improvements, though minor bugs may occur.

---

## Prerequisites

Before setting up WinBoat, ensure your Linux system has:

1. **Docker Installed & Running**:
   ```bash
   sudo apt update
   sudo apt install docker.io -y
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER
   ```
2. **KVM Virtualization Enabled**:
   Verify KVM support:
   ```bash
   lsmod | grep kvm
   ```

---

## Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/winboat/winboat.git
   cd winboat
   ```

2. **Run Docker Container Setup**:
   Follow the setup script provided in the repository to initialize the Windows container environment:
   ```bash
   docker compose up -d
   ```

3. **Access App Launcher**:
   Once configured, shortcuts for installed Windows software (e.g. Microsoft Office, Photoshop) will be added to your desktop application menu automatically.

---

## Official Links

- **Official Website**: 👉 [https://www.winboat.app/](https://www.winboat.app/)
- **Official Repository**: 👉 [https://github.com/winboat/winboat](https://github.com/winboat/winboat)

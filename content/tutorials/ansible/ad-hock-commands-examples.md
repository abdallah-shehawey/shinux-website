---
title: Ansible Ad-hoc Commands Guide
description: >-
  Ad-Hoc commands are quick, "one-liner" tasks used to perform a single action
  on multiple managed nodes without writing a full Playbook. They are great for
  quick checks, updates, or reboots.
order: 4
tags:
  - devops
draft: false
author: abdallah-shehawey
---
## What are Ad-hoc Commands?

Ad-Hoc commands are quick, "one-liner" tasks used to perform a single action on multiple managed nodes without writing a full Playbook. They are great for quick checks, updates, or reboots.

**Basic Syntax:**

```text
ansible [group/host] -m [module] -a "[arguments]" -b
```

### Key Flags Breakdown

- **`-m [module]`**: Defines which module to run (e.g., `ping`, `yum`, `service`). If omitted, it defaults to `command`.

- **`-a "[options]"`**: Provides arguments to the module (e.g., package name, service state).

- **`-b` (Become)**: Runs the command with `sudo` privileges (essential for installing packages or changing system files).

- **`-i [inventory]`**: Specifies the inventory file path (optional if defined in `ansible.cfg`).

## Connectivity & System Information

### Ping All Hosts

Checks if Ansible can connect to the hosts via SSH and find the Python interpreter.

```text
ansible all -m ping
```

- **Why important?**: First step to verify your inventory and keys are working.

### Check System Uptime

```text
ansible all -m command -a "uptime"
```

- **Module `command`**: The default module. It runs simple commands but **doesn't support** variables like `$HOME` or operations like `|` (pipe) or `>`.

### Gather Facts (system Details)

Collects detailed info (IP, OS version, CPU, Memory) about remote hosts.

```text
ansible all -m setup
```

**Filter Specific Facts:** To see only specific info (e.g., only IP addresses):

```ini
ansible all -m setup -a "filter=ansible_default_ipv4.address"
```

- **Argument `filter`**: Limits the massive output to just what you need.

## Package Management (yum/dnf/apt)

### Install a Package

Installs Nginx using the `yum` module.

```ini
ansible all -m yum -a "name=nginx state=present" -b
```

- **`name=nginx`**: The package name.

- **`state=present`**: Ensures the package is installed. (Use `state=latest` to update it).

- **`-b`**: **Crucial.** You cannot install packages without root/sudo access.

### Remove a Package

```ini
ansible all -m yum -a "name=httpd state=absent" -b
```

- **`state=absent`**: The standard Ansible way to say "Uninstall" or "Delete".

### Upgrade All Packages

```ini
ansible all -m yum -a "name=* state=latest" -b
```

- **`name=*`**: Selects all packages.

- **`state=latest`**: Updates them to the newest version available.

## Service Management

### Start & Enable a Service

Starts Nginx and ensures it runs on boot.

```ini
ansible all -m service -a "name=nginx state=started enabled=yes" -b
```

- **`state=started`**: Starts the service if it's stopped.

- **`enabled=yes`**: Runs `systemctl enable`, checking the service starts after reboot.

### Restart a Service

Useful after configuration changes.

```ini
ansible all -m service -a "name=nginx state=restarted" -b
```

### Stop a Service

```ini
ansible all -m service -a "name=nginx state=stopped" -b
```

## File & Directory Management

### Create a Directory

```ini
ansible all -m file -a "path=/tmp/testdir state=directory mode=0755"
```

- **`state=directory`**: Tells Ansible to create a folder, not a file.

- **`mode=0755`**: Sets Linux permissions (rwxr-xr-x).

### Create an Empty File (touch)

```ini
ansible all -m file -a "path=/tmp/demo.txt state=touch"
```

- **`state=touch`**: Updates timestamp if file exists, or creates an empty one if it doesn't.

### Copy File to Remote Hosts

Uploads a file from your Controller to the Managed Nodes.

```ini
ansible all -m copy -a "src=./local_file.txt dest=/tmp/remote_file.txt"
```

- **`src`**: Path on the **Controller** (your machine).

- **`dest`**: Path on the **Remote** (managed node).

### Fetch File From Remote Hosts

Downloads a file from Managed Nodes to your Controller (Backup).

```ini
ansible all -m fetch -a "src=/etc/hosts dest=./backups flat=yes"
```

- **`flat=yes`**: Saves the file directly in the destination folder without creating a directory tree for every host.

### Change Permissions/ownership

```ini
ansible all -m file -a "path=/tmp/demo.txt owner=ec2-user group=ec2-user mode=0644" -b
```

- **Why `-b`?**: Changing ownership usually requires root if you don't own the file.

### Delete a File or Directory

```ini
ansible all -m file -a "path=/tmp/file.txt state=absent"
```

- **`state=absent`**: Recursively deletes directories or unlinks files.

## File Content Modification (lineinfile)

### Append a Line

Adds a line to a file if it doesn't exist.

```ini
ansible all -m lineinfile -a "path=/etc/motd line='Welcome to the server!'" -b
```

### Replace a Line (regex)

Search for a line and replace it (e.g., Disabling Root Login in SSH).

```ini
ansible all -m lineinfile -a "path=/etc/ssh/sshd_config regexp='^PermitRootLogin' line='PermitRootLogin no'" -b
```

- **`regexp`**: Regular expression to find the line.

- **`line`**: The text that should replace the found line.

## User & Group Management

### Create a Group

```ini
ansible all -m group -a "name=devops state=present" -b
```

### Create a User

```ini
ansible all -m user -a "name=devops state=present" -b
```

### Add User to a Group

Adds user `devops` to group `wheel` (sudoers) without removing them from other groups.

```ini
ansible all -m user -a "name=devops groups=wheel append=yes" -b
```

- **`append=yes`**: **Very Important!** If you forget this, the user will be removed from all other groups and _only_ be in `wheel`.

## Shell & Script Execution

### Shell Module (complex Commands)

Use `shell` when you need pipes `|`, redirects `>`, or wildcards `*`.

```bash
ansible all -m shell -a "ls /var/log/*.log"
```

- **Difference**: The `command` module would fail here because it doesn't understand `*`.

### Script Module (run Local Scripts Remotely)

Executes a script located on your **Controller** machine on the **Remote** nodes. It copies it automatically, runs it, and then deletes it.

**1. Create the script locally (`deploy.sh`):**

```bash
#!/bin/bash
sudo yum install -y httpd
sudo systemctl start httpd
sudo systemctl enable httpd
```

**2. Run it via Ansible:**

```text
ansible all -m script -a "./deploy.sh"
```

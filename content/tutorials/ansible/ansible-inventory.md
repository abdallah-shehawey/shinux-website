---
title: Ansible Inventory Guide (hosts)
description: >-
  The inventory is the "Source of Truth" for Ansible. It tells Ansible which
  servers to manage and how to communicate with them.
order: 2
tags:
  - devops
draft: false
author: abdallah-shehawey
---
## What is an Inventory?

The inventory is the "Source of Truth" for Ansible. It tells Ansible **which** servers to manage and **how** to communicate with them.

Inventories can be:

- **Static:** A text file (INI or YAML) where you manually list servers (Focus of this guide).

- **Dynamic:** Scripts or plugins that fetch server lists automatically from Cloud Providers (AWS, Azure, etc.).

## Basic Static Inventory Structure

The most common format is **INI**. You can list IP addresses or Hostnames.

### Simple List (ungrouped)

```text
192.168.1.50
192.168.1.51
server1.company.com
```

### Grouped Hosts

Grouping allows you to run automation on specific sets of servers (e.g., only Webservers or only Databases).

```json
[web]
192.168.1.10
192.168.1.11

[db]
192.168.1.20
```

## Connection Parameters (the "cheat Sheet")

You can define how Ansible connects to each host using special variables directly in the inventory line.

|Parameter|Description|Example|
|---|---|---|
|`ansible_host`|Real IP/Hostname if different from the alias.|`web1 ansible_host=10.0.0.5`|
|`ansible_user`|The SSH user to login with.|`ansible_user=ec2-user`|
|`ansible_ssh_private_key_file`|Path to the private key (`.pem`).|`ansible_ssh_private_key_file=~/key.pem`|
|`ansible_port`|SSH port (if not 22).|`ansible_port=2222`|
|`ansible_connection`|Connection type (ssh, winrm, local).|`ansible_connection=local`|
|`ansible_ssh_pass`|SSH Password (if not using keys - _Not Recommended_).|`ansible_ssh_pass=Secret123`|

### Example with Parameters (inline)

```ini
[web]
# Syntax: <IP> <Parameter1> <Parameter2> ...
10.0.1.5 ansible_user=ec2-user ansible_ssh_private_key_file=~/ansible-project/your-key.pem
10.0.1.6 ansible_user=ec2-user ansible_ssh_private_key_file=~/ansible-project/your-key.pem
```

## Optimization: Group Variables

Instead of repeating the user and key path for every single line (like above), you can define variables for the **entire group**.

```ini
[web]
10.0.1.5
10.0.1.6

# Set variables for all hosts in the [web] group
[web:vars]
ansible_user=ec2-user
ansible_ssh_private_key_file=~/ansible-project/your-key.pem
```

_Now, both IPs automatically inherit the user and key settings._

## Nested Groups (groups of Groups)

You can create a "Super Group" that contains other groups using the `:children` suffix. This is useful if you want to target your entire application stack (Web + DB) at once.

**Syntax:**

```ini
[web]
<node1_private_ip> ansible_user=ec2-user ansible_ssh_private_key_file=~/ansible-project/your-key.pem

[db]
<node2_private_ip> ansible_user=ec2-user ansible_ssh_private_key_file=~/ansible-project/your-key.pem

# "mysite" includes both "web" and "db"
[mysite:children]
web
db
```

**Usage:**

- Target Web only: `ansible web -m ping`

- Target DB only: `ansible db -m ping`

- Target Everything: `ansible mysite -m ping`

## Testing Your Inventory

Once your file is created, use the `ansible` ad-hoc command to verify Ansible can see the groups.

**List all hosts in the inventory:**

```text
ansible all --list-hosts
```

**Ping a specific group:**

```text
ansible web -m ping
```

**Ping a parent group (Children):**

```text
ansible mysite -m ping
```

## Default Location

By default, Ansible looks for `/etc/ansible/hosts`. However, in most projects, we create a local `hosts` file and point to it in `ansible.cfg`:

**ansible.cfg:**

```ini
[defaults]
inventory = ./hosts
```

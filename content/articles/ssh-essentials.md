---
title: "A Comprehensive Guide to SSH"
description: "Keys, config aliases, hardening sshd, and the file-transfer tools (scp, rsync, curl) that pair with an SSH session."
date: 2026-07-01
tags: [ssh, security, networking]
locale: en
draft: false
---

An in-depth guide to SSH (Secure Shell): generating and managing keys, connecting to servers securely, and setting up robust authentication. Covers public/private key concepts, key types, hardening, and the tools that pair well with an SSH session.

## 1. What is SSH?

SSH is a protocol that securely connects to remote systems over an untrusted network. It uses cryptographic techniques to ensure data confidentiality, integrity, and secure user authentication — commonly used for remote administration, secure file transfers, and tunneling other protocols through an encrypted connection.

## 2. The science behind SSH

SSH uses a client-server model. When you connect, a "handshake" occurs to establish trust.

- **Encryption:** data transmitted between client and server is encrypted, preventing eavesdroppers from intercepting information.
- **Authentication:** SSH supports passwords, public key authentication, and two-factor authentication (2FA).
- **Integrity:** cryptographic checksums and MACs ensure data isn't tampered with in transit.

## 3. Public and private key concepts

SSH key pairs are the industry standard for secure access.

- **Public key:** shared openly, placed on remote systems in `authorized_keys`. Think of it as the lock.
- **Private key:** kept secret on the client machine, used to decrypt data encrypted with the public key. Think of it as the key.

How they secure connections: a key pair is generated (e.g. with `ssh-keygen`), the public key is shared with the server, and when connecting, the server issues a challenge that only the holder of the corresponding private key can solve.

## 4. Types of SSH keys

- **Ed25519 (recommended):** fastest performance, very strong security, small key sizes — the modern standard.
- **RSA:** widely supported, the "classic" choice. Use 3072 bits or higher (4096 preferred).
- **ECDSA:** elliptic curves, strong security with smaller key sizes.
- **DSA:** deprecated due to security concerns — do not use.

## 5. Generating SSH keys

Modern standard (Ed25519):

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Legacy standard (RSA):

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

- `-t`: algorithm (ed25519 or rsa)
- `-b 4096`: bit size (RSA only)
- `-C`: a comment (typically your email) to help identify the key later

Follow the prompts to set the file location (default `~/.ssh/id_...`) and optionally a passphrase.

## 6. Installing SSH

```bash
# Ubuntu and Debian
sudo apt update && sudo apt install openssh-server

# Red Hat and CentOS
sudo yum install openssh-server

# Fedora
sudo dnf install openssh-server

# Arch Linux
sudo pacman -S openssh
```

## 7. Connecting to a server

```bash
ssh username@hostname_or_ip
```

Example:

```bash
ssh root@192.168.1.50
```

On the first connection you'll be asked to accept the server's fingerprint — type `yes`. Use `-p <port>` if the server listens on a non-standard port.

## 8. The SSH config file (time saver)

Instead of remembering IPs and usernames, configure aliases:

```bash
nano ~/.ssh/config
```

```text
# Alias for a web server
Host my-web-server
    HostName 203.0.113.10
    User admin
    IdentityFile ~/.ssh/id_ed25519

# Alias for a development box on a custom port
Host dev-box
    HostName 192.168.1.50
    User developer
    Port 2222
```

Secure the file (SSH may ignore it if it's readable by others):

```bash
chmod 600 ~/.ssh/config
```

Connect using the alias:

```bash
ssh my-web-server
```

## 9. Sharing and using SSH keys

To log in without a password, place your public key on the server.

**Method 1 — the easy way:**

```bash
ssh-copy-id username@server_ip
# or specifying a key
ssh-copy-id -i ~/.ssh/id_ed25519.pub username@server_ip
```

**Method 2 — the pipe way:**

```bash
cat ~/.ssh/id_ed25519.pub | ssh username@server_ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**Method 3 — fully manual:** display the key locally with `cat ~/.ssh/id_ed25519.pub`, copy it, SSH into the server, then append it to `~/.ssh/authorized_keys` with your editor of choice.

Fix permissions if authentication fails:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## 10. Setting up SSH key authentication

Test it:

```bash
ssh username@server_ip
```

You should log in without a password (unless you set a passphrase). To disable password auth entirely (recommended), edit `/etc/ssh/sshd_config` on the server:

```bash
PubkeyAuthentication yes
PasswordAuthentication no
```

Then restart SSH: `sudo systemctl restart ssh`.

## 11. Transferring data & browsing

### scp — best for simple, one-off transfers

```bash
# upload
scp file.txt username@server_ip:/path/to/destination

# download
scp username@remote_ip:/var/www/html/file.txt /local/destination/

# recursive
scp -r /local/folder username@remote_ip:/remote/folder
```

### rsync — better for large directories or unstable connections

`rsync` only transfers the differences between files and can resume interrupted transfers.

```bash
rsync -avz /local/path username@server_ip:/remote/path
```

- `-a`: archive mode (permissions, timestamps, symlinks)
- `-v`: verbose
- `-z`: compress during transfer

Resume a failed large transfer:

```bash
rsync -avz --partial --progress big_file.iso username@server_ip:/remote/path/
```

### wget and curl — download while already logged into a server

```bash
wget https://example.com/software.zip
wget -O installer.zip https://example.com/software-v1.2.3.zip

curl -O https://example.com/software.zip
curl -o installer.zip https://example.com/software.zip
```

### lynx and w3m — terminal web browsers

Useful when stuck in a terminal but need to visit a page.

```bash
sudo apt install lynx
lynx https://example.com
```

```bash
sudo apt install w3m
w3m https://example.com
```

## 12. Advanced configuration & security best practices

1. **Disable root login** in `/etc/ssh/sshd_config`:

   ```bash
   PermitRootLogin no
   ```

2. **Change the default port** from `Port 22` to something arbitrary (e.g. `2244`) to reduce noise from automated bots.
3. **Client keep-alive** — add to your local `~/.ssh/config`:

   ```bash
   Host *
       ServerAliveInterval 60
   ```

4. **Two-factor authentication** — install `libpam-google-authenticator` and configure PAM to require a code in addition to your key or password.

## 13. Centralized SSH key management

As environments scale, managing keys manually becomes unfeasible:

- Inventory and automated discovery of active keys
- Key rotation policies to limit the window of compromise
- SSH Certificate Authorities instead of static keys, issuing credentials that expire automatically

## 14. Conclusion

Managing SSH from the command line provides unparalleled control over your network's security. Robust key-based authentication and sensible hardening go a long way toward reducing your attack surface.

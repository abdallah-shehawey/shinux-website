---
title: Install My Tools with One Command — The shinux Repository
description: >-
  A signed dnf and apt repository you add once, then install my command-line
  tools like any distribution package — with man pages, tab completion,
  dependencies, and real upgrades through dnf upgrade or apt upgrade.
date: 2026-08-19T00:00:00.000Z
tags:
  - fedora
  - ubuntu
  - packaging
  - rpm
  - deb
  - tooling
locale: en
draft: false
author: abdallah-shehawey
---

For a long time my scripts lived the way most people's scripts live: copied into
`~/.local/bin`, made executable, and forgotten until one of them broke on a new
machine. Updating meant remembering which ones I had, where they came from, and
whether the copy on this laptop was the one with the fix.

That is exactly the problem a package repository solves, so I built one.
**shinux** is a signed repository for both `dnf` and `apt`. You add it once, and
after that my tools install, upgrade and uninstall like anything that shipped
with your distribution.

```bash
sudo dnf install vidtime
sudo apt install vidtime
```

## Add the repository

One command, whichever distribution you are on:

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/install.sh | sudo sh
```

It detects whether you have `dnf` or `apt`, imports the signing key, and writes
the repository definition. If you would rather not pipe a script into a shell —
a reasonable instinct — [read it first](https://abdallah-shehawey.github.io/shinux/install.sh),
or do it by hand.

### By hand, Fedora / RHEL / CentOS / Rocky / Alma

```bash
sudo dnf install -y https://abdallah-shehawey.github.io/shinux/rpm/shinux-release-1.0-1.noarch.rpm
```

That single package drops `/etc/yum.repos.d/shinux.repo` and the public key into
`/etc/pki/rpm-gpg/`. The first time dnf uses the repository it will ask you to
trust the key — that prompt is the point, and you should read the fingerprint
before saying yes.

### By hand, Debian / Ubuntu / Mint

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/shinux-keyring.deb \
  -o /tmp/shinux-keyring.deb
sudo apt install -y /tmp/shinux-keyring.deb
sudo apt update
```

The keyring package installs `/etc/apt/sources.list.d/shinux.sources` with a
`Signed-By:` line pinning the key, so this key can only ever vouch for this one
repository and nothing else on your system.

## What is in it

Everything below is a **separate package**. Install only what you want, or take
the lot with `shinux-scripts`. Every command has a man page, `--help`,
`--version`, and tab completion for both bash and zsh, and pulls in its own
dependencies — `dnf install meet` brings `fzf` and `xdg-utils` with it.

### `vidtime` — how long is all this video?

Reads durations with `ffprobe` and prints them with a total. Built for the
question "how many hours is this course?".

```bash
vidtime lecture01.mp4
vidtime -t -r ~/Videos/course     # just the total, whole directory
```

A file that turns out not to be media is reported and skipped; you still get the
total for everything that worked.

### `padnum` — make numbered files sort correctly

`1 intro.mp4`, `2 setup.mp4` … `10 wrap.mp4` sort as 1, 10, 2 in every file
manager on earth. `padnum` zero-pads the leading numbers to a common width and
leaves the rest of the name alone — Arabic text, spaces and dots all survive
untouched.

```bash
padnum -n        # preview
padnum           # do it
padnum --undo    # change your mind
```

The width is detected from the largest number present, and every run is
recorded so you can undo up to ten of them.

### `hashnum` — move a `#N` tag to the front

Exports and downloads love names like `Some Long Title #12.mp4`, which sorts by
title instead of by number. `hashnum` lifts the tag to the front:

```
Some Long Title #12.mp4   ->   #12 Some Long Title.mp4
```

It tidies the whitespace the tag leaves behind and never overwrites an existing
file. Chain it with `padnum` when the numbers also need padding:

```bash
hashnum && padnum
```

### `meet` — open a saved meeting by name

Keeps a short list of meeting URLs under names you choose, so a recurring call
is one word instead of a bookmark hunt.

```bash
meet --add standup https://meet.google.com/abc-defg-hij
meet standup
meet                      # interactive picker
```

With `fzf` installed you get a fuzzy picker; without it, a plain numbered menu.
Nothing about it is Google-specific — any URL works.

### `dlup` — download, upload, delete, repeat

Downloads each URL with `yt-dlp`, pushes it to an `rclone` remote, and removes
the local copy before starting the next one, so a long list of recordings never
fills your disk.

```bash
dlup -r gdrive:Recordings https://example.com/video
dlup -r gdrive:Recordings -c ~/cookies.txt -f links.txt
```

Each URL is staged in its own directory. That matters more than it sounds: the
obvious implementation picks "the newest file in the download folder", which
guesses wrong the moment a download produces two files.

### `antigravity-update` — keep Antigravity IDE current

Finds where the IDE is installed rather than assuming a path — from the launcher
on your `PATH`, from the installed desktop entry, then from the usual prefixes —
and updates it in place. If it is not installed at all, it says so and asks
whether to install it and where.

```bash
antigravity-update --check     # is there a newer build?
antigravity-update             # install it
antigravity-update --desktop   # just rebuild the launcher and icon
```

Afterwards it rebuilds the desktop entry, the icon and the `bin` symlinks, so
the application shows up properly in the overview instead of as a nameless
generic window. `sudo` is only used when the install directory genuinely is not
yours to write.

### `update-every-thing` — one command for the whole machine

Runs every update the system needs in one pass and prints a single summary at
the end. It detects `dnf`, `yum` or `apt` and uses the right commands for each:
the two families need genuinely different handling, not the same command with a
different name.

```bash
update-every-thing
update-every-thing -c 3 --with-nvidia
```

Nothing aborts the run. A step that fails is retried a bounded number of times
and then given up on, so you always reach the end and get one report instead of
discovering a failure three commands later.

NVIDIA packages are left alone by default, because replacing the driver under a
running session can break it. On rpm systems that is an `--exclude`; apt has no
equivalent, so the packages are held for the length of the run and released
afterwards — and anything that was *already* held stays held, because those are
not ours to release.

### `shinux-scripts` — all of the above

```bash
sudo dnf install shinux-scripts
sudo apt install shinux-scripts
```

A metapackage with no files of its own. Removing it leaves the commands
installed; remove those by name.

## Updating

This is the part that makes it a repository rather than a download page. When I
publish a new version, you get it the same way you get everything else:

```bash
sudo dnf upgrade          # or: sudo apt update && sudo apt upgrade
```

Or just run `update-every-thing`, which does that along with everything else.

dnf re-checks the repository after six hours, or immediately with
`sudo dnf --refresh upgrade`. apt checks on the next `apt update`. Older versions
stay in the repository, so `dnf downgrade` and version pinning both work.

## Removing it

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/uninstall.sh | sudo sh
```

That removes the repository and stops trusting its key, but leaves anything you
installed in place. To take the packages with it:

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/uninstall.sh | sudo sh -s -- --purge
```

By hand, on Fedora:

```bash
sudo dnf remove shinux-release
sudo rpm -e $(rpm -qa 'gpg-pubkey*' \
  --qf '%{NAME}-%{VERSION}-%{RELEASE} %{SUMMARY}\n' | grep -i shinux | cut -d' ' -f1)
```

and on Debian or Ubuntu:

```bash
sudo apt purge shinux-archive-keyring
sudo rm -f /etc/apt/sources.list.d/shinux.sources /etc/apt/keyrings/shinux.gpg
sudo apt update
```

## If tab completion does not work in zsh

Every package installs a bash completion *and* a native zsh one. If completion
still does nothing in zsh, the usual causes are:

- **The shell has not noticed the new binary yet.** zsh caches the command
  table; run `rehash` or open a new shell.
- **`compinit` has not run.** Your `.zshrc` needs `autoload -Uz compinit &&
  compinit` for any completion to work at all.
- **An old `compctl` registration is shadowing it.** `compctl` is the previous
  completion system and takes precedence over the modern one. If you have
  something like `compctl -K _meet_list meet` left over in your `.zshrc`, it
  will win over the completion the package installs. Remove it, or guard it:

  ```zsh
  if [[ ! -e /usr/share/zsh/site-functions/_meet ]]; then
      compctl -K _meet_list meet
  fi
  ```

## A note on trust

Adding someone's package repository means letting them install software on your
machine as root. That is a real decision, and it should not be a casual one — for
mine or for anyone's.

What I can offer in return is that everything is verifiable. Every package is
GPG-signed and so is the repository metadata: the dnf configuration sets both
`gpgcheck=1` and `repo_gpgcheck=1`, and the apt sources entry pins the key with
`Signed-By:` so it cannot vouch for anything else. The packages are built and
signed from a public repository, and the source of every script in them is right
there next to the packaging.

The repository lives at
[abdallah-shehawey.github.io/shinux](https://abdallah-shehawey.github.io/shinux/),
and the source is on [GitHub](https://github.com/abdallah-shehawey/shinux).

---
title: Install My Tools with One Command — The shinux Repository
description: >-
  A signed dnf and apt repository you add once, then install my command-line
  tools like any distribution package — with man pages, tab completion,
  dependencies, and real upgrades through dnf upgrade or apt upgrade.
date: 2026-08-19T00:00:00.000Z
tags:
  - linux
  - fedora
  - ubuntu
  - packaging
  - rpm
  - deb
  - apt
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

It lives at
[abdallah-shehawey.github.io/shinux](https://abdallah-shehawey.github.io/shinux/),
and the source is on [GitHub](https://github.com/abdallah-shehawey/shinux). If a
tool misbehaves on your distribution, or you want one of these to do something
it does not,
[open an issue](https://github.com/abdallah-shehawey/shinux/issues) — knowing
which distributions people actually run this on is half of what keeps it
working.

## Add the repository

One command, whichever distribution you are on:

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/install.sh | sudo sh
```

It detects whether you have `dnf`, `yum` or `apt`, trusts the signing key, and
writes the repository definition. If you would rather not pipe a script into a
shell — a reasonable instinct —
[read it first](https://abdallah-shehawey.github.io/shinux/install.sh): it is
forty lines, and importing the key before adding the repository is the only part
that matters, because it is what keeps your first install from stopping to ask
about it.

## Check that it worked

The repository is now an ordinary one, so the ordinary checks apply:

```bash
dnf repolist | grep shinux        # Fedora
apt policy | grep shinux          # Debian / Ubuntu
```

There is also a package whose entire job is to prove the path works end to end:

```bash
sudo dnf install hello-shinux     # or: sudo apt install hello-shinux
hello-shinux
```

```
Hello from the Shinux repository!
version : 1.0.0
host    : Linux 7.1.8-200.fc44.x86_64 x86_64
distro  : Fedora Linux 44 (Workstation Edition)
```

If that prints, then the key was trusted, the signed metadata verified, and a
package resolved and installed from the repository — every step that can go
wrong, checked in one command. Nothing depends on it, so
`dnf remove hello-shinux` once you are satisfied.

To see everything the repository offers:

```bash
dnf repoquery --repo shinux                  # Fedora
apt list --all-versions '?origin(shinux)'    # Debian / Ubuntu, apt 2.0+
```

## What is in it

Everything below is a **separate package**. Install only what you want, or take
the lot with `shinux-scripts`. Every command has a man page, `--help`,
`--version`, and tab completion for both bash and zsh, and declares its own
dependencies — so the package manager fetches whatever the script needs instead
of the script failing halfway through because something was not installed.

| Command | What it does | Brings in |
|---|---|---|
| [`vidtime`](#vidtime--how-long-is-all-this-video) | How long media files run, and their total | `ffmpeg` |
| [`padnum`](#padnum--make-numbered-files-sort-correctly) | Zero-pad numeric filename prefixes, with undo | `sed`, `awk`, `less` |
| [`hashnum`](#hashnum--move-a-n-tag-to-the-front) | Move a `#N` tag to the front of a filename | — |
| [`meet`](#meet--open-a-saved-meeting-by-name) | Open a saved meeting link by name | `xdg-utils`, and `fzf` if you let it |
| [`dlup`](#dlup--download-upload-delete-repeat) | Download with yt-dlp, upload to an rclone remote | `yt-dlp`, `rclone` |
| [`antigravity-update`](#antigravity-update--keep-antigravity-ide-current) | Update a local Antigravity IDE install | `curl`, `jq`, `rsync` |
| [`update-every-thing`](#update-every-thing--one-command-for-the-whole-machine) | Every update the machine needs, in one pass | `fwupd`, `flatpak` if present |
| [`shinux-scripts`](#shinux-scripts--all-of-the-above) | Metapackage pulling in all of the above | all seven |

`fzf`, `fwupd` and `flatpak` are *recommendations* rather than hard
requirements. dnf and apt install them by default, but neither tool needs
them — `meet` falls back to a plain numbered menu, and `update-every-thing`
skips any step it has no tool for.

## `vidtime` — how long is all this video?

Reads durations with `ffprobe` and prints them with a total. Built for the
question "how many hours is this course?".

```bash
vidtime lecture01.mp4
vidtime -t -r ~/Videos/course     # just the total, whole directory
vidtime -s *.mkv                  # raw seconds, for feeding to something else
```

A file that turns out not to be media is reported and skipped; you still get the
total for everything that worked. There is a longer write-up of the script
itself in [vidtime: A Tiny CLI Tool for Video Durations](/articles/vidtime-command).

## `padnum` — make numbered files sort correctly

`1 intro.mp4`, `2 setup.mp4` … `10 wrap.mp4` sort as 1, 10, 2 in every file
manager on earth. `padnum` zero-pads the leading numbers to a common width and
leaves the rest of the name alone — Arabic text, spaces and dots all survive
untouched.

```bash
padnum -n              # preview
padnum                 # do it
padnum --ext mp4       # only one extension
padnum --sep " - "     # choose what separates the number from the name
padnum --undo          # change your mind
padnum --history       # what it did, oldest to newest
```

The width is detected from the largest number present — or fixed with
`-p N` — and every run is recorded so you can undo up to ten of them. It works
on the current directory by default, or on one you name. Walked through in
[Smart File Renaming with padnum & rename.sh](/tutorials/scripts/smart-file-renaming-and-padnum).

## `hashnum` — move a `#N` tag to the front

Exports and downloads love names like `Some Long Title #12.mp4`, which sorts by
title instead of by number. `hashnum` lifts the tag to the front:

```
Some Long Title #12.mp4   ->   #12 Some Long Title.mp4
```

It tidies the whitespace the tag leaves behind and never overwrites an existing
file. `-n` previews, exactly like `padnum`. Chain the two when the numbers also
need padding:

```bash
hashnum && padnum
```

This is the script that used to be called `rename.sh`, so it appears under that
name in the [renaming lesson](/tutorials/scripts/smart-file-renaming-and-padnum).

## `meet` — open a saved meeting by name

Keeps a short list of meeting URLs under names you choose, so a recurring call
is one word instead of a bookmark hunt.

```bash
meet --add standup https://meet.google.com/abc-defg-hij
meet standup
meet                      # interactive picker
meet --list               # everything you have saved
meet --print standup      # print the URL instead of opening it
```

With `fzf` installed you get a fuzzy picker; without it, a plain numbered menu.
The list is a plain text file of `NAME URL` pairs, so it is trivial to edit,
sync or back up by hand. Nothing about it is Google-specific — any URL works.
More on the design in
[Google Meet CLI Launcher (meet)](/tutorials/scripts/google-meet-cli-launcher).

## `dlup` — download, upload, delete, repeat

Downloads each URL with `yt-dlp`, pushes it to an `rclone` remote, and removes
the local copy before starting the next one, so a long list of recordings never
fills your disk.

```bash
dlup -r gdrive:Recordings https://example.com/video
dlup -r gdrive:Recordings -c ~/cookies.txt -f links.txt
dlup -n -r gdrive:Recordings -f links.txt    # rehearsal: transfers nothing
```

Each URL is staged in its own directory. That matters more than it sounds: the
obvious implementation picks "the newest file in the download folder", which
guesses wrong the moment a download produces two files.

A config file saves you retyping the remote every time — it takes
`remote`, `cookies`, `dir`, `jobs` and `retries` as `key=value` lines, and
command-line options still win over it. `-k` keeps the local copy when you want
both. The full story is in
[Automating Meeting Downloads and Cloud Uploads](/tutorials/scripts/automating-meeting-downloads-and-cloud-uploads).

## `antigravity-update` — keep Antigravity IDE current

Finds where the IDE is installed rather than assuming a path — from the launcher
on your `PATH`, from the installed desktop entry, then from the usual prefixes —
and updates it in place. If it is not installed at all, it says so and asks
whether to install it and where.

```bash
antigravity-update --check     # is there a newer build?
antigravity-update             # install it
antigravity-update --desktop   # just rebuild the launcher and icon
antigravity-update -d ~/apps/antigravity   # skip discovery, use this path
```

Afterwards it rebuilds the desktop entry, the icon and the `bin` symlinks, so
the application shows up properly in the overview instead of as a nameless
generic window. `sudo` is only used when the install directory genuinely is not
yours to write.

`--check` is built for scripts: it exits `3` when an update is available and `4`
when nothing is installed, so a cron job or another script can branch on it
without parsing any output. That is exactly how `update-every-thing` decides
whether to mention the IDE at all. Background in
[Antigravity IDE Auto-Updater Script](/tutorials/scripts/antigravity-ide-auto-updater).

## `update-every-thing` — one command for the whole machine

Runs every update the system needs in one pass and prints a single summary at
the end. It detects `dnf`, `yum` or `apt` and uses the right commands for each:
the two families need genuinely different handling, not the same command with a
different name.

```bash
update-every-thing
update-every-thing -c 3 --with-nvidia
```

"Everything" means, in order: the Antigravity IDE if it is installed, the system
packages, firmware through `fwupd`, Flatpak, Snap where the distribution has it,
the Ubuntu Pro security status on machines that carry it, NVIDIA drivers only if
you asked for them, a listing of GNOME extensions with updates waiting, and
finally the cleanup — orphans and the package caches. Steps for things you do
not have are not printed at all, so the summary stays about your machine.

Nothing aborts the run. A step that fails is retried a bounded number of times
(`-c N`, five by default) and then given up on, so you always reach the end and
get one report instead of discovering a failure three commands later. The exit
status is `0` only if every step that ran succeeded, which makes it safe to put
in a timer and be told when something needs a look.

NVIDIA packages are left alone by default, because replacing the driver under a
running session can break it. On rpm systems that is an `--exclude`; apt has no
equivalent, so the packages are held for the length of the run and released
afterwards — and anything that was *already* held stays held, because those are
not ours to release. There is a longer piece on the script's evolution in
[One Script to Update Everything on Ubuntu & Fedora](/articles/linux-update-scripts).

## `shinux-scripts` — all of the above

```bash
sudo dnf install shinux-scripts
sudo apt install shinux-scripts
```

A metapackage with no files of its own. Removing it leaves the commands
installed; remove those by name.

## Where it works

Every package here is a shell script, so all of them are
architecture-independent — `noarch` on rpm, `all` on deb — and behave the same
on x86-64 and on ARM. Before a release goes out the whole path is tested inside
throwaway Fedora 44 and Ubuntu 24.04 containers: add the repository, install a
package, run the command.

One limit is worth knowing in advance: the apt sources file declares
`Architectures: amd64 arm64`. On a 32-bit ARM system — an older Raspberry Pi OS
install, say — apt will ignore the repository even though the scripts inside it
would have run there perfectly well.

## Updating

This is the part that makes it a repository rather than a download page. When I
publish a new version, you get it the same way you get everything else:

```bash
sudo dnf upgrade          # or: sudo apt update && sudo apt upgrade
```

Or just run `update-every-thing`, which does that along with everything else.

dnf re-checks the repository after six hours, or immediately with
`sudo dnf --refresh upgrade`. apt checks on the next `apt update`.

### Staying on an older version

Old builds stay in the repository, so downgrading and pinning both work the way
they do for any other one:

```bash
dnf list --showduplicates padnum     # what versions exist
sudo dnf downgrade padnum            # step back one
sudo dnf install padnum-1.2.0-1      # or land on an exact one
```

```bash
apt list -a padnum                   # what versions exist
sudo apt install padnum=1.2.0-1      # land on an exact one
sudo apt-mark hold padnum            # and stay there
```

## Removing it

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/uninstall.sh | sudo sh
```

That removes the repository and stops trusting its key, but leaves anything you
installed in place. To take the packages with it:

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/uninstall.sh | sudo sh -s -- --purge
```

## When something does not work

**dnf says the signature could not be verified, or that the key is not
trusted.** The key was not imported, or a stale copy of the metadata is in the
cache. Both are fixed by the same two commands:

```bash
sudo rpm --import https://abdallah-shehawey.github.io/shinux/RPM-GPG-KEY-shinux
sudo dnf clean all && sudo dnf --refresh repolist
```

**apt says the repository "is not signed" or reports `NO_PUBKEY`.** The keyring
is missing from `/etc/apt/keyrings/shinux.gpg`, usually because the sources file
was copied onto the machine without it. Installing the keyring package puts both
halves in place:

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/shinux-keyring.deb \
  -o /tmp/shinux-keyring.deb
sudo apt install -y /tmp/shinux-keyring.deb && sudo apt update
```

**A package that should be there is "not found".** If it is one I have only
just published, your machine is still working from cached metadata.
`sudo dnf --refresh upgrade` or `sudo apt update` fixes it; dnf otherwise
notices within six hours by itself.

**`apt update` never mentions shinux at all.** Check the architecture: on
anything that is not `amd64` or `arm64`, apt skips the repository silently, as
described above.

### If tab completion does not offer these packages

Typing `sudo dnf install vid` and pressing Tab should offer `vidtime`, whether or
not it is installed yet. If it offers everything on your system *except* the
packages from this repository, the cause is `repo_gpgcheck`, and it is worth
explaining because nothing about it is visible.

Completion does not run as root. It shells out to `dnf` as *you*, and an
unprivileged dnf keeps its own keyring under `~/.cache/libdnf5` — where the
signing key was never imported, because only root's was. With
`repo_gpgcheck=1`, verifying `repomd.xml` then fails, dnf drops the repository
for that invocation, and completion quietly offers you everything else. No error
appears anywhere you would look.

So `/etc/yum.repos.d/shinux.repo` ships with `repo_gpgcheck=0`, which is what
Fedora's own repositories, RPM Fusion, EPEL and every COPR do. Packages are
still verified: `gpgcheck=1` covers the rpms, which is the part that carries
code. If you added the repository before this changed, upgrading
`shinux-release` rewrites the line for you.

Once the repository is being read, the rest is your shell. Every package
installs a bash completion *and* a native zsh one, so the remaining causes are:

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
GPG-signed, the dnf configuration sets `gpgcheck=1`, and the apt sources entry
pins the key with `Signed-By:` so it cannot vouch for anything else. The
repository metadata is signed too, and apt checks it on every `apt update`; on
the dnf side that check ships off, for the reason in
[the completion section above](#if-tab-completion-does-not-offer-these-packages),
and `repodata/repomd.xml.asc` is published for anyone who would rather turn it
back on. This is the key doing the signing:

```
pub   rsa4096 2026-08-19 [SC]
      AE61 EBAE 9E82 36C0 2D44  F731 BAD3 F432 9468 897C
uid   Shinux Repository Signing Key <shehawey9@gmail.com>
```

Compare it against what your own machine ended up trusting:

```bash
gpg --show-keys --with-fingerprint /etc/pki/rpm-gpg/RPM-GPG-KEY-shinux   # Fedora
gpg --show-keys --with-fingerprint /etc/apt/keyrings/shinux.gpg          # Debian / Ubuntu
```

If those digits ever differ from the ones above, do not continue — that is
precisely the case this whole mechanism exists to catch.

The packages are built and signed by CI from a public repository, on every push,
and the source of every script in them is right there next to the packaging: one
source tree per package produces both the `.rpm` and the `.deb`, so the two can
never quietly drift apart. It is all MIT-licensed — read it, copy it, or build
your own repository the same way.

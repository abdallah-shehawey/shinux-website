---
title: One Script to Update Everything on Ubuntu & Fedora
description: >-
  update-every-thing: one command that updates the system, Flatpak, Snap,
  firmware, and GNOME extensions — retrying a failing step a fixed number of
  times, then moving on and reporting what happened.
date: 2026-05-24T00:00:00.000Z
tags:
  - ubuntu
  - fedora
  - bash
  - maintenance
locale: en
draft: false
author: abdallah-shehawey
---

`update-every-thing` is one command that updates your whole machine: system packages, Snap, Flatpak, firmware, and GNOME extensions. There are two versions below — **one for Ubuntu/Debian, one for Fedora** — same name, same options, same behaviour. Install the one that matches your distro, and you're done.

## What it does

- **Updates everything in one go** — apt/dnf, Snap, Flatpak, firmware (`fwupd`), GNOME extensions, then cleans up.
- **You still watch it work.** No stream is redirected anywhere, so every download draws its progress bar live, exactly as if you had typed the command yourself.
- **Retries a failing step, but not forever.** Each step gets 5 attempts by default (`-c N` to change it). A dropped connection recovers on its own; a step that is genuinely broken burns its attempts and the script **moves on to the next one** instead of hanging there.
- **Tells you what happened.** The run ends with a summary: what succeeded and on which attempt, what was skipped because the tool isn't installed, and what failed with its exit code.
- **Skips NVIDIA drivers by default.** They can break a running session, so you opt in with `--with-nvidia`.
- **Never dies halfway.** One broken step can't take the rest of the update with it.

# Ubuntu

## Install it

The script is just a file on your `PATH`. `/usr/local/bin` is the standard home for scripts you add yourself: it's already on every user's `PATH`, and no package manager will ever overwrite it.

```bash
# 1) Open the file, paste in the Ubuntu script from below, then save & exit
sudo nano /usr/local/bin/update-every-thing

# 2) Make it executable
sudo chmod +x /usr/local/bin/update-every-thing

# 3) Check it's picked up — this prints the usage text
update-every-thing -h
```

Use whichever editor you like in step 1 — `sudo nvim`, `sudo vim`, `sudo gedit`, they all work. If you already have the script saved as a file (say in `~/Downloads`), skip the copy-paste and install it in one line:

```bash
sudo install -m 755 ~/Downloads/update-every-thing /usr/local/bin/update-every-thing
```

## Use it

```bash
update-every-thing                    # 5 attempts per failing step (default)
update-every-thing -c 3               # 3 attempts per step
update-every-thing -c 1               # no retries: one shot per step
update-every-thing --with-nvidia      # update NVIDIA drivers too
update-every-thing -h                 # help
```

## The Ubuntu script

```bash
#!/usr/bin/env bash
# Script: update-every-thing  (Ubuntu / Debian)
# Put it in: /usr/local/bin/update-every-thing   (then: sudo chmod +x it)
#
# Update order:
#   1. Antigravity IDE
#   2. APT System Packages
#   3. Snap
#   4. Firmware (fwupd)
#   5. Flatpak
#   6. Ubuntu Pro security status
#   7. GNOME Extensions
#   8. Drivers (only with --with-nvidia)
#   9. Cleanup
#
# A step that fails is retried a bounded number of times, then given up on so
# the run always reaches the end. Every outcome — and the error behind each
# failure — is printed as a summary once everything is done.
#
# Usage: update-every-thing [-c N] [--with-nvidia]
#   -c N            retry a failing step N times before moving on (default: 5)
#   --with-nvidia   update NVIDIA drivers too (held back by default)

set -uo pipefail

# Globbing off: patterns like *nvidia* are meant for the package manager, not
# for the shell to expand against the current directory.
set -f

# ==============================================================================
# Options
# ==============================================================================

RETRIES=5            # attempts per step before we give up on it and move on
RETRY_DELAY=2        # seconds between attempts
WITH_NVIDIA=false    # NVIDIA updates can break a running session — opt in

usage() {
    cat <<'USAGE'
Usage: update-every-thing [-c N] [--with-nvidia] [-h]      (Ubuntu / Debian)

  -c N, --retries N   Attempt each failing step up to N times before giving up
                      on it and moving to the next one (default: 5).
  --with-nvidia       Update NVIDIA drivers as well (held back by default).
  -h, --help          Show this help.

Nothing aborts the run: a step that keeps failing is reported in the summary at
the end, together with the error it died on.

Exit status: 0 if every step that ran succeeded, 1 if any step failed.
USAGE
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--retries)
            if [[ ! "${2:-}" =~ ^[1-9][0-9]*$ ]]; then
                echo "❌ $1 needs a positive integer, e.g. '$1 3'" >&2
                exit 2
            fi
            RETRIES="$2"
            shift 2
            ;;
        --with-nvidia)
            WITH_NVIDIA=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1" >&2
            echo >&2
            usage >&2
            exit 2
            ;;
    esac
done

# ==============================================================================
# Bookkeeping — every step records its outcome for the final summary
# ==============================================================================

SUMMARY=()           # one "STATUS|NAME|DETAIL" record per step
FAILED=0
CURRENT_STEP=""      # set while a step is running, for the Ctrl-C handler
INTERRUPTED=false

record() {
    SUMMARY+=("$1|$2|$3")
}

# retry_command <command> <name> [attempts]
#
# Runs a command, retrying it up to $RETRIES times — or [attempts], for
# best-effort steps that are pointless to repeat. Never aborts the script: a
# step that keeps failing is recorded and the run moves on to the next one.
#
# Neither stdout nor stderr is redirected anywhere. That is deliberate: dnf,
# apt and flatpak draw their download progress on stderr and size it from the
# terminal, so piping either stream (through `tee`, say) costs them the
# terminal and their progress bars come out duplicated and wrapped. The command
# runs exactly as if you had typed it yourself, and the summary at the end
# records which step failed and with what exit code — its error text is already
# on screen, right above.
retry_command() {
    local cmd="$1"
    local name="$2"
    local max="${3:-$RETRIES}"
    local attempt=1
    local status=0

    while (( attempt <= max )); do
        echo
        echo "============================================================"
        echo "🔄 Trying: $name... (attempt $attempt/$max)"
        echo "============================================================"

        CURRENT_STEP="$name"
        eval "$cmd"
        status=$?
        CURRENT_STEP=""

        if (( status == 0 )); then
            echo "✅ $name finished successfully"
            record OK "$name" "succeeded on attempt $attempt/$max"
            return 0
        fi

        echo "❌ $name failed (attempt $attempt/$max, exit $status)."
        attempt=$(( attempt + 1 ))

        if (( attempt <= max )); then
            echo "🔁 Retrying in ${RETRY_DELAY} seconds..."
            sleep "$RETRY_DELAY"
        fi
    done

    echo "⛔ $name failed $max time(s) — giving up on it and moving on."
    record FAIL "$name" "gave up after $max attempt(s), exit $status"
    FAILED=$(( FAILED + 1 ))
    return 1
}

skip_step() {
    echo
    echo "⏭️ $1 — $2"
    record SKIP "$1" "$2"
}

print_summary() {
    local ok=0 fail=0 skip=0 entry status name detail

    echo
    echo "============================================================"
    echo "📋 Update Summary"
    echo "============================================================"

    if (( ${#SUMMARY[@]} == 0 )); then
        echo "  (nothing ran)"
    else
        for entry in "${SUMMARY[@]}"; do
            IFS='|' read -r status name detail <<<"$entry"
            case "$status" in
                OK)   printf '  ✅ %-32s %s\n' "$name" "$detail"; ok=$((   ok   + 1 )) ;;
                FAIL) printf '  ❌ %-32s %s\n' "$name" "$detail"; fail=$(( fail + 1 )) ;;
                SKIP) printf '  ⏭️  %-32s %s\n' "$name" "$detail"; skip=$(( skip + 1 )) ;;
            esac
        done
    fi

    echo "------------------------------------------------------------"
    printf '  %d succeeded · %d failed · %d skipped   (retry limit: %d, took %dm %ds)\n' \
        "$ok" "$fail" "$skip" "$RETRIES" "$(( SECONDS / 60 ))" "$(( SECONDS % 60 ))"
    echo "============================================================"

    if [[ "$INTERRUPTED" == true ]]; then
        echo "🛑 Stopped early — the steps after this one never ran."
    elif (( fail > 0 )); then
        echo "⚠️ Some updates did not go through — scroll up to the ❌ steps for their errors."
    else
        echo "🎉 All updates completed successfully!"
    fi
    echo
}

# Ctrl-C stops the run, but still reports honestly: the step that was running
# is recorded as interrupted, and the summary says the run ended early.
on_interrupt() {
    INTERRUPTED=true
    echo
    echo "🛑 Interrupted."
    if [[ -n "$CURRENT_STEP" ]]; then
        record FAIL "$CURRENT_STEP" "interrupted by Ctrl-C"
        FAILED=$(( FAILED + 1 ))
        CURRENT_STEP=""
    fi
    print_summary
    exit 130
}
trap on_interrupt INT

# Ask for the sudo password once, up front — then keep the timestamp fresh so no
# prompt can appear in the middle of a long download.
sudo -v || true
( while kill -0 "$$" 2>/dev/null; do sudo -n true 2>/dev/null; sleep 50; done ) &
SUDO_KEEPALIVE_PID=$!

# NVIDIA packages are pinned for the duration of the apt run; release them
# however the script ends, so an interrupted run can't leave them held.
NVIDIA_HELD=false
NVIDIA_PACKAGES="nvidia-driver-* nvidia-dkms-* nvidia-kernel-* libnvidia-*"

unhold_nvidia() {
    if [[ "$NVIDIA_HELD" == true ]]; then
        sudo apt-mark unhold $NVIDIA_PACKAGES >/dev/null 2>&1
        NVIDIA_HELD=false
    fi
}

cleanup() {
    unhold_nvidia
    [[ -n "${SUDO_KEEPALIVE_PID:-}" ]] && kill "$SUDO_KEEPALIVE_PID" 2>/dev/null
}
trap cleanup EXIT

echo
echo "============================================================"
echo "🚀 Starting Full Ubuntu Update  (retries per step: $RETRIES)"
if [[ "$WITH_NVIDIA" == true ]]; then
    echo "   ⚠️ NVIDIA drivers WILL be updated."
else
    echo "   ⏭️ NVIDIA drivers will be held back (--with-nvidia to include them)."
fi
echo "============================================================"


# ==============================================================================
# 1. Antigravity IDE Update
# ==============================================================================

if command -v antigravity-update.sh &> /dev/null; then
    retry_command \
        "antigravity-update.sh" \
        "Antigravity IDE Update"
else
    skip_step "Antigravity IDE Update" "antigravity-update.sh not found in PATH"
fi


# ==============================================================================
# 2. APT System Update
# ==============================================================================

if [[ "$WITH_NVIDIA" == false ]]; then
    sudo apt-mark hold $NVIDIA_PACKAGES >/dev/null 2>&1
    NVIDIA_HELD=true
fi

retry_command \
    "sudo apt update" \
    "APT Metadata Refresh"

retry_command \
    "sudo apt full-upgrade -y" \
    "APT System Update"

retry_command \
    "sudo apt install -y linux-generic" \
    "Kernel Metapackage"


# ==============================================================================
# 3. Snap Update
# ==============================================================================

if command -v snap &> /dev/null; then

    retry_command \
        "sudo snap refresh" \
        "Snap Update"

else
    skip_step "Snap Update" "snap not installed"
fi


# ==============================================================================
# 4. Firmware Update
# ==============================================================================

if command -v fwupdmgr &> /dev/null; then

    retry_command \
        "sudo fwupdmgr refresh --force" \
        "Firmware Metadata Refresh"

    retry_command \
        "sudo fwupdmgr update -y" \
        "Firmware Update"

else
    skip_step "Firmware Update" "fwupdmgr not installed"
fi


# ==============================================================================
# 5. Flatpak Update
# ==============================================================================

if command -v flatpak &> /dev/null; then

    retry_command \
        "flatpak update -y" \
        "Flatpak Update"

else
    skip_step "Flatpak Update" "flatpak not installed"
fi


# ==============================================================================
# 6. Ubuntu Pro Security
# ==============================================================================

if command -v pro &> /dev/null; then

    # Best effort, one shot each: repeating these fixes nothing.
    retry_command "pro security-status"    "Ubuntu Pro Security Status" 1
    retry_command "sudo pro fix --dry-run" "Ubuntu Pro Fixes (dry run)" 1

else
    skip_step "Ubuntu Pro Security Status" "pro not installed"
fi


# ==============================================================================
# 7. GNOME Extensions
# ==============================================================================

if command -v gnome-extensions &> /dev/null; then

    retry_command \
        "gnome-extensions update" \
        "GNOME Extensions Update"

    echo
    echo "📋 Installed GNOME Extensions:"
    gnome-extensions list || true
    echo "ℹ️ Extensions from extensions.gnome.org update via GNOME Software."

else
    skip_step "GNOME Extensions Update" "gnome-extensions CLI not installed"
fi


# ==============================================================================
# 8. Drivers (only when NVIDIA is explicitly opted into)
# ==============================================================================

if [[ "$WITH_NVIDIA" == true ]] && command -v ubuntu-drivers &> /dev/null; then
    retry_command \
        "sudo ubuntu-drivers autoinstall" \
        "NVIDIA / Ubuntu Drivers"
fi


# ==============================================================================
# 9. Cleanup
# ==============================================================================

unhold_nvidia

retry_command "sudo apt autoremove -y" "Cleanup (autoremove)"  1
retry_command "sudo apt autoclean -y"  "Cleanup (clean cache)" 1


# ==============================================================================
# Finished
# ==============================================================================

print_summary
exit $(( FAILED > 0 ? 1 : 0 ))
```

# Fedora

## Install it

Exactly the same three steps — just paste the Fedora script instead:

```bash
# 1) Open the file, paste in the Fedora script from below, then save & exit
sudo nano /usr/local/bin/update-every-thing

# 2) Make it executable
sudo chmod +x /usr/local/bin/update-every-thing

# 3) Check it's picked up — this prints the usage text
update-every-thing -h
```

## Use it

```bash
update-every-thing                    # 5 attempts per failing step (default)
update-every-thing -c 3               # 3 attempts per step
update-every-thing --with-nvidia      # update NVIDIA/CUDA packages too
update-every-thing -h                 # help
```

## The Fedora script

```bash
#!/usr/bin/env bash
# Script: update-every-thing  (Fedora)
# Put it in: /usr/local/bin/update-every-thing   (then: sudo chmod +x it)
#
# Update order:
#   1. Antigravity IDE
#   2. DNF System Packages
#   3. Firmware (fwupd)
#   4. Flatpak
#   5. GNOME Extensions
#   6. Cleanup
#
# A step that fails is retried a bounded number of times, then given up on so
# the run always reaches the end. Every outcome — and the error behind each
# failure — is printed as a summary once everything is done.
#
# Usage: update-every-thing [-c N] [--with-nvidia]
#   -c N            retry a failing step N times before moving on (default: 5)
#   --with-nvidia   update NVIDIA drivers too (excluded by default)

set -uo pipefail

# Globbing off: patterns like *nvidia* are meant for the package manager, not
# for the shell to expand against the current directory.
set -f

# ==============================================================================
# Options
# ==============================================================================

RETRIES=5            # attempts per step before we give up on it and move on
RETRY_DELAY=2        # seconds between attempts
WITH_NVIDIA=false    # NVIDIA updates can break a running session — opt in

usage() {
    cat <<'USAGE'
Usage: update-every-thing [-c N] [--with-nvidia] [-h]      (Fedora)

  -c N, --retries N   Attempt each failing step up to N times before giving up
                      on it and moving to the next one (default: 5).
  --with-nvidia       Update NVIDIA/CUDA packages as well (excluded by default).
  -h, --help          Show this help.

Nothing aborts the run: a step that keeps failing is reported in the summary at
the end, together with the error it died on.

Exit status: 0 if every step that ran succeeded, 1 if any step failed.
USAGE
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--retries)
            if [[ ! "${2:-}" =~ ^[1-9][0-9]*$ ]]; then
                echo "❌ $1 needs a positive integer, e.g. '$1 3'" >&2
                exit 2
            fi
            RETRIES="$2"
            shift 2
            ;;
        --with-nvidia)
            WITH_NVIDIA=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1" >&2
            echo >&2
            usage >&2
            exit 2
            ;;
    esac
done

# ==============================================================================
# Bookkeeping — every step records its outcome for the final summary
# ==============================================================================

SUMMARY=()           # one "STATUS|NAME|DETAIL" record per step
FAILED=0
CURRENT_STEP=""      # set while a step is running, for the Ctrl-C handler
INTERRUPTED=false

record() {
    SUMMARY+=("$1|$2|$3")
}

# retry_command <command> <name> [attempts]
#
# Runs a command, retrying it up to $RETRIES times — or [attempts], for
# best-effort steps that are pointless to repeat. Never aborts the script: a
# step that keeps failing is recorded and the run moves on to the next one.
#
# Neither stdout nor stderr is redirected anywhere. That is deliberate: dnf,
# apt and flatpak draw their download progress on stderr and size it from the
# terminal, so piping either stream (through `tee`, say) costs them the
# terminal and their progress bars come out duplicated and wrapped. The command
# runs exactly as if you had typed it yourself, and the summary at the end
# records which step failed and with what exit code — its error text is already
# on screen, right above.
retry_command() {
    local cmd="$1"
    local name="$2"
    local max="${3:-$RETRIES}"
    local attempt=1
    local status=0

    while (( attempt <= max )); do
        echo
        echo "============================================================"
        echo "🔄 Trying: $name... (attempt $attempt/$max)"
        echo "============================================================"

        CURRENT_STEP="$name"
        eval "$cmd"
        status=$?
        CURRENT_STEP=""

        if (( status == 0 )); then
            echo "✅ $name finished successfully"
            record OK "$name" "succeeded on attempt $attempt/$max"
            return 0
        fi

        echo "❌ $name failed (attempt $attempt/$max, exit $status)."
        attempt=$(( attempt + 1 ))

        if (( attempt <= max )); then
            echo "🔁 Retrying in ${RETRY_DELAY} seconds..."
            sleep "$RETRY_DELAY"
        fi
    done

    echo "⛔ $name failed $max time(s) — giving up on it and moving on."
    record FAIL "$name" "gave up after $max attempt(s), exit $status"
    FAILED=$(( FAILED + 1 ))
    return 1
}

skip_step() {
    echo
    echo "⏭️ $1 — $2"
    record SKIP "$1" "$2"
}

print_summary() {
    local ok=0 fail=0 skip=0 entry status name detail

    echo
    echo "============================================================"
    echo "📋 Update Summary"
    echo "============================================================"

    if (( ${#SUMMARY[@]} == 0 )); then
        echo "  (nothing ran)"
    else
        for entry in "${SUMMARY[@]}"; do
            IFS='|' read -r status name detail <<<"$entry"
            case "$status" in
                OK)   printf '  ✅ %-32s %s\n' "$name" "$detail"; ok=$((   ok   + 1 )) ;;
                FAIL) printf '  ❌ %-32s %s\n' "$name" "$detail"; fail=$(( fail + 1 )) ;;
                SKIP) printf '  ⏭️  %-32s %s\n' "$name" "$detail"; skip=$(( skip + 1 )) ;;
            esac
        done
    fi

    echo "------------------------------------------------------------"
    printf '  %d succeeded · %d failed · %d skipped   (retry limit: %d, took %dm %ds)\n' \
        "$ok" "$fail" "$skip" "$RETRIES" "$(( SECONDS / 60 ))" "$(( SECONDS % 60 ))"
    echo "============================================================"

    if [[ "$INTERRUPTED" == true ]]; then
        echo "🛑 Stopped early — the steps after this one never ran."
    elif (( fail > 0 )); then
        echo "⚠️ Some updates did not go through — scroll up to the ❌ steps for their errors."
    else
        echo "🎉 All updates completed successfully!"
    fi
    echo
}

# Ctrl-C stops the run, but still reports honestly: the step that was running
# is recorded as interrupted, and the summary says the run ended early.
on_interrupt() {
    INTERRUPTED=true
    echo
    echo "🛑 Interrupted."
    if [[ -n "$CURRENT_STEP" ]]; then
        record FAIL "$CURRENT_STEP" "interrupted by Ctrl-C"
        FAILED=$(( FAILED + 1 ))
        CURRENT_STEP=""
    fi
    print_summary
    exit 130
}
trap on_interrupt INT

# Ask for the sudo password once, up front — then keep the timestamp fresh so no
# prompt can appear in the middle of a long download.
sudo -v || true
( while kill -0 "$$" 2>/dev/null; do sudo -n true 2>/dev/null; sleep 50; done ) &
SUDO_KEEPALIVE_PID=$!

cleanup() {
    [[ -n "${SUDO_KEEPALIVE_PID:-}" ]] && kill "$SUDO_KEEPALIVE_PID" 2>/dev/null
}
trap cleanup EXIT

echo
echo "============================================================"
echo "🚀 Starting Full Fedora Update  (retries per step: $RETRIES)"
if [[ "$WITH_NVIDIA" == true ]]; then
    echo "   ⚠️ NVIDIA drivers WILL be updated."
else
    echo "   ⏭️ NVIDIA drivers will be skipped (--with-nvidia to include them)."
fi
echo "============================================================"


# ==============================================================================
# 1. Antigravity IDE Update
# ==============================================================================

if command -v antigravity-update.sh &> /dev/null; then
    retry_command \
        "antigravity-update.sh" \
        "Antigravity IDE Update"
else
    skip_step "Antigravity IDE Update" "antigravity-update.sh not found in PATH"
fi


# ==============================================================================
# 2. DNF System Update
# ==============================================================================

EXCLUDE_NVIDIA=""
if [[ "$WITH_NVIDIA" == false ]]; then
    EXCLUDE_NVIDIA="--exclude=*nvidia* --exclude=*cuda*"
fi

retry_command \
    "sudo dnf makecache --refresh" \
    "DNF Metadata Refresh"

retry_command \
    "sudo dnf upgrade -y --refresh $EXCLUDE_NVIDIA" \
    "DNF System Update"


# ==============================================================================
# 3. Firmware Update
# ==============================================================================

if command -v fwupdmgr &> /dev/null; then

    retry_command \
        "sudo fwupdmgr refresh --force" \
        "Firmware Metadata Refresh"

    retry_command \
        "sudo fwupdmgr update -y" \
        "Firmware Update"

else
    skip_step "Firmware Update" "fwupdmgr not installed"
fi


# ==============================================================================
# 4. Flatpak Update
# ==============================================================================

if command -v flatpak &> /dev/null; then

    retry_command \
        "flatpak update -y" \
        "Flatpak Update"

else
    skip_step "Flatpak Update" "flatpak not installed"
fi


# ==============================================================================
# 5. GNOME Extensions (RPM)
# ==============================================================================

if command -v gnome-extensions &> /dev/null; then

    retry_command \
        "sudo dnf upgrade -y 'gnome-shell-extension-*'" \
        "GNOME Extensions Update"

    echo
    echo "📋 Installed GNOME Extensions:"
    gnome-extensions list || true
    echo "ℹ️ Extensions from extensions.gnome.org update via GNOME Software."

else
    skip_step "GNOME Extensions Update" "gnome-extensions CLI not installed"
fi

if [[ "$WITH_NVIDIA" == true ]]; then
    echo
    echo "📋 Installed NVIDIA packages:"
    sudo dnf list installed '*nvidia*' || true
fi


# ==============================================================================
# 6. Cleanup
# ==============================================================================

retry_command "sudo dnf autoremove -y" "Cleanup (autoremove)"  1
retry_command "sudo dnf clean all"     "Cleanup (clean cache)" 1


# ==============================================================================
# Finished
# ==============================================================================

print_summary
exit $(( FAILED > 0 ? 1 : 0 ))
```

## The summary

Nothing scrolls away. When the last step is done you get the whole run on one screen:

```text
============================================================
📋 Update Summary
============================================================
  ✅ Antigravity IDE Update           succeeded on attempt 1/5
  ✅ DNF Metadata Refresh             succeeded on attempt 1/5
  ✅ DNF System Update                succeeded on attempt 2/5
  ✅ Firmware Metadata Refresh        succeeded on attempt 1/5
  ❌ Firmware Update                  gave up after 5 attempt(s), exit 1
  ✅ Flatpak Update                   succeeded on attempt 1/5
  ⏭️  GNOME Extensions Update          gnome-extensions CLI not installed
  ✅ Cleanup (autoremove)             succeeded on attempt 1/1
------------------------------------------------------------
  6 succeeded · 1 failed · 1 skipped   (retry limit: 5, took 6m 12s)
============================================================
⚠️ Some updates did not go through — scroll up to the ❌ steps for their errors.
```

That firmware line is exactly why the retry count is capped. A machine whose EFI variable store rejects the write will never succeed, no matter how long you retry — an unbounded `while true` loop sits on it forever, and the Flatpak and cleanup steps never run at all. Here it spends its 5 attempts, and the rest of the update still happens.

Press `Ctrl-C` and you still get the summary, with the step you interrupted marked as such and a `🛑 Stopped early` note — it never claims a run finished when it didn't. Exit status is `0` when everything that ran succeeded, `1` when any step failed, `130` when you interrupted it, and `2` on a bad argument, so it behaves inside a cron job or another script.

## How it works

- **Bounded retries** — `retry_command` loops `attempt` from 1 to `$RETRIES`. When the attempts run out it records the failure and returns; it never aborts the script, so one broken step can't take the rest of the run with it. Steps where retrying is pointless (`autoremove`, `clean`, `pro security-status`) pass `1` as a third argument and get a single shot.
- **Nothing is redirected — on purpose.** `dnf`, `apt` and `flatpak` draw their download progress on **stderr**, sized from the terminal. Pipe either stream anywhere — through `tee`, to a file — and they lose the terminal: the width goes wrong, `\r` stops overwriting, and every redraw lands on a new line as a wall of duplicated bars. So `retry_command` runs `eval "$cmd"` bare. You watch the download exactly as if you had typed the command yourself, and the summary records which step failed with which exit code — the error text itself is already on screen, right above it.
- **`set -uo pipefail`, deliberately without `-e`** — the script *expects* commands to fail and handles it itself. `-e` would defeat the whole design.
- **`set -f`** — globbing off, so patterns like `--exclude=*nvidia*` reach the package manager intact instead of the shell expanding them against the current directory first.
- **Graceful skips** — a tool that isn't installed is recorded as ⏭️ rather than silently ignored, so the summary distinguishes "not applicable here" from "broke".
- **One password, once** — `sudo -v` up front, plus a background loop refreshing the timestamp every 50 seconds, so a long download can't be followed by a password prompt you never see.
- **NVIDIA released on exit** (Ubuntu) — the `apt-mark hold` is lifted from an `EXIT` trap, so even an interrupted run can't leave your NVIDIA packages pinned.

## Notes

- Fedora needs **RPMFusion** enabled for NVIDIA drivers.
- The Ubuntu version uses `apt-mark hold` to freeze NVIDIA packages for the duration of the upgrade.
- Both are safe to run as many times as you like.

---
title: Automating Full System Updates (update-every-thing)
description: >-
  A resilient update-every-thing script that retries a failing step a fixed
  number of times, moves on instead of hanging, and prints a summary of what
  succeeded, what was skipped, and why anything failed.
order: 2
tags:
  - bash
  - scripts
  - fedora
  - automation
draft: false
author: abdallah-shehawey
---

`update-every-thing` is a single Bash script that updates your entire Fedora desktop system in one go: the IDE, DNF packages, firmware, Flatpaks, and GNOME extensions.

Network hiccups are common mid-update, so every step is retried — but only a **bounded** number of times. A step that is genuinely broken (bad firmware write, a dead remote) is given up on after its retries are spent, and the run carries on to the next step instead of looping forever. When everything is done, the script prints a summary of every step, including the error line behind each failure.

## Usage

```bash
update-every-thing            # retry each failing step up to 5 times (default)
update-every-thing -c 3       # ...or up to 3 times
update-every-thing -c 1       # no retries at all: one shot per step
update-every-thing -h         # help
```

`-c` (long form `--retries`) takes a positive integer. The script exits `0` when every step that ran succeeded, `1` when any step failed, and `2` on a bad argument.

## Script Source (`update-every-thing`)

```bash
#!/usr/bin/env bash
# Script: update-every-thing
# Function: Full Fedora system updater
#
# Update order:
#   1. Antigravity IDE
#   2. DNF System Packages
#   3. Firmware
#   4. Flatpak
#   5. GNOME Extensions
#
# A step that fails is retried a bounded number of times, then given up on so
# the run always reaches the end. Every outcome — and the error behind each
# failure — is printed as a summary once everything is done.
#
# Usage: update-every-thing [-c N]
#   -c N   retry a failing step N times before moving on (default: 5)

set -uo pipefail

# Keep Python-based tools (dnf) writing line by line even though we pipe their
# output through tee to capture it.
export PYTHONUNBUFFERED=1

# ==============================================================================
# Options
# ==============================================================================

RETRIES=5          # attempts per step before we give up on it
RETRY_DELAY=2      # seconds between attempts

usage() {
    cat <<'EOF'
Usage: update-every-thing [-c N] [-h]

  -c N, --retries N   Attempt each failing step up to N times before giving up
                      on it and moving to the next one (default: 5).
  -h, --help          Show this help.

Nothing aborts the run: a step that keeps failing is reported in the summary
at the end, together with the error it died on.

Exit status: 0 if every step that ran succeeded, 1 if any step failed.
EOF
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

SUMMARY=()         # one "STATUS|NAME|DETAIL|REASON" record per step
FAILED=0

STEP_LOG="$(mktemp -t update-every-thing.XXXXXX)"
trap 'rm -f "$STEP_LOG"' EXIT

record() {
    SUMMARY+=("$1|$2|$3|${4:-}")
}

# Pulls the most useful line out of a failed step's output: the last line that
# looks like an error, or just the last line if none of them do. Progress bars
# are stripped (they redraw with \r, so they'd otherwise win).
last_error_line() {
    local line
    line=$(tr '\r' '\n' <"$STEP_LOG" | sed 's/[[:space:]]*$//' | grep -v '^$' |
           grep -iE 'error|failed|fatal|cannot|unable|denied|no such|not found|conflict|timeout' |
           tail -n 1)
    [[ -z "$line" ]] && line=$(tr '\r' '\n' <"$STEP_LOG" | sed 's/[[:space:]]*$//' | grep -v '^$' | tail -n 1)
    [[ -z "$line" ]] && line="(no output)"
    # Keep the summary readable.
    if (( ${#line} > 220 )); then
        line="${line:0:217}..."
    fi
    printf '%s' "$line"
}

# Runs a command, retrying it up to $RETRIES times. Never aborts the script:
# a step that keeps failing is recorded, with its error, and the run moves on.
retry_command() {
    local cmd="$1"
    local name="$2"
    local attempt=1
    local status=0

    while (( attempt <= RETRIES )); do
        echo
        echo "============================================================"
        echo "🔄 Trying: $name... (attempt $attempt/$RETRIES)"
        echo "============================================================"

        eval "$cmd" 2>&1 | tee "$STEP_LOG"
        status=${PIPESTATUS[0]}

        if (( status == 0 )); then
            echo "✅ $name finished successfully"
            record OK "$name" "succeeded on attempt $attempt/$RETRIES"
            return 0
        fi

        echo "❌ $name failed (attempt $attempt/$RETRIES, exit $status)."
        attempt=$(( attempt + 1 ))

        if (( attempt <= RETRIES )); then
            echo "🔁 Retrying in ${RETRY_DELAY} seconds..."
            sleep "$RETRY_DELAY"
        fi
    done

    echo "⛔ $name failed $RETRIES time(s) — giving up on it and moving on."
    record FAIL "$name" "gave up after $RETRIES attempt(s), exit $status" "$(last_error_line)"
    FAILED=$(( FAILED + 1 ))
    return 1
}

skip_step() {
    echo
    echo "⏭️ $1 — $2"
    record SKIP "$1" "$2"
}

print_summary() {
    local ok=0 fail=0 skip=0 entry status name detail reason

    echo
    echo "============================================================"
    echo "📋 Update Summary"
    echo "============================================================"

    if (( ${#SUMMARY[@]} == 0 )); then
        echo "  (nothing ran)"
    else
        for entry in "${SUMMARY[@]}"; do
            IFS='|' read -r status name detail reason <<<"$entry"
            case "$status" in
                OK)
                    printf '  ✅ %-32s %s\n' "$name" "$detail"
                    ok=$(( ok + 1 ))
                    ;;
                FAIL)
                    printf '  ❌ %-32s %s\n' "$name" "$detail"
                    [[ -n "$reason" ]] && printf '       ↳ %s\n' "$reason"
                    fail=$(( fail + 1 ))
                    ;;
                SKIP)
                    printf '  ⏭️  %-32s %s\n' "$name" "$detail"
                    skip=$(( skip + 1 ))
                    ;;
            esac
        done
    fi

    echo "------------------------------------------------------------"
    printf '  %d succeeded · %d failed · %d skipped   (retry limit: %d, took %dm %ds)\n' \
        "$ok" "$fail" "$skip" "$RETRIES" "$(( SECONDS / 60 ))" "$(( SECONDS % 60 ))"
    echo "============================================================"

    if (( fail > 0 )); then
        echo "⚠️ Some updates did not go through — see the ❌ lines above."
    else
        echo "🎉 All updates completed successfully!"
    fi
    echo
}

# Ctrl-C still prints what got done before the interrupt.
trap 'echo; echo "🛑 Interrupted."; print_summary; rm -f "$STEP_LOG"; exit 130' INT

echo
echo "============================================================"
echo "🚀 Starting Full Fedora Update  (retries per step: $RETRIES)"
echo "============================================================"

# Ask for the sudo password once, up front, on a clean terminal.
sudo -v || true


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

retry_command \
    "sudo dnf upgrade -y --refresh" \
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

else
    skip_step "GNOME Extensions Update" "gnome-extensions CLI not installed"
fi


# ==============================================================================
# Finished
# ==============================================================================

print_summary
exit $(( FAILED > 0 ? 1 : 0 ))
```

## The summary

Nothing scrolls away any more. Once the last step is done you get the whole run on one screen:

```text
============================================================
📋 Update Summary
============================================================
  ✅ Antigravity IDE Update           succeeded on attempt 1/5
  ✅ DNF System Update                succeeded on attempt 2/5
  ✅ Firmware Metadata Refresh        succeeded on attempt 1/5
  ❌ Firmware Update                  gave up after 5 attempt(s), exit 1
       ↳ failed to write-firmware: failed to write (null): failed to write data to efivarsfs: Error writing to file descriptor: Invalid argument
  ✅ Flatpak Update                   succeeded on attempt 1/5
  ⏭️  GNOME Extensions Update          gnome-extensions CLI not installed
------------------------------------------------------------
  4 succeeded · 1 failed · 1 skipped   (retry limit: 5, took 6m 12s)
============================================================
⚠️ Some updates did not go through — see the ❌ lines above.
```

That firmware line is the whole point of the change: a machine whose EFI variable store rejects the write will never succeed, no matter how long you retry. The old `while true` loop sat on it forever and the rest of the system never got updated. Now it burns its 5 attempts, records *why* it died, and the Flatpak and GNOME steps still run.

## How it works

- **Bounded retries** — `retry_command` loops `attempt` from 1 to `$RETRIES`. When the attempts run out it records the failure and `return 1`s; it never aborts the script, so one broken step can't take the rest of the run with it.
- **Capturing the reason** — each attempt's output goes through `tee` into a temp file, so it stays on screen *and* is available afterwards. `last_error_line` then pulls the most useful line out: progress bars redraw with `\r`, so those are split back into lines and dropped, and the last line matching `error|failed|fatal|cannot|...` wins.
- **`${PIPESTATUS[0]}`** — because the command is piped into `tee`, `$?` describes the pipeline, not the command. `PIPESTATUS[0]` is the step's own exit code, and it goes into the summary too.
- **`set -uo pipefail`, deliberately without `-e`** — the script *expects* commands to fail and handles it itself. `-e` would defeat the whole design.
- **Graceful skips** — a tool that isn't installed is recorded as ⏭️ rather than silently ignored, so the summary distinguishes "not applicable here" from "broke".
- **`sudo -v` up front** — asks for the password once, on a clean terminal, before any output is piped.
- **Ctrl-C still reports** — the `INT` trap prints the summary of whatever finished before you interrupted it.

## Install

```bash
sudo install -m 755 update-every-thing /usr/local/bin/update-every-thing
```

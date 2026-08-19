---
title: Automating Full System Updates (update-every-thing)
description: >-
  A resilient update-every-thing script for Ubuntu and Fedora that retries a
  failing step a fixed number of times, moves on instead of hanging, and prints
  a summary of what succeeded, what was skipped, and what failed.
order: 2
tags:
  - bash
  - scripts
  - ubuntu
  - fedora
  - automation
draft: false
author: abdallah-shehawey
---

`update-every-thing` is one command that updates your whole machine: system
packages, Snap, Flatpak, firmware, GNOME extensions, then cleans up after
itself. One script, both distribution families — it works out whether you have
`dnf`, `yum` or `apt` and runs the right commands for that system.

## Install it

The easy way is the package:

```bash
curl -fsSL https://abdallah-shehawey.github.io/shinux/install.sh | sudo sh
sudo dnf install update-every-thing    # or: sudo apt install update-every-thing
```

That brings the man page and tab completion with it. See
[the repository article](/articles/shinux-package-repository) for the rest of
what is in there.

By hand, if you prefer — save [the script](#the-script) and:

```bash
sudo install -m 0755 update-every-thing /usr/local/bin/update-every-thing
update-every-thing --help
```

## Use it

```bash
update-every-thing                 # the usual run
update-every-thing -c 3            # give each failing step 3 attempts
update-every-thing --with-nvidia   # include the graphics stack
update-every-thing --no-color      # plain output, for logs
```

## What it does

- **Everything in one go** — apt or dnf, Snap, Flatpak, firmware (`fwupd`),
  GNOME extensions, then cleanup.
- **No wasted work.** Repository metadata is downloaded exactly once per run;
  no step re-fetches what the one before it already had.
- **You still watch it work.** No stream is redirected anywhere, so every
  download draws its progress bar live, exactly as if you had typed the command
  yourself.
- **Retries, but not forever.** Each step gets 5 attempts by default (`-c N` to
  change it). A dropped connection recovers on its own; a step that is
  genuinely broken burns its attempts and the run **moves on** instead of
  hanging there.
- **One honest report at the end**, listing what succeeded, what was skipped and
  why, and what failed.

## The steps

| # | Step | Notes |
|---|---|---|
| 1 | Antigravity IDE | Only if it is actually installed — see below |
| 2 | System packages | `dnf upgrade --refresh`, or `apt update` + `apt full-upgrade` |
| 3 | Firmware | `fwupdmgr refresh` then `fwupdmgr update` |
| 4 | Flatpak | Skipped where flatpak is not installed |
| 5 | Snap | Skipped where snap is not installed |
| 6 | Ubuntu Pro | Reported only, on deb systems that have `pro` |
| 7 | Drivers | `ubuntu-drivers`, only with `--with-nvidia` |
| 8 | GNOME extensions | Listed only |
| 9 | Cleanup | autoremove, then clear the package cache |

Step 8 is a listing on purpose. Distribution-packaged extensions were already
upgraded in step 2, and asking the package manager about them again only
re-downloads every repository to print "Nothing to do". Extensions installed
from extensions.gnome.org update through GNOME Software, not here.

## The two families are genuinely different

This is the part that cannot be papered over with a variable holding the
package manager's name.

**Metadata refresh.** dnf takes `--refresh` on the upgrade itself, so the whole
run needs one command. apt splits it: `update` fetches the lists, `full-upgrade`
acts on them.

**Holding NVIDIA back.** Replacing a graphics driver under a running session can
break it, so NVIDIA and CUDA packages are left alone unless you ask for them.
dnf has `--exclude` and that is the end of it. apt has no equivalent, so the
script does the next best thing: it puts those packages on hold for the length
of the run and releases them afterwards.

That is a stateful change to your system, so it is done carefully. Packages that
were *already* held before the run stay held — they are not ours to release —
and the holds this run adds are released on the way out even if you interrupt
it:

```bash
mapfile -t already_held < <(apt-mark showhold 2>/dev/null)
# ... hold only what was not already held, recording it in HELD_BY_US

restore_holds() {
    (( ${#HELD_BY_US[@]} == 0 )) && return 0
    sudo apt-mark unhold "${HELD_BY_US[@]}" >/dev/null 2>&1 || true
    HELD_BY_US=()
}
trap cleanup EXIT     # cleanup calls restore_holds
```

**Cleanup.** `dnf autoremove` and `dnf clean all` against
`apt autoremove --purge`, `apt autoclean` and `apt clean`.

## Antigravity is only mentioned if you have it

The first step updates [Antigravity IDE](/tutorials/scripts/antigravity-ide-auto-updater),
but only on a machine that has it. The check is cheap and comes first:

```bash
"$AG_UPDATER" --check >/dev/null 2>&1
case "$?" in
    0) skip_step "Antigravity IDE" "already up to date" ;;
    3) retry_command "$AG_UPDATER --yes" "Antigravity IDE" ;;
    4) : ;;   # not installed: not this machine's concern
esac
```

Exit 4 means the IDE is not installed, and `antigravity-update --check` answers
that *before* touching the network. So on a machine without the IDE the step
costs nothing and does not appear in the summary at all — not even as a skipped
one. A step you never wanted is noise, not information.

## Why the output looks the way it does

An earlier version of this script used emoji for status: ✅, ❌, ⏭️. They look
good in isolation and they wreck a table.

Most terminals render emoji double-width, but `printf` counts them as one
character. So `printf '  %s %-32s %s\n' "✅" "$name" "$detail"` pads `$name` to
32 columns *of the string*, while the emoji before it has already consumed two
columns on screen. Every line ends up shifted by a different amount depending on
which marker it carries, and the detail column zigzags.

The fix is unglamorous: a fixed-width ASCII marker, coloured instead of drawn.

```
============================================================
  Summary
============================================================
  [  ok  ]  System Update (dnf)        attempt 1/5
  [  ok  ]  Firmware Metadata Refresh  attempt 2/5
  [ FAIL ]  Firmware Update            gave up after 5 attempt(s), exit 1
  [ skip ]  Flatpak Update             flatpak not installed
  [ skip ]  Snap Update                snap not installed
  [  ok  ]  Cleanup (autoremove)       attempt 1/1
------------------------------------------------------------
  3 ok, 1 failed, 2 skipped   (retry limit 5, took 2m 13s)
============================================================
```

The name column is sized from the longest step that actually ran, so the detail
column lines up whatever combination of steps a given machine produces. Colour
is switched off automatically when output is not a terminal, and `--no-color`
or `NO_COLOR` forces it off.

## Two decisions worth explaining

**Nothing is piped anywhere.** It is tempting to run each step through `tee` to
capture a log. Don't: dnf, apt and flatpak draw their progress on stderr and
size it from the terminal, so piping either stream costs them the terminal and
their progress bars come out duplicated and line-wrapped. Each command runs
exactly as if you had typed it, and the summary records which step failed with
what exit code — its error text is already on screen, right above.

**The sudo timestamp is kept warm.** The password is asked for once, up front,
and a background loop refreshes the timestamp every 50 seconds, so no prompt
appears twenty minutes into a download while you are away from the keyboard.

```bash
sudo -v || true
( while kill -0 "$$" 2>/dev/null; do sudo -n true 2>/dev/null; sleep 50; done ) &
SUDO_KEEPALIVE_PID=$!
```

The keepalive is killed by the same `EXIT` trap that releases the holds.

## Interrupting it

Ctrl-C stops the run and still reports honestly: the step that was running is
recorded as interrupted, the holds are released, the summary is printed, and it
exits `130`. You get the same report you would have got, plus a line saying the
steps after that one never ran.

## Exit status

| Code | Meaning |
|---|---|
| `0` | Every step that ran succeeded |
| `1` | At least one step failed |
| `2` | Bad usage, or no supported package manager |
| `130` | Interrupted with Ctrl-C |

That makes it usable from a timer or a cron job that only wants to shout when
something actually went wrong.

## The script
```bash
#!/usr/bin/env bash
# update-every-thing - run every update this system needs, in one pass.
#
# Works on both families. The package-manager steps differ completely between
# them, so they are separate paths; everything else (firmware, Flatpak, Snap,
# the IDE) is shared.
#
# Order matters: the system update runs the one and only repository metadata
# refresh of the run, and everything that would trigger another one is
# arranged around it.
#
# A step that fails is retried a bounded number of times and then given up on,
# so the run always reaches the end and you get one summary instead of
# discovering a failure three commands later.

set -uo pipefail

# Globbing off: patterns like *nvidia* are meant for the package manager, not
# for the shell to expand against the current directory.
set -f

VERSION="2.2.0"
PROGRAM="${0##*/}"

# ==============================================================================
# Options
# ==============================================================================

RETRIES=5            # attempts per step before we give up on it and move on
RETRY_DELAY=2        # seconds between attempts
WITH_NVIDIA=false    # NVIDIA updates can break a running session - opt in
USE_COLOR=auto

# Status markers are plain ASCII on purpose. Emoji are double-width in most
# terminals but count as one character to printf, so any column after one of
# them lands in the wrong place.
MARK_OK="  ok  "
MARK_FAIL=" FAIL "
MARK_SKIP=" skip "

setup_colors() {
    local on=false
    case "$USE_COLOR" in
        always) on=true ;;
        never)  on=false ;;
        auto)   [[ -t 1 && "${TERM:-dumb}" != dumb && -z "${NO_COLOR:-}" ]] && on=true ;;
    esac
    if $on; then
        C_RESET=$'\e[0m'; C_BOLD=$'\e[1m'; C_DIM=$'\e[2m'
        C_OK=$'\e[32m'; C_FAIL=$'\e[31m'; C_SKIP=$'\e[33m'; C_HEAD=$'\e[36m'
    else
        C_RESET=""; C_BOLD=""; C_DIM=""
        C_OK=""; C_FAIL=""; C_SKIP=""; C_HEAD=""
    fi
}

RULE="============================================================"
rule() { printf '%s%s%s\n' "$C_DIM" "$RULE" "$C_RESET"; }

usage() {
    cat <<USAGE
Usage: ${PROGRAM} [-c N] [--with-nvidia] [-V] [-h]

Runs every update this system needs and prints one summary at the end.
Detects dnf/yum or apt automatically and uses the right commands for each.

  -c N, --retries N   Attempt each failing step up to N times before giving up
                      on it and moving to the next one (default: 5).
  --with-nvidia       Update NVIDIA/CUDA packages as well (excluded by default,
                      because replacing the driver under a running session can
                      break it).
      --color WHEN    Colourise output: always, never or auto (default: auto).
      --no-color      Same as --color never.
  -V, --version       Print the version and exit.
  -h, --help          Show this help.

Nothing aborts the run: a step that keeps failing is reported in the summary at
the end, together with the error it died on.

Exit status: 0 if every step that ran succeeded, 1 if any step failed.
USAGE
}

setup_colors

while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--retries)
            if [[ ! "${2:-}" =~ ^[1-9][0-9]*$ ]]; then
                echo "$PROGRAM: $1 needs a positive integer, e.g. '$1 3'" >&2
                exit 2
            fi
            RETRIES="$2"
            shift 2
            ;;
        --with-nvidia)
            WITH_NVIDIA=true
            shift
            ;;
        --color)
            case "${2:-}" in
                always|never|auto) USE_COLOR="$2" ;;
                *) echo "$1 takes always, never or auto" >&2; exit 2 ;;
            esac
            shift 2
            ;;
        --no-color)
            USE_COLOR=never
            shift
            ;;
        -V|--version)
            echo "${PROGRAM} ${VERSION}"
            exit 0
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "$PROGRAM: unknown option: $1" >&2
            echo >&2
            usage >&2
            exit 2
            ;;
    esac
done

# ==============================================================================
# Which system is this?
# ==============================================================================

PM=""          # the package manager binary
FAMILY=""      # rpm | deb

if command -v dnf &> /dev/null; then
    PM="$(command -v dnf)"; FAMILY=rpm
elif command -v yum &> /dev/null; then
    PM="$(command -v yum)"; FAMILY=rpm
elif command -v apt-get &> /dev/null; then
    PM="$(command -v apt-get)"; FAMILY=deb
else
    echo "$PROGRAM: no supported package manager found (looked for dnf, yum, apt-get)" >&2
    exit 2
fi

DISTRO="$(. /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-unknown}")"

# ==============================================================================
# Bookkeeping - every step records its outcome for the final summary
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
# Runs a command, retrying it up to $RETRIES times - or [attempts], for
# best-effort steps that are pointless to repeat. Never aborts the script.
#
# Neither stdout nor stderr is redirected anywhere. That is deliberate: dnf,
# apt and flatpak draw their download progress on stderr and size it from the
# terminal, so piping either stream (through `tee`, say) costs them the
# terminal and their progress bars come out duplicated and wrapped. The command
# runs exactly as if you had typed it yourself, and the summary at the end
# records which step failed and with what exit code - its error text is already
# on screen, right above.
retry_command() {
    local cmd="$1"
    local name="$2"
    local max="${3:-$RETRIES}"
    local attempt=1
    local status=0

    while (( attempt <= max )); do
        echo
        rule
        printf '%s>>%s %s%s%s   %sattempt %d/%d%s\n' \
            "$C_HEAD" "$C_RESET" "$C_BOLD" "$name" "$C_RESET" \
            "$C_DIM" "$attempt" "$max" "$C_RESET"
        rule

        CURRENT_STEP="$name"
        eval "$cmd"
        status=$?
        CURRENT_STEP=""

        if (( status == 0 )); then
            printf '%s[%s]%s %s\n' "$C_OK" "$MARK_OK" "$C_RESET" "$name"
            record OK "$name" "attempt $attempt/$max"
            return 0
        fi

        printf '%s[%s]%s %s (attempt %d/%d, exit %d)\n' \
            "$C_FAIL" "$MARK_FAIL" "$C_RESET" "$name" "$attempt" "$max" "$status"
        attempt=$(( attempt + 1 ))

        if (( attempt <= max )); then
            printf '%s   retrying in %ds...%s\n' "$C_DIM" "$RETRY_DELAY" "$C_RESET"
            sleep "$RETRY_DELAY"
        fi
    done

    printf '%s[%s]%s %s - gave up after %d attempt(s)\n' \
        "$C_FAIL" "$MARK_FAIL" "$C_RESET" "$name" "$max"
    record FAIL "$name" "gave up after $max attempt(s), exit $status"
    FAILED=$(( FAILED + 1 ))
    return 1
}

skip_step() {
    echo
    printf '%s[%s]%s %s %s(%s)%s\n' \
        "$C_SKIP" "$MARK_SKIP" "$C_RESET" "$1" "$C_DIM" "$2" "$C_RESET"
    record SKIP "$1" "$2"
}

print_summary() {
    local ok=0 fail=0 skip=0 entry status name detail width=0

    # Size the name column from the longest name actually present, so the
    # detail column lines up whatever steps ran.
    for entry in "${SUMMARY[@]}"; do
        IFS='|' read -r status name detail <<<"$entry"
        (( ${#name} > width )) && width=${#name}
    done
    (( width < 20 )) && width=20

    echo
    rule
    printf '%s  Summary%s\n' "$C_BOLD" "$C_RESET"
    rule

    if (( ${#SUMMARY[@]} == 0 )); then
        echo "  (nothing ran)"
    else
        for entry in "${SUMMARY[@]}"; do
            IFS='|' read -r status name detail <<<"$entry"
            case "$status" in
                OK)   printf '  %s[%s]%s  %-*s  %s%s%s\n' \
                          "$C_OK" "$MARK_OK" "$C_RESET" "$width" "$name" \
                          "$C_DIM" "$detail" "$C_RESET"
                      ok=$(( ok + 1 )) ;;
                FAIL) printf '  %s[%s]%s  %-*s  %s%s%s\n' \
                          "$C_FAIL" "$MARK_FAIL" "$C_RESET" "$width" "$name" \
                          "$C_DIM" "$detail" "$C_RESET"
                      fail=$(( fail + 1 )) ;;
                SKIP) printf '  %s[%s]%s  %-*s  %s%s%s\n' \
                          "$C_SKIP" "$MARK_SKIP" "$C_RESET" "$width" "$name" \
                          "$C_DIM" "$detail" "$C_RESET"
                      skip=$(( skip + 1 )) ;;
            esac
        done
    fi

    printf '%s%s%s\n' "$C_DIM" "------------------------------------------------------------" "$C_RESET"
    printf '  %d ok, %d failed, %d skipped   %s(retry limit %d, took %dm %02ds)%s\n' \
        "$ok" "$fail" "$skip" "$C_DIM" "$RETRIES" \
        "$(( SECONDS / 60 ))" "$(( SECONDS % 60 ))" "$C_RESET"
    rule

    if [[ "$INTERRUPTED" == true ]]; then
        printf '%sStopped early - the steps after this one never ran.%s\n' "$C_SKIP" "$C_RESET"
    elif (( fail > 0 )); then
        printf '%sSome updates did not go through - scroll up to the FAIL steps for their errors.%s\n' \
            "$C_FAIL" "$C_RESET"
    else
        printf '%sAll updates completed successfully.%s\n' "$C_OK" "$C_RESET"
    fi
    echo
}

# Packages this run put on hold, so the EXIT trap can put them back exactly as
# it found them even if the run is interrupted.
HELD_BY_US=()

restore_holds() {
    (( ${#HELD_BY_US[@]} == 0 )) && return 0
    printf '%s>>%s releasing the temporary NVIDIA holds\n' "$C_HEAD" "$C_RESET"
    sudo apt-mark unhold "${HELD_BY_US[@]}" >/dev/null 2>&1 || true
    HELD_BY_US=()
}

# Ctrl-C stops the run, but still reports honestly: the step that was running
# is recorded as interrupted, and the summary says the run ended early.
on_interrupt() {
    INTERRUPTED=true
    echo
    printf '%sInterrupted.%s\n' "$C_SKIP" "$C_RESET"
    if [[ -n "$CURRENT_STEP" ]]; then
        record FAIL "$CURRENT_STEP" "interrupted by Ctrl-C"
        FAILED=$(( FAILED + 1 ))
        CURRENT_STEP=""
    fi
    restore_holds
    print_summary
    exit 130
}
trap on_interrupt INT

# Ask for the sudo password once, up front - then keep the timestamp fresh so no
# prompt can appear in the middle of a long download.
sudo -v || true
( while kill -0 "$$" 2>/dev/null; do sudo -n true 2>/dev/null; sleep 50; done ) &
SUDO_KEEPALIVE_PID=$!

cleanup() {
    restore_holds
    [[ -n "${SUDO_KEEPALIVE_PID:-}" ]] && kill "$SUDO_KEEPALIVE_PID" 2>/dev/null
}
trap cleanup EXIT

echo
rule
printf '%s  %s %s%s\n' "$C_BOLD" "$PROGRAM" "$VERSION" "$C_RESET"
printf '  %-9s %s\n' "System"  "${DISTRO}"
printf '  %-9s %s\n' "Manager" "${PM##*/}"
if [[ "$WITH_NVIDIA" == true ]]; then
    printf '  %-9s %s\n' "NVIDIA" "will be updated"
else
    printf '  %-9s %s\n' "NVIDIA" "held back (--with-nvidia to include)"
fi
printf '  %-9s %s\n' "Retries" "$RETRIES per step"
rule


# ==============================================================================
# 1. Antigravity IDE Update
# ==============================================================================

AG_UPDATER=""
for candidate in antigravity-update antigravity-update.sh; do
    if command -v "$candidate" &> /dev/null; then
        AG_UPDATER="$candidate"
        break
    fi
done

# Nothing about Antigravity is reported unless the IDE is actually installed.
# Someone who does not use it should not see a step for it at all, whether or
# not the updater happens to be on their PATH.
if [[ -n "$AG_UPDATER" ]]; then
    # --check exits 4 before touching the network when nothing is installed.
    "$AG_UPDATER" --check >/dev/null 2>&1
    ag_status=$?
    case "$ag_status" in
        0) skip_step "Antigravity IDE" "already up to date" ;;
        3) retry_command "$AG_UPDATER --yes" "Antigravity IDE" ;;
        4) : ;;   # not installed: not this machine's concern
        *) skip_step "Antigravity IDE" "version check failed (exit $ag_status)" ;;
    esac
fi


# ==============================================================================
# 2. System packages - the run's one and only metadata refresh
# ==============================================================================

if [[ "$FAMILY" == rpm ]]; then

    EXCLUDE_NVIDIA=""
    if [[ "$WITH_NVIDIA" == false ]]; then
        EXCLUDE_NVIDIA="--exclude=*nvidia* --exclude=*cuda*"
    fi

    retry_command \
        "sudo $PM upgrade -y --refresh $EXCLUDE_NVIDIA" \
        "System Update (${PM##*/})"

else

    retry_command "sudo $PM update" "Package Lists Refresh"

    # apt has no --exclude, so the equivalent is a hold for the length of the
    # run. Packages that were already held stay held: they are not ours to
    # release.
    if [[ "$WITH_NVIDIA" == false ]]; then
        mapfile -t already_held < <(apt-mark showhold 2>/dev/null)
        mapfile -t nvidia_pkgs < <(
            apt list --upgradable 2>/dev/null \
              | awk -F/ 'NR > 1 { print $1 }' \
              | grep -iE 'nvidia|cuda' || true
        )
        for pkg in "${nvidia_pkgs[@]}"; do
            [[ -z "$pkg" ]] && continue
            skip=false
            for h in "${already_held[@]}"; do
                [[ "$pkg" == "$h" ]] && { skip=true; break; }
            done
            $skip && continue
            HELD_BY_US+=("$pkg")
        done
        if (( ${#HELD_BY_US[@]} > 0 )); then
                printf '%s>>%s holding back for this run: %s\n' "$C_HEAD" "$C_RESET" "${HELD_BY_US[*]}"
            sudo apt-mark hold "${HELD_BY_US[@]}" >/dev/null
        fi
    fi

    retry_command \
        "sudo DEBIAN_FRONTEND=noninteractive $PM full-upgrade -y" \
        "System Update (apt)"

    restore_holds
fi


# ==============================================================================
# 3. Firmware
# ==============================================================================

if command -v fwupdmgr &> /dev/null; then
    retry_command "sudo fwupdmgr refresh --force" "Firmware Metadata Refresh"
    retry_command "sudo fwupdmgr update -y"       "Firmware Update"
else
    skip_step "Firmware Update" "fwupdmgr not installed"
fi


# ==============================================================================
# 4. Flatpak
# ==============================================================================

if command -v flatpak &> /dev/null; then
    retry_command "flatpak update -y" "Flatpak Update"
else
    skip_step "Flatpak Update" "flatpak not installed"
fi


# ==============================================================================
# 5. Snap  (Ubuntu ships it; Fedora usually does not)
# ==============================================================================

if command -v snap &> /dev/null; then
    retry_command "sudo snap refresh" "Snap Update"
else
    skip_step "Snap Update" "snap not installed"
fi


# ==============================================================================
# 6. Ubuntu Pro security status  (deb systems that have it)
# ==============================================================================

# Reporting only. `pro` covers the ESM archives that a plain full-upgrade does
# not, and whether to enable them is a decision, not something a bulk update
# script should make for you.
if [[ "$FAMILY" == deb ]] && command -v pro &> /dev/null; then
    echo
    printf '%sUbuntu Pro security status:%s\n' "$C_BOLD" "$C_RESET"
    pro security-status 2>/dev/null || true
fi


# ==============================================================================
# 7. Drivers  (only when NVIDIA is explicitly opted into)
# ==============================================================================

if [[ "$WITH_NVIDIA" == true ]] && [[ "$FAMILY" == deb ]] && command -v ubuntu-drivers &> /dev/null; then
    retry_command "sudo ubuntu-drivers install" "Driver Update (ubuntu-drivers)" 1
fi


# ==============================================================================
# 8. GNOME Extensions (listing only)
# ==============================================================================

# Distribution-packaged extensions were already upgraded by the system update
# above - running the package manager again for them only re-downloads every
# repository to print "Nothing to do". So this section just lists what is there.
if command -v gnome-extensions &> /dev/null; then
    echo
    printf '%sInstalled GNOME extensions:%s\n' "$C_BOLD" "$C_RESET"
    gnome-extensions list || true
    printf '%sExtensions from extensions.gnome.org update via GNOME Software.%s\n' "$C_DIM" "$C_RESET"
fi

if [[ "$WITH_NVIDIA" == true ]]; then
    echo
    printf '%sInstalled NVIDIA packages:%s\n' "$C_BOLD" "$C_RESET"
    if [[ "$FAMILY" == rpm ]]; then
        sudo "$PM" list installed '*nvidia*' || true
    else
        apt list --installed 2>/dev/null | grep -i nvidia || true
    fi
fi


# ==============================================================================
# 9. Cleanup
# ==============================================================================

if [[ "$FAMILY" == rpm ]]; then
    retry_command "sudo $PM autoremove -y" "Cleanup (autoremove)"  1
    retry_command "sudo $PM clean all"     "Cleanup (clean cache)" 1
else
    retry_command "sudo DEBIAN_FRONTEND=noninteractive $PM autoremove -y --purge" \
                                            "Cleanup (autoremove)"  1
    retry_command "sudo $PM autoclean -y"   "Cleanup (autoclean)"   1
    retry_command "sudo $PM clean"          "Cleanup (clean cache)" 1
fi


# ==============================================================================
# Finished
# ==============================================================================

print_summary
exit $(( FAILED > 0 ? 1 : 0 ))
```

---
title: A tmux Cheatsheet I Actually Use
description: >-
  The handful of tmux commands that cover 95% of daily terminal multiplexing.
date: 2026-06-20T00:00:00.000Z
tags:
  - terminal
  - tmux
  - productivity
locale: en
draft: false
author: abdallah-shehawey
---

Most tmux cheatsheets try to teach you everything at once. Here's the small subset that covers almost everything you'll actually do day to day.

## Starting a Session

```bash
tmux new -s work
```

Reattach later with:

```bash
tmux attach -t work
```

## The Essentials (Prefix is `Ctrl-b`)

| Keys | Action |
|---|---|
| `Ctrl-b c` | new window |
| `Ctrl-b n` / `p` | next / previous window |
| `Ctrl-b %` | split pane vertically |
| `Ctrl-b "` | split pane horizontally |
| `Ctrl-b d` | detach |

## Listing and Killing Sessions

```bash
tmux ls
tmux kill-session -t work
```

That's genuinely most of it. Everything else you'll pick up by reading `man tmux` the one time you actually need it.

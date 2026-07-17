---
title:
  en: "A tmux Cheatsheet I Actually Use"
  ar: "ورقة غش لـ tmux بستخدمها فعلاً"
description:
  en: "The handful of tmux commands that cover 95% of daily terminal multiplexing."
  ar: "أوامر tmux القليلة اللي بتغطي 95% من استخدامك اليومي للطرفية."
date: 2026-06-20
tags: [terminal, tmux, productivity]
locales: [en, ar]
defaultLocale: en
draft: false
---

<!-- lang:en -->

Most tmux cheatsheets try to teach you everything at once. Here's the small
subset that covers almost everything you'll actually do day to day.

## Starting a session

```bash
tmux new -s work
```

Reattach later with:

```bash
tmux attach -t work
```

## The essentials (prefix is `Ctrl-b`)

| Keys | Action |
|---|---|
| `Ctrl-b c` | new window |
| `Ctrl-b n` / `p` | next / previous window |
| `Ctrl-b %` | split pane vertically |
| `Ctrl-b "` | split pane horizontally |
| `Ctrl-b d` | detach |

## Listing and killing sessions

```bash
tmux ls
tmux kill-session -t work
```

That's genuinely most of it. Everything else you'll pick up by reading `man
tmux` the one time you actually need it.

<!-- lang:ar -->

أغلب ورقات الغش بتحاول تعلّمك كل حاجة مرة واحدة. دي المجموعة الصغيرة اللي
بتغطي تقريباً كل حاجة هتحتاجها يومياً.

## بدء جلسة جديدة

```bash
tmux new -s work
```

وترجع تفتحها تاني بـ:

```bash
tmux attach -t work
```

## الأساسيات (الـ prefix هو `Ctrl-b`)

| المفتاح | الوظيفة |
|---|---|
| `Ctrl-b c` | نافذة جديدة |
| `Ctrl-b n` / `p` | النافذة اللي بعدها / قبلها |
| `Ctrl-b %` | تقسيم عمودي |
| `Ctrl-b "` | تقسيم أفقي |
| `Ctrl-b d` | detach |

## عرض وإغلاق الجلسات

```bash
tmux ls
tmux kill-session -t work
```

وده فعلياً أغلب اللي هتحتاجه. الباقي هتتعلمه لما تفتح `man tmux` أول مرة
تحتاجه فعلاً.

---
title: whatsapp — a WhatsApp Client for Linux in C and GTK4
description: >-
  128 KB of C against GTK4 and WebKitGTK, pointed at web.whatsapp.com: in the
  tray, in your desktop's font, one notification per message, and an emoji cache
  that survives a restart. What it is, how it works, and what it is built on.
date: 2026-08-26T00:00:00.000Z
tags:
  - linux
  - fedora
  - ubuntu
  - gtk
  - webkit
  - whatsapp
  - c
  - packaging
  - arch
locale: en
draft: false
author: abdallah-shehawey
---

> **There is a better one now.**
> [**whatsapp-desktop**](/articles/rewriting-my-whatsapp-client-on-chromium) is
> the successor to the client described here, built on Electron and Chromium
> ([repository](https://github.com/abdallah-shehawey/whatsapp-desktop)). It does
> everything below and adds what WebKitGTK could not give this one: **voice and
> video calls with screen sharing**, and notifications read from WhatsApp Web's
> own store rather than inferred from its chat list — so reading a message on
> your phone takes its notification down at once, a deleted message takes its own
> with it, and a mention gets through a muted group without letting the rest of
> the group through behind it.
>
> Everything below is still true, and this client is still maintained. It is
> 120 KB against 245 MB, and the two install side by side. If that trade is the
> one you want, read on.

WhatsApp has no Linux client. What we have instead are wrappers: a window with a
browser engine inside it, pointed at `web.whatsapp.com`. That is a perfectly
reasonable design — it is the same client WhatsApp serves to Chrome, so nothing
about it can get your account banned.

**whatsapp** is mine. The binary is about 120 KB, written in C against GTK4 and
WebKitGTK 6 — and at this size the language is not what decides memory use, the
browser engine is. A Python wrapper would have cost perhaps 40 MB more; the
engine costs far more than that. C bought a couple of per cent. The real saving
came from the cache model, which is further down.

## What it is

- WhatsApp Web in a window of its own, with no browser UI around it.
- **In the tray**, speaking `StatusNotifierItem` over D-Bus. Closing the window
  keeps the client connected, and it can start hidden at login.
- **In your desktop's font** and its dark or light theme, both followed live.
- **One notification per message**, with the sender, the text and the sender's
  picture, and a click that opens that conversation.
- An unread badge on the dock icon, and pasted screenshots that actually arrive.

## What it is built on

GTK4 for the window, WebKitGTK 6 for the page, and nothing else:

```
src/main.c     2138 lines — the window, the view, the session, notifications
src/tray.c      421 lines — StatusNotifierItem, spoken directly over D-Bus
src/inject.js   877 lines — what runs inside WhatsApp's own page
```

`inject.js` is turned into a header at build time and compiled in, so the client
is still one binary with nothing beside it. There is no
`libayatana-appindicator`, no notification library and no JavaScript framework:
the dependencies are the two libraries above and the GLib that comes with them.

## The tray, without a tray library

GTK4 removed `GtkStatusIcon`, and the usual replacement is packaged only for
GTK2 and GTK3 — neither of which can be linked into a GTK4 process.

Underneath all of those wrappers is a D-Bus protocol, `StatusNotifierItem`, and
GNOME already runs a watcher for it. Speaking it directly costs one file and no
dependencies, and it hands you the parts a wrapper usually hides. The unread
count comes from WhatsApp's own document title, which becomes `(3) WhatsApp`
when chats are waiting, and that same number goes out again as a
`com.canonical.Unity.LauncherEntry` signal — which is what puts the badge on the
dock icon.

## The cache model, which is where the memory went

The client that sent me down this road sat at 1.8 GB. Two things were behind it,
and neither was the one everybody assumes.

On disk, `serviceworkers/Scripts` held **1.4 GB — 267 copies of the same file**,
about 5.3 MB each, six months' worth. WhatsApp Web ships a new service-worker
build every day or two and WebKitGTK never evicts the superseded ones. Nothing
reaps them. This client reaps them at startup, and the cache settles at about
5 MB.

In memory, the answer was not a smaller ceiling. Capping WebKit's cache makes it
*worse*: the page re-fetches and re-decodes what it just threw away, and you pay
for the same bytes twice. What works is a memory-pressure handler that lets the
cache stay large while there is room and releases it when the system actually
asks — so the client is generous when the machine is idle and gets out of the
way when it is not.

## Emoji that survive a restart

WhatsApp Web does not draw emoji with a font. It draws them from **152 sprite
sheets** of about 30 KB each and picks which set to fetch from your display
resolution — and WebKit's disk cache kept not one of them, so every launch
pulled 4.7 MB down again and the emoji panel sat full of blank squares for half a
minute.

Warming them on startup is the obvious fix and it is the wrong one: WhatsApp
preloads every sheet itself with an XHR, so a warm-up races that preload for the
same bytes over the same connections and both halves arrive slower. This client
caches the sheets to disk itself instead, keyed by URL, and serves them back on
the next launch. The panel is filled before you can open it.

## The page fixes

Three small things run inside WhatsApp's own page, each because the engine
underneath needed them:

- **The clipboard.** WebKitGTK handed the page an empty `clipboardData` for
  images, so a real Ctrl+V arrived with nothing in it. The bytes are lifted off
  the GTK clipboard and dispatched into the page by hand.
- **The user agent.** WebKit's default identifies as Safari on a Mac, and
  WhatsApp offers you the Mac app forever. It is replaced with one WhatsApp reads
  as a Linux desktop browser.
- **Arabic.** WhatsApp's line boxes do not leave room for the descenders Arabic
  needs, and the bowl of a final ن or ي gets shorn off. The fix is a wider clip,
  never a taller line — `line-height` moves every Arabic line off the rhythm the
  page was designed on, and inside the composer a line one pixel too tall makes
  the box scrollable, which makes the browser scroll the caret back into view on
  every keystroke.

## Installing it

From the [shinux repository](/articles/shinux-package-repository):

```sh
sudo dnf install whatsapp     # Fedora and friends
sudo apt install whatsapp     # Debian, Ubuntu 24.04+
sudo pacman -S whatsapp       # Arch, with the repo added
```

If you have not added the repository yet:

```sh
curl -fsSL https://abdallah-shehawey.github.io/shinux-repo/install.sh | sudo sh
```

Packages are also attached to every
[GitHub release](https://github.com/abdallah-shehawey/whatsapp/releases) — RPM,
DEB and a native Arch package.

## The source

[github.com/abdallah-shehawey/whatsapp](https://github.com/abdallah-shehawey/whatsapp),
GPL-3.0. The Chromium client that grew out of it is
[whatsapp-desktop](/articles/rewriting-my-whatsapp-client-on-chromium).

---
title: whatsapp-desktop — WhatsApp for Linux, on Chromium
description: >-
  A desktop client for WhatsApp Web built on Electron and Chromium: full voice and
  video call support, lives in the tray, draws the page in your desktop's own font,
  and raises one notification per message with the sender's picture on it. What it is,
  how it works, and what it is built on.
date: 2026-08-28T00:00:00.000Z
tags:
  - linux
  - fedora
  - ubuntu
  - arch
  - electron
  - chromium
  - whatsapp
  - packaging
locale: en
draft: false
author: abdallah-shehawey
---

WhatsApp has no Linux client. What we have instead are wrappers: a window with a
browser engine inside it, pointed at `web.whatsapp.com`. That is a perfectly
reasonable design — it is the same client WhatsApp serves to Chrome, so nothing
about it can get your account banned.

**whatsapp-desktop** is mine. It is the second one I wrote: the first,
[`whatsapp`](/articles/a-whatsapp-client-for-linux), is 128 KB of C against GTK4
and WebKitGTK, and it still exists and still works. This one starts from
Chromium instead, and keeps the parts of the first that were never about the
engine.

## What it is

- WhatsApp Web in a window of its own, with no address bar and nothing else in
  it.
- **Voice and video calls work out of the box.** Full hardware camera and
  microphone WebRTC support with automatic device permissions and Linux-specific
  rendering fixes.
- **Built-in Settings & Theme Switcher.** Switch between System Default, Dark Mode,
  and Light Mode, or toggle Autostart at login directly from the tray menu or via
  the dedicated Settings dialog (`Ctrl+,`).
- **In the tray.** Closing the window keeps the client connected and messages
  arriving. `Ctrl+Q` and the tray's own Quit are the two ways out, and it can
  start hidden at login.
- **In your desktop's font**, everywhere on the page — the family you chose in
  Settings, applied live when you change it.
- **One notification per message**, with the sender, the text and the sender's
  picture, a click that opens that conversation and brings the window back, and
  a withdrawal the moment you read it.
- Dark or light follows the desktop, links open in your browser, downloads land
  in `~/Downloads` without a dialog, `Ctrl` `+`/`-`/`0` zoom and the window size
  is remembered.

## What it is built on

Electron 40, which is Chromium plus Node in one process tree. The page is
WhatsApp's own; everything I wrote lives around it:

```
src/main.js        the window, the session, the tray, the switches
src/preload.js     the bridge — the page's world on one side, IPC on the other
src/page/inject.js the chat-list watcher and the notification shim, in the page
src/notify.js      the banner policy
src/style.js       the user stylesheet
src/fonts.js       the fontconfig file the client writes for itself
src/config.js      ~/.config/whatsapp-desktop/whatsapp-desktop.conf
```

It ships its own copy of Electron, so it needs no browser installed — 245 MB on
disk, 76 MB as a `.deb`. Chromium carries 55 UI translations and this
application shows no Chromium UI to translate, so only `en-US` and `ar` are
kept.

## How the font works

Chromium picks its default families from fontconfig, which answers with the
*system* default rather than with the font you chose for your desktop. So the
client reads the real answer from GSettings and imposes it two ways.

The first is a fontconfig file it writes for itself and re-executes into, which
covers the generic families — `sans-serif` and friends. The second is a
stylesheet of `@font-face` rules that alias the families WhatsApp asks for onto
that one face:

```css
@font-face { font-family: "Segoe UI"; src: local("PoetsenOne"); }
```

The family list is not hard-coded — the page reports the stack it actually asks
for at runtime, because WhatsApp changes it between builds.

The obvious approach, `* { font-family: X !important }` at user origin, works
and is what a browser told to ignore page fonts does. It also has to be resolved
against every element of every row WhatsApp recycles down a conversation, which
is paid for on every scroll. Aliasing costs nothing per element.

## How notifications work

This is most of the code, and it splits on where the focus is.

**While the window is away**, WhatsApp Web raises its own notification, and it is
by far the better judge of what just happened: it knows the sender, the text,
whether the chat is muted, and that what arrived is a message rather than a
typing indicator or something you sent from your phone. What it cannot do is
dress one or bring a window back from the tray. So the page's `Notification` is
intercepted, the sender's picture is fetched, and the app raises the banner
itself.

**While the window is in front**, WhatsApp stays silent — it can see it has your
attention — so the client watches the chat list instead. That is what makes one
banner per message possible: the document title cannot do it, because its number
counts unread *chats*, and a second and third message from the same person leave
`(1) WhatsApp` exactly as it was.

Two rules that are less obvious than they look:

- **A banner comes down on the client's own clock.** GNOME shows one at a time,
  queues three behind it and drops the rest, and a banner parked under an idle
  mouse pointer swallows every message that follows it. Each one is closed after
  twelve seconds and posted again at low urgency, which files it in the
  notification centre without a banner and without a sound. Nothing is lost and
  nothing blocks.
- **A notification is an unread message made visible**, so it is withdrawn once
  the message has been dealt with. Two things say so, and they are different in
  kind: the chat being the one on screen in a focused window, which is an answer
  and takes the banner down immediately; and the chat no longer being unread,
  which is an inference that arrives a beat later and is what covers reading the
  message on your phone.

There is no tone for the messages you send. The message is already on screen with
a tick under it, in the window you are looking at.

## Voice and video calls

Full voice and video calling works out of the box with your laptop's camera and
microphone:

- **Automatic permissions:** Media permissions (`audioCapture`, `videoCapture`,
  `speaker-selection`, `display-capture`) and device permissions are granted
  transparently for WhatsApp Web without annoying prompts or broken WebRTC origin checks.
- **Linux WebGPU fix:** Modern Chromium on Linux with Wayland/Mesa has a bug in
  its WebGPU implementation where `CreateExternalTexture` on camera video elements
  fails silently (`Invalid ExternalTexture`), causing WhatsApp's video effect pipeline
  to render pitch-black video frames. The client disables WebGPU to force WhatsApp
  onto its reliable, battle-tested WebGL / direct MediaStream pipeline.
- **Exempt call streams from muting:** WhatsApp Web's notification silencer never
  intercepts or mutes `<video>` playback elements, WebRTC `MediaStream` objects, or
  active call dialogs.

## Scrolling and the display server

Chromium decides GPU rasterisation per driver, from a blocklist years out of date
on Linux, so it is overridden and asked for explicitly; smooth scrolling is a
separate switch, on by default in Chrome and off in a bare Electron. The
conversation's message list is put on a compositor layer of its own, scoped to
that one element so the rest of the page does not pay for it.

The client also asks for Wayland natively rather than XWayland — the difference
between crisp text at a fractional scale and a blurry upscale, and between smooth
trackpad scrolling and stepped wheel events. It works out which one it is on from
both `XDG_SESSION_TYPE` and `WAYLAND_DISPLAY`, because the first is inherited
from the login session and is simply missing when a launcher does not pass the
whole environment on, and it prints the answer at startup.

## Memory

Signed in, seventy-one chats, freshly started and sitting on the chat list,
summed PSS across every process:

```
renderer (the WhatsApp page)   584 MB
main process                   125 MB
GPU and zygotes                169 MB
network and audio services      49 MB
-----------------------------------
total                          937 MB
```

Where that sits is worth knowing: 639 MB of the renderer is WhatsApp's own
JavaScript heap, DOM and decoded images, against 59 MB for the Electron binary
and its resources. The weight is the page, not the shell around it. On the same
laptop at the same moment, VS Code was using 2.1 GB and GNOME Shell 920 MB.

And on the same signed-out page, one tab each: Zen 353 MB, whatsapp-desktop
247 MB. A browser carries a browser — its UI, its extensions, its history, its
sync. This carries one page.

## Installing it

From the [shinux repository](/articles/shinux-package-repository):

```sh
sudo dnf install whatsapp-desktop     # Fedora and friends
sudo apt install whatsapp-desktop     # Debian, Ubuntu 24.04+
sudo pacman -S whatsapp-desktop       # Arch, with the repo added
```

Packages are also attached to every
[GitHub release](https://github.com/abdallah-shehawey/whatsapp-desktop/releases)
— `.rpm`, `.deb` and a native Arch `.pkg.tar.zst`.

The package installs a system-wide autostart entry, so the client starts hidden
in the tray at login. If you would rather it did not, turn it off in Settings →
Applications → Startup, or delete
`/etc/xdg/autostart/io.github.shehawey.whatsapp-desktop.desktop`.

Building it yourself needs Node and nothing else:

```sh
make            # fetches Electron
make install    # ~/.local, plus a desktop entry and icons
make autostart  # also start hidden at login
make test       # replays a chat list past the watcher, no browser needed
```

## Settings and appearance

Configuration can be tuned live through the dedicated **Settings** window (`Ctrl+,` or right-click the tray icon), or directly in `~/.config/whatsapp-desktop/whatsapp-desktop.conf`.

![WhatsApp Settings Dialog](/images/whatsapp-desktop-settings.png)

You can switch themes between System Default, Dark, and Light mode on the fly, toggle starting at login with a single switch, control notification sounds, and adjust interface scaling.

Configuration keys are saved immediately to `~/.config/whatsapp-desktop/whatsapp-desktop.conf` and every key is optional — font family and size, zoom level, close-to-tray behavior, and audio preferences.

## Why not Zen, or Firefox

This is the first thing I get asked. Gecko has had no embedding API since
XULRunner was retired, and GeckoView is Android-only — there is no way to put
Firefox's engine inside an application the way Electron carries Chromium's. The
only route is to ship a whole Firefox, locked to one site.

That costs the two things this client is for. Firefox has no tray, and nothing
outside a Wayland client can hide its window, so close-to-tray goes. And Firefox
raises its own notifications, which means no sender's picture, no click that
opens the conversation, and no control over how long a banner stays — which is
the entire notification story above.

## The source

[github.com/abdallah-shehawey/whatsapp-desktop](https://github.com/abdallah-shehawey/whatsapp-desktop),
GPL-3.0. The C client it grew out of is still
[where it was](https://github.com/abdallah-shehawey/whatsapp) — they install side
by side and share nothing, not even a state directory.

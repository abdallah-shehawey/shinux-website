---
title: whatsapp-desktop — WhatsApp for Linux, on Chromium
description: >-
  A desktop client for WhatsApp Web built on Electron and Chromium: full voice and
  video calls with screen sharing, lives in the tray, draws the page in your desktop's own font,
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
- **Voice, video calls, and screen sharing work out of the box.** Full hardware camera,
  microphone, and desktop screen capture via WebRTC with automatic device permissions
  and Linux/Wayland-specific fixes.
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
  a withdrawal the moment you read it — on your phone as readily as here.
- Dark or light follows the desktop, links open in your browser, downloads land
  in `~/Downloads` without a dialog, `Ctrl` `+`/`-`/`0` zoom and the window size
  is remembered.

## What it is built on

Electron 40, which is Chromium plus Node in one process tree. The page is
WhatsApp's own; everything I wrote lives around it:

```
src/main.js        the window, the session, the tray, the switches
src/preload.js     the bridge — the page's world on one side, IPC on the other
src/page/store.js  what WhatsApp's own model layer is asked, in the page
src/page/media.js  stickers, fetched whether or not photos are
src/page/inject.js the chat-list watcher and the notification shim — the fallback
src/notify.js      the banner policy
src/style.js       the user stylesheet
src/fonts.js       the fontconfig file the client writes for itself
src/config.js      ~/.config/whatsapp-desktop/whatsapp-desktop.conf
src/autostart.js   XDG autostart manager
```

It ships its own copy of Electron, so it needs no browser installed — 245 MB on
disk, 76 MB as a `.deb`. Chromium carries 55 UI translations and this
application shows no Chromium UI to translate, so only `en-US` and `ar` are
kept.

## Settings and appearance

Configuration can be tuned live through the dedicated **Settings** window (`Ctrl+,` or right-click the tray icon), or directly in `~/.config/whatsapp-desktop/whatsapp-desktop.conf`.

![WhatsApp Settings Dialog](/images/whatsapp-desktop-settings.png)

The settings window gives you instant control over every aspect of the client:

- **Theme Switcher:** Switch on the fly between System Default (which tracks your desktop's dark/light mode live), Dark Mode, and Light Mode. Chromium's `prefers-color-scheme` updates instantly without reloading the page.
- **Startup & Tray:** Toggle starting WhatsApp automatically at login with a single switch. Choose whether closing or minimizing the window sends it to the tray.
- **Notifications & Sounds:** Enable or disable desktop banners, incoming message tones, and outgoing send sounds.
- **Display & Text:** Adjust interface zoom scaling (`Ctrl` `+`/`-`/`0`) and toggle font fixes for Arabic descenders.

All preferences apply live and are saved permanently to `~/.config/whatsapp-desktop/whatsapp-desktop.conf`.

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

This is most of the code, and until recently all of it was guesswork.

WhatsApp Web is a page. The obvious way to know what has happened in it is to
watch what it draws: a row moves to the top of the chat list, so something
arrived; an unread pill goes away, so something was read; an `@` badge is on a
row, so that message was addressed to you. Each of those is an inference about a
picture drawn for a person, and each of them was wrong in a way that eventually
showed:

- the `@` badge stays on the row until the mention is *read*, so every ordinary
  message that followed one into a muted group was announced as though it were
  addressed to you;
- the pill is redrawn on WhatsApp's own clock, so "read on the phone" arrived
  seconds late — behind an observer's debounce, a grace period and a sweep — and
  did not arrive at all with the window in the tray, because a hidden renderer
  does not repaint a list nobody is looking at;
- nothing in a chat list can say that a message which *was* there has gone, so a
  message deleted for everyone left its notification behind for good.

None of it has to be guessed. `contextIsolation` is off for the main window, so
the page script shares WhatsApp's own world, and `window.require` is Meta's
module registry — `require('__debug').modulesMap` lists 16,866 modules on the
build I measured. The collections behind the interface are ordinary
Backbone-shaped models with events on them, and every question this client asks
has an answer WhatsApp is already computing:

| what is asked | what answers |
|---|---|
| a message arrived | `MsgCollection` `add`, with its type, its author and its mentions |
| it was read | `ChatCollection` `change:unreadCount` |
| which chat is on screen | `ChatCollection` `change:active` |
| it was deleted for everyone | `MsgCollection` `change:type` → `revoked` |
| somebody reacted | `ReactionsCollection`, keyed by the message reacted to |

The read signal is the one worth a number. Measured against a live account:
`change:unreadCount` fires **16 milliseconds** after the arrival it belongs to,
and again the instant the message is read — on the phone, here, or on another
desktop; WhatsApp does not say which and it does not matter. There is now no age
guard anywhere in the withdrawal path, because a guard belongs in front of a
guess and none of these is one.

Three rules that are less obvious than they look:

- **A banner comes down on the client's own clock.** GNOME shows one at a time,
  queues three behind it and drops the rest, and a banner parked under an idle
  mouse pointer swallows every message that follows it. Each one is closed after
  twelve seconds and posted again at low urgency, which files it in the
  notification centre without a banner and without a sound. Nothing is lost and
  nothing blocks.
- **Reading part of a conversation withdraws part of it.** WhatsApp counts the
  messages still waiting, and the ones it is counting are the last ones in the
  chat — so five unread becoming two means the oldest three have been read, and
  all but the newest two come down. That needs nothing from the read side but a
  number.
- **A notification is identified by its message, and keyed by its chat's id.**
  Not by what it says: two identical sentences hash the same, which cost a
  genuinely repeated message its banner. Not by a display name either — two
  chats can share one, and on the account I develop against three pairs do.

WhatsApp's own notification settings are honoured rather than re-invented, and
they are granular: there is a switch for reaction notifications under Messages
and a *separate* one under Groups, and "only messages that mention me" is a third.
Each is read at the moment of the decision, and each is an `and` with the
client's own setting — the client's switch stays the master, because it is the
one in the window you opened to turn notifications off.

There is no tone for the messages you send, and none for a message that lands in
the conversation you are already looking at. The bubble was drawn under your eyes
as it arrived; there is nothing left for an announcement to tell you.

**None of this is believed.** Those are private module names and they will not be
private for ever. Every lookup happens inside a `try`, every answer is checked
rather than trusted, and a store that does not resolve leaves the old chat-list
watcher exactly where it was, running the client the way it ran before any of
this existed. The test suite drives that path deliberately: it hands the page
script a world with no `window` at all, so the store never resolves and the
fallback is what gets exercised.

## Voice, video calls, and screen sharing

Full voice calling, video calling, and live screen sharing work out of the box with your laptop's camera, microphone, and display:

- **Screen sharing with PipeWire support:** In addition to voice and video calls, you can share your entire screen during calls. The client intercepts `navigator.mediaDevices.getDisplayMedia()` via Electron's `desktopCapturer` and passes the stream cleanly to WhatsApp Web, leveraging Chromium's native `WebRTCPipeWireCapturer` under Wayland without annoying third-party popups.
- **Automatic permissions:** Media permissions (`audioCapture`, `videoCapture`,
  `speaker-selection`, `display-capture`) and device permissions are granted
  transparently for WhatsApp Web without annoying prompts or broken WebRTC origin checks.
- **Linux WebGPU fix:** Modern Chromium on Linux with Wayland/Mesa has a bug in
  its WebGPU implementation where `CreateExternalTexture` on camera video elements
  fails silently (`Invalid ExternalTexture`), causing WhatsApp's video effect pipeline
  to render pitch-black video frames. The client disables WebGPU to force WhatsApp
  onto its reliable, battle-tested WebGL / direct MediaStream pipeline.
- **Exempt call streams and voice notes from muting:** WhatsApp Web's notification silencer never
  intercepts or mutes `<video>` playback elements, WebRTC `MediaStream` objects,
  incoming/outgoing call dialogs, or voice message audio (`blob:` / CDN streams).

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

Every command below, plus the by-hand key and repository steps for each package
manager, is also on the client's own page —
[abdallah-shehawey.github.io/whatsapp-desktop](https://abdallah-shehawey.github.io/whatsapp-desktop/),
which reads its download links straight off the newest release.

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
GPL-3.0, with a landing page at
[abdallah-shehawey.github.io/whatsapp-desktop](https://abdallah-shehawey.github.io/whatsapp-desktop/)
if you would rather hand somebody a download link than a repository.

It installs *alongside* the C client rather than over it: two separate packages
with separate state directories, so you can run both, and removing one leaves
the other untouched.

---
title: The WhatsApp Client I Had to Write
description: >-
  WhatsApp on my laptop was eating two gigabytes, refusing to paste images, and
  telling WhatsApp it was Safari on a Mac. Several bugs, causes nobody would guess,
  and a small C client that fixes all of them.
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
locale: en
draft: false
author: abdallah-shehawey
---

WhatsApp has no Linux client. What we have instead are wrappers: a window with a
browser engine inside it, pointed at `web.whatsapp.com`. That is a perfectly
reasonable design — it is the same client WhatsApp serves to Chrome, so nothing
about it can get your account banned — and for a while the one I used was fine.

Then I started noticing. It sat at 1.8 GB of RAM. Pasting a screenshot into a
chat did nothing at all. And WhatsApp kept offering to sell me the Mac app.

Each of those turned out to have a cause I would never have guessed from the
symptom, so this is the write-up. The client I ended up writing is
[on GitHub](https://github.com/abdallah-shehawey/whatsapp), and it is in the
[shinux repository](/articles/shinux-package-repository) if you want it rather
than the story.

## 1.4 GB of dead cache

The first thing I did was look at the disk, not the memory:

```
~/.local/share/wasistlos/serviceworkers/Scripts   1.4 GB
~/.local/share/wasistlos/databases                564 MB
```

That 1.4 GB was **267 copies of the same file**, about 5.3 MB each, accumulated
over six months. WhatsApp Web ships a new service-worker build every day or two,
and WebKitGTK never evicts the superseded ones. Nothing reaps them; they just
pile up.

Deleting them freed 1.4 GB and the cache rebuilt itself at 5.4 MB. So 99.6% of
it was garbage.

It also barely touched the memory. That was my first useful lesson: disk and RAM
looked like the same problem and were not.

## Capping the memory made it worse

The real memory use is WhatsApp Web's own JavaScript heap and IndexedDB working
set, and it genuinely wants around 1.5 GB. My first idea was to put a ceiling on
it with a systemd cgroup:

```
MemoryHigh=1100M
```

Within minutes the app froze solid and GNOME started showing *"WhatsApp is not
responding"*. The kernel's own numbers said exactly what had happened:

```
memory.pressure:  full avg10=63.70     <- stalled ~64% of the time
cpu.pressure:     full avg10=0.00      <- not busy at all
memory.events:    high 131809          <- reclaim attempts
```

A cgroup limit can only evict pages, and it has no idea which ones matter. Below
the working set it just thrashes: reclaim a page, fault it back, repeat, 131,809
times.

The right tool was sitting in WebKit the whole time.
`WebKitMemoryPressureSettings` lets the engine manage its own ceiling — it drops
caches and runs garbage collection as it approaches the limit, because it knows
what is discardable and the kernel does not.

> If you take one thing from this article: do not cgroup-cap an application below
> its working set. Give the application a memory budget it understands, or give
> it the memory.

## Ctrl+V did nothing

This is the one I spent longest on, and I was wrong twice before I was right.

WhatsApp Web reads pasted images out of the `paste` event's `clipboardData`. So
I logged what it actually receives:

```
paste  types=[]  items=[]  files=[]
```

Empty. Completely empty — while `wl-paste --list-types` confirmed a perfectly
good `image/png` sitting on the clipboard. WebKitGTK simply does not put images
into the DataTransfer that the page sees.

My first fix was to enable `javascript-can-access-clipboard`, which is off by
default, so the page could call `navigator.clipboard.read()` instead. It made no
difference to a real Ctrl+V: that API needs transient user activation and throws
`NotAllowedError` inside a paste handler.

My second idea was better. WebKit *does* still insert an `<img src="blob:...">`
into the page by itself, which means it is holding the decoded image — so the
bridge could lift the blob back out of the DOM, undo the insertion, and
re-dispatch a proper paste event. That worked beautifully in a test page and did
nothing at all in WhatsApp:

```
paste seen: types=[] files=0
  -> GAVE UP: WebKit inserted no blob image after 5 tries
```

WhatsApp's message composer is plaintext-only. WebKit will not insert an image
into a plaintext-only editable, so there was no blob to recover.

The answer, once it was obvious, was to stop negotiating with WebKit at all. The
image is on the **GTK** clipboard, where it has been readable the whole time.
The client intercepts Ctrl+V itself, reads the bytes with
`gdk_clipboard_read_async`, and hands them to the page:

```c
/* Let text paste take WebKit's native path, which works fine. */
if (!clipboard_holds_image_only(GTK_WIDGET(self->window)))
    return GDK_EVENT_PROPAGATE;
paste_clipboard_image(self);
return GDK_EVENT_STOP;
```

Text paste is deliberately left alone. It was never broken, and the fastest way
to break it would be to "fix" it.

## WhatsApp thought I was on a Mac

WhatsApp kept offering the Mac download, and my phone listed the linked device
as *"Safari (Mac OS)"* — even though the code was setting a Chrome user agent.
Reading the setting back confirmed it was set. Reading `navigator.userAgent`
from inside the page told a different story:

```
what the app set:   Mozilla/5.0 (X11; Linux x86_64) ... Chrome/140.0.0.0
what the page saw:  Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) ... Safari/605.1.15
```

WebKitGTK ships **site-specific quirks**: a list of hosts whose user agent it
deliberately rewrites, because sites have historically blocked Linux browsers.
`whatsapp.com` is on that list, and the quirk beats whatever the application
sets. One line fixes it:

```c
webkit_settings_set_enable_site_specific_quirks(settings, FALSE);
```

The lesson generalises: verify what the page *sees*, never what you set.

## No notifications while the window was open, and the fix that broke something else

Messages arrived silently whenever the app was in front of me. WhatsApp Web
suppresses desktop notifications when it believes the window is focused, so the
obvious move is to tell the page it never is:

```js
Object.defineProperty(document, 'hasFocus', { value: () => false });
```

That works. It also quietly breaks read receipts, and it took a while to connect
the two, because the symptom shows up on the *other* person's phone: I would open
a chat, read it, reply — and the sender never saw the blue ticks. WhatsApp reads
the same signal for both questions. "Is the user looking at this?" decides whether
to raise a notification *and* whether the chat on screen counts as read. Pin it to
false and you have told WhatsApp the user is never looking, at anything, ever.

There is no clever answer here, only an honest one: report the real state. WebKit
cannot supply it — a WebView in a window hidden in the tray still reports itself
focused — so the application pushes it in from GTK, where the truth lives:

```c
const gboolean focused = gtk_widget_get_visible(GTK_WIDGET(window)) &&
                         gtk_window_is_active(window);
```

Now the page is told what is actually happening. WhatsApp raises its own
notification while the window is away, receipts go out while it is in front, and
the one gap left — a message arriving while the window is focused, where WhatsApp
deliberately stays silent — is filled by a notification from the application
itself, carrying the sender, the message and the contact's photo.

The lesson generalises past this client: when a page asks the browser a question
about the user, lying is not a local change. Something else is reading the same
answer.

## A tray icon with no library

GTK4 removed `GtkStatusIcon`, and the usual replacement — libayatana-appindicator
— is packaged only for GTK2 and GTK3, neither of which can be linked into a GTK4
process.

Underneath all of them is a D-Bus protocol, `StatusNotifierItem`, and GNOME
already runs a watcher for it. Speaking it directly costs one file, no
dependencies, and gives you the parts a wrapper usually hides. The unread count
comes from WhatsApp's own document title, which becomes `(3) WhatsApp` when chats
are waiting; that same number goes out again as a
`com.canonical.Unity.LauncherEntry` signal, which is what puts the badge on the
dock icon.

## The result

```
whatsapp     79 KB
```

Written in C against GTK4 and WebKitGTK 6, because at this size the language is
not what determines memory use — the browser engine is. A Python wrapper would
have cost about 40 MB more; the engine costs 1500. Choosing C bought roughly 2%,
and the actual savings came from the cache model and the pressure handler.

It starts hidden at login, sits in the tray, follows your desktop's dark mode and
interface font, and pastes screenshots.

Two later fixes are worth keeping for the same reason as the rest — the cause was
nowhere near the symptom. Emoji looked soft and sometimes failed to appear at all:
they are sprite sheets chosen by display resolution, and a zoomed view still
reports 1x, so 40px tiles were being stretched across 60 device pixels. And text
twitched up and down while being typed, because a `line-height` one pixel taller
than WhatsApp's own made the composer's content overflow its box — and a box with
one pixel of overflow is a scrollable box, so the browser scrolled the caret back
into view on every keystroke. That `line-height` had been added to fix the
twitching.

```sh
sudo dnf install whatsapp     # Fedora and friends
sudo apt install whatsapp     # Debian, Ubuntu 24.04+
```

The source is at
[github.com/abdallah-shehawey/whatsapp](https://github.com/abdallah-shehawey/whatsapp).

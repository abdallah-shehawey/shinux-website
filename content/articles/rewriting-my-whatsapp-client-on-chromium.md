---
title: I Rewrote My WhatsApp Client on Chromium — and Measured Everything
description: >-
  The C client I wrote worked, and WebKitGTK kept it from being good. Rebuilding
  it on Chromium answered three bugs for free and introduced one of my own: my
  own stylesheet was what made scrolling stutter. Real numbers for RAM, for
  scrolling, and for why it is not built on Zen.
date: 2026-08-28T00:00:00.000Z
tags:
  - linux
  - fedora
  - ubuntu
  - arch
  - electron
  - chromium
  - whatsapp
  - performance
  - packaging
locale: en
draft: false
author: abdallah-shehawey
---

A while ago I wrote [a WhatsApp client for Linux](/articles/a-whatsapp-client-for-linux):
120 KB of C against GTK4 and WebKitGTK, in the tray, in my desktop's font, one
notification per message. It worked. I used it every day.

And every hard thing about it was WebKit.

The clipboard handed the page nothing for images. The user agent got rewritten
behind my back until WhatsApp thought it was Safari on a Mac. A window hidden in
the tray reported itself focused, which is a lie that costs you either every
notification or every read receipt. The disk cache kept none of the emoji sheets,
so every launch pulled 4.7 MB down again. And the line boxes shaved the tails off
Arabic.

I fixed all of it, and each fix was a workaround for the engine rather than a
feature of the client. So I rebuilt the thing on Chromium, kept the parts that
were never about WebKit — which is almost the whole notification story — and
measured, because the interesting part of this is not what I chose. It is what
the numbers said when I stopped guessing.

## Why not Zen

This is the first thing I get asked, and it was the first thing I wanted.

Zen is smooth. Scrolling a long chat in it feels like nothing at all, WhatsApp
Web behaves, the fonts are right. So the obvious idea is the one the Zen authors
had: Zen is built on Firefox, so build mine on Zen — a browser that opens one
site, wears my icon, and lives in the tray.

You cannot. **Gecko has had no embedding API since XULRunner was retired.** There
is no way to put Firefox's engine inside your application the way Electron puts
Chromium in it. What you can do is ship a whole copy of Zen and dress it: a
private profile, a `userChrome.css` that hides the tab bar and the address bar,
and an autoconfig script with privileged access to the browser's own internals.
People do this. It works.

It stops working at the tray. **Firefox has no tray icon**, and nothing outside a
Wayland client can hide that client's window — there is no protocol for it. So
"close the window and stay connected" — the one behaviour that makes this a
messaging app rather than a tab — would need the whole thing pushed back onto
XWayland so an external process could unmap the window, or a privileged chrome
script poking at `nsIBaseWindow.visibility` from the inside and a tray helper
talking to it over a socket. Every Zen update is a chance for that to break.

Chromium has a tray, a hide, and an API for both.

## The RAM question, with numbers

The reason I did not want Electron is the reason everybody does not want
Electron. So I measured it rather than repeating it. Same page — signed out,
`web.whatsapp.com`, nothing else open — and summed PSS across every process of
each, which is the number that counts shared memory once:

```
Zen (fresh profile, one tab)   353 MB
whatsapp-desktop               247 MB
```

Electron is the lighter of the two here. That surprised me until I said it out
loud: a browser carries a browser — its own UI, its extension machinery, its
process model, its history and its sync. This carries one page.

That is a login screen, not a signed-in session over three days, and I would not
publish it as a general claim about Electron. It is enough to answer the specific
question I had, which was whether starting from Chromium put me in a hole. It
did not.

## Three fixes I got to delete

Rebuilding on a different engine means finding out which of your fixes were
fixes and which were bandages.

**The clipboard shim is gone.** WebKitGTK gave the page an empty `clipboardData`
for images — a real Ctrl+V fired `paste` with `types=[] items=[] files=[]` — so
the old client read the image off the GTK clipboard itself and dispatched a
synthetic paste event with the bytes attached. Chromium's clipboard is not
broken. Ctrl+V pastes a screenshot.

**The focus lie is gone.** WebKit reported a view in a hidden window as focused,
so the truth had to be pushed in from the application, and getting it wrong in
either direction was expensive: pin it to `false` and you get notifications and
lose every read receipt. Chromium tells the truth. Measured, with the window
driven from the outside:

```
hidden   document.hasFocus() -> false
shown    document.hasFocus() -> true
```

**The emoji sprite cache is gone.** Nothing on that machine kept WhatsApp's 152
sprite sheets between runs — WebKit's disk cache stored not one of them — so the
old client stored them itself in `CacheStorage` and rewrote the CSS to draw from
`blob:` URLs. That is a lot of code to carry on the assumption that another
engine has the same bug, so it went. If the sheets ever start coming down on
every launch again, it comes back.

## The bug I brought with me

Then the scrolling stuttered. In a browser the same conversation glides; in my
client it caught.

My first instinct was the GPU, and it was half right: Chromium's rasterisation
was off, blocklisted by a driver list that is years out of date on Linux.
Forcing it on is one switch. It made no difference.

So I stopped guessing and built a probe into the client — sixty real wheel
events sent as input, with the page timing itself around them. My first metric
was frame intervals, and it was the wrong one: a window that is not being
composited runs `requestAnimationFrame` free of vsync, so "6 ms a frame" reads
as excellent when it means the page was not on screen at all. What actually
makes a scroll feel bad is the main thread being busy when the wheel turns, so I
measured that instead — long tasks, and how far the conversation actually moved.

The answer was my own stylesheet.

To draw WhatsApp in the desktop's font I was doing what a browser told to ignore
page fonts does: a universal rule at user origin, which is the one level whose
`!important` beats the page's own.

```css
* { font-family: "PoetsenOne", system-ui, sans-serif !important; }
```

It works, and it is paid for on every scroll. Every element of every row
WhatsApp recycles down a conversation has its font resolved against a rule that
matches everything. Over the same ~2100 px of a live chat:

```
with the universal rule      212 ms blocked, worst single stall 139 ms
without it                    82 ms blocked, worst single stall  82 ms
```

Applying it to a chat list that was not even moving cost 139 ms on its own.

## Making the font free

So the substitution had to move somewhere that costs nothing per element. There
are two candidates and I tried both.

**fontconfig** does it at font lookup rather than at style resolution. A private
config, `FONTCONFIG_FILE` pointing at it, and every family WhatsApp names gets
renamed to mine. `fc-match` agreed immediately:

```
$ FONTCONFIG_FILE=~/.local/share/whatsapp-desktop/fonts.conf fc-match "Roboto Variable"
PoetsenOne-Regular.ttf: "PoetsenOne" "Regular"
```

And Chromium ignored it. Measured by rendering the same string and reading its
width back:

```
"Roboto Variable"        333.0 px      <- the real Roboto, still
"PoetsenOne"             336.8 px
a family that exists nowhere  336.8 px  <- so the generic IS being substituted
```

That last line is the interesting one. fontconfig's `sans-serif` alias is
honoured — an unknown family lands on my font. What is not honoured is renaming
a family the page asks for by name and the system actually has. Skia takes the
font it can find and does not apply the pattern edit.

**`@font-face` with `local()`** is the other way, and it has no selector to
match either:

```css
@font-face { font-family: "Roboto Variable"; src: local("PoetsenOne"); }
```

Measured: 336.8 px. Identical to asking for the font directly. That is what
ships, and the family names are read from the page rather than from a list I
wrote, because WhatsApp changes its stack — it currently leads with "Roboto
Variable", which no list written before that existed would have covered.

After: **zero long tasks** over the same scroll.

One trap on the way, worth writing down. `FONTCONFIG_FILE` has to be in the
environment the process was *executed* with. Setting it from JavaScript reaches
child processes and not this one, and I spent a while looking at a client that
drew Roboto while `fc-match` against its own config answered PoetsenOne. The
launcher exports it now, and the client restarts itself once if it did not
arrive.

## Notifications, and the sound that was not there

Messages arriving while the window was behind something made a sound. Messages
arriving while I was looking at the window did not.

That is two different notifications. When the window is away, WhatsApp Web
raises its own — and it is the better judge by far, because it knows the sender,
the mute state, and that what arrived is a message rather than a typing
indicator — and it plays its own tone through an `<audio>` element on the page.
When the window is in front, WhatsApp stays quiet, and my client does the
announcing for the chats you are not looking at.

Mine was silent because **GNOME plays a sound for a notification only when the
notification asks for one**, through the `sound-name` or `sound-file` hint of the
D-Bus call. Watching the bus, here is everything my client was sending:

```
string "whatsapp-desktop"
string "WhatsApp"                    <- summary
string "..."                         <- body
dict entry "sender-pid"
dict entry "desktop-entry"  -> io.github.shehawey.whatsapp-desktop
dict entry "urgency"        -> byte 1
dict entry "image-data"     -> the sender's picture
int32 -1
```

No sound hint, and no way to add one through Electron's API. So the client plays
the desktop's own notification sound itself, through the page — where it belongs
to the application's audio stream, follows its volume in the mixer, and needs no
player binary installed. Only for the banners it raises itself: WhatsApp still
plays its tone for the ones it raises, and two sounds for one message is worse
than none.

While I was in there, the notification identity. A banner titled
`io.github.shehawey.whatsapp-desktop` with a blank icon is not a bug in the
client — it means the `.desktop` file is not installed, so GNOME has nothing to
read the name and the icon out of. Running from a source tree does that. It is
not a code change; it is `make install`.

## A notification should not outlive its message

The last one is the one that annoyed me most. Read the message — here, or on the
phone — and the banner was still sitting in the notification centre. Read six
messages, six banners.

A notification is an unread message made visible, so it has no business staying
once the message stops being unread. The page reports which chats still hold
something waiting, and a banner is withdrawn as soon as its chat stops being one
of them. That covers the phone for free: WhatsApp Web clears the unread pill
whether the message was read here or there.

One guard, because the first version of this ate its own notifications: WhatsApp
draws the pill a beat *after* it moves the row, so the report arriving right
behind an arrival can still show the chat as caught up. Banners raised in the
last few seconds are left alone.

## What is actually in it

- WhatsApp Web in its own window. Same client WhatsApp serves to Chrome, so
  nothing here can get an account banned.
- The desktop's font, everywhere, for free.
- The tray: closing the window keeps the client connected, `Ctrl+Q` and the
  tray's own Quit are the two ways out, and it can start hidden at login.
- One notification per message, with the sender, the text, the sender's picture,
  a sound, a click that opens the conversation — and a withdrawal when it is
  read.
- Banners come down on the client's own clock. GNOME shows one at a time, queues
  three behind it and drops the rest, and a banner parked under an idle mouse
  pointer swallows every message that follows. Each one is closed after twelve
  seconds and refiled silently, so nothing is lost and nothing blocks.
- Links open in your browser, downloads land in `~/Downloads`, dark mode and the
  interface font follow the desktop as you change them.

The notification logic — what is a message, what is somebody typing, what did I
send from my phone, is this the chat already on screen — is the same code the C
client ended up with, carried over line for line. It is the part that was never
about the engine, and every bug it ever had was found by hand on a live session,
which means waiting for somebody to write to you and being unable to reproduce
what you just saw. It has a test rig now: a mock chat list replayed past the
watcher in plain node, seventeen checks, no browser and no account.

## Installing it

From the [shinux repository](/articles/shinux-package-repository):

```sh
sudo dnf install whatsapp-desktop     # Fedora and friends
sudo apt install whatsapp-desktop     # Debian, Ubuntu 24.04+
sudo pacman -S whatsapp-desktop       # Arch, with the repo added
```

The package installs a system-wide autostart entry, so it starts hidden in the
tray at login. If you would rather it did not, turn it off in Settings →
Applications → Startup, or delete
`/etc/xdg/autostart/io.github.shehawey.whatsapp-desktop.desktop`.

It ships its own copy of Electron, so it depends on no browser being installed —
246 MB on disk, 76 MB as a `.deb`. Chromium's 55 UI translations are 45 MB of
that and this application shows no Chromium UI to translate, so only `en-US` and
`ar` are kept.

Building it yourself needs Node and nothing else:

```sh
make            # fetches Electron
make install    # ~/.local, plus a desktop entry and icons
make autostart  # also start hidden at login
make test       # replay a chat list past the watcher, no browser needed
```

Configuration lives in `~/.config/whatsapp-desktop/whatsapp-desktop.conf` and
every key is optional — the font family and size, the zoom, whether closing the
window hides it, whether a notification makes a sound, and how long a banner
stays before it is refiled.

## The one about measuring

If there is a lesson in this it is not about Electron or WebKit.

Every wrong turn I took here came from being confident about a cause. The
scrolling was "obviously" the GPU. The font substitution "obviously" worked
because `fc-match` said so. Frame intervals were "obviously" the way to measure
smoothness, right up until they reported 164 fps for a window that was not being
drawn at all.

The measurements took an afternoon and every one of them contradicted me.

The client is at
[github.com/abdallah-shehawey/whatsapp-desktop](https://github.com/abdallah-shehawey/whatsapp-desktop),
and the C one it grew out of is still
[where it was](https://github.com/abdallah-shehawey/whatsapp) — they install side
by side and share nothing, not even a state directory.

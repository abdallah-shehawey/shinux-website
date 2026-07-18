---
title:
  en: Fixing No Audio After a PipeWire Update
  ar: حل مشكلة الصوت في Arch Linux
description:
  en: The three commands that fix 90% of 'no sound' issues on PipeWire.
  ar: الثلاث أوامر اللي بتحل 90% من مشاكل اختفاء الصوت بعد تحديث PipeWire.
date: 2026-07-10T00:00:00.000Z
tags:
  - audio
  - pipewire
  - troubleshooting
  - arch
locales:
  - en
  - ar
defaultLocale: en
draft: false
author: abdallah-shehawey
---

<!-- lang:en -->

If sound stopped working right after a system update, PipeWire's user
services probably crashed or got out of sync. Before anything drastic,
try restarting them.

## Step 1 — restart the PipeWire user services

```bash
systemctl --user restart pipewire pipewire-pulse wireplumber
```

## Step 2 — check they're actually running

```bash
systemctl --user status pipewire
```

You want to see `active (running)`. If it's crash-looping, check the logs:

```bash
journalctl --user -u pipewire -b --no-pager | tail -n 50
```

## Step 3 — as a last resort, reset the user config

```bash
mv ~/.config/pipewire ~/.config/pipewire.bak
systemctl --user restart pipewire pipewire-pulse wireplumber
```

This regenerates a clean default config. You can compare against your
backup afterward if you had custom tweaks in there.

Nine times out of ten, step 1 alone fixes it.

<!-- lang:ar -->

لو الصوت وقف فجأة بعد تحديث للنظام، غالباً خدمات PipeWire الخاصة بالمستخدم
حصلها كراش أو طلعت من المزامنة. قبل أي حل جذري، جرّب تعيد تشغيلها الأول.

## الخطوة 1 — إعادة تشغيل خدمات PipeWire

```bash
systemctl --user restart pipewire pipewire-pulse wireplumber
```

## الخطوة 2 — تتأكد إنها شغالة فعلاً

```bash
systemctl --user status pipewire
```

المفروض تشوف `active (running)`. لو بتعمل crash-loop، شوف اللوج:

```bash
journalctl --user -u pipewire -b --no-pager | tail -n 50
```

## الخطوة 3 — كحل أخير، ريسِت لإعدادات المستخدم

```bash
mv ~/.config/pipewire ~/.config/pipewire.bak
systemctl --user restart pipewire pipewire-pulse wireplumber
```

ده بيولّد إعدادات افتراضية نظيفة. تقدر تقارنها بالنسخة الاحتياطية بعدين لو
كان عندك تعديلات مخصصة فيها.

في 9 من كل 10 حالات، الخطوة 1 لوحدها بتحل المشكلة.

---
title: "حل مشكلة الصوت في Arch Linux"
description: "الثلاث أوامر اللي بتحل 90% من مشاكل اختفاء الصوت بعد تحديث PipeWire."
date: 2026-07-10
tags: [arch, audio, pipewire]
locale: ar
draft: false
---

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

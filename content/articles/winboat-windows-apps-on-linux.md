---
title: مشروع WinBoat لتشغيل تطبيقات الويندوز على لينكس عبر Docker
description: >-
  تشغيل تطبيقات الويندوز على لينكس باستخدام Containers (Docker) بدل الـ Virtual Machine التقليدي.
date: 2026-07-23T00:00:00.000Z
tags:
  - linux
  - windows
  - docker
  - tools
locale: ar
draft: false
author: abdallah-shehawey
---

هلا يا قوم 😅

الناس اللي عايزه تنزل لينكس بس مش عارفه تسيب ويندوز عشان برامج زي Microsoft Office أو Photoshop ؟

تمام... خلاص يعم، جبتلك الحل ومعدش عندك حُجّة تاني يا سيدي 😌

فيه مشروع اسمه WinBoat طالع من فترة كبيره لكن بدأ يتحسن اكتر من فتره قريبة نوعا ما، وفكرته حلوة جدًا بصراحة.

بيشغّلك تطبيقات الويندوز على لينكس باستخدام Containers (Docker) بدل الـ Virtual Machine التقليدي.

طب إيه اللي يميّزه عن الـ VM ؟

إنه مش بيشغّلك ويندوز كنظام منعزل وخلاص،

الـ Windows بيكون شغّال في الخلفية، والبرامج اللي متسطبة عليه بتظهرلك عادي في Application Menu بتاع لينكس .

يعني بدل ما كل مرة تفتح Virtual Machine وتستنى الويندوز يقوم عشان تفتح برنامج واحد،

انت بتدوس على البرنامج من لينكس يقوم WinBoat يشغّل الويندوز في الخلفية ويفتحلك التطبيق مباشرة وكأنه برنامج لينكس عادي (تجربة شبه الـ seamless integration) .

هو لسه بس في مرحلة الـBeta، فطبعًا مش كل حاجة Perfect وفيه Bugs متوقعة ،

بس التجربة مبشّرة جدًا لأي حد عايز يسطب لينكس ومش قادر يستغنى عن برامج الويندوز .

🔻دا لينك الريبوا لطريقة الـ setup بتاع البرنامج و docker :

[https://shehaweyblog.vercel.app/tutorials/linux-desktop-setup/winboat-windows-apps-on-linux](/tutorials/linux-desktop-setup/winboat-windows-apps-on-linux)

🔻ودا لينك الموقع نفسه :

https://www.winboat.app/

وخلاص بقي يا صديقي معدش عندك حُجّة ابقى هات حُجّة تانية بقي 😂

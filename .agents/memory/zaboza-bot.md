---
name: zaboza bot structure
description: بوت فيسبوك مسنجر عربي — هيكله وقراراته التصميمية
---

## الهيكل
- `artifacts/messenger-bot/` — جذر البوت
- `src/index.js` — تسجيل الدخول (retry 10×)، listenMqtt، حماية القروب
- `src/handler.js` — يُطبّع كل IDs عبر normalizeEvent()، يُوزّع للأوامر
- `src/state.js` — gameSessions, mathSessions, attackState, videoSessions, protectionState
- `src/commands/*.js` — أوامر عربية محملة ديناميكياً؛ راجع المجلد للقائمة الحالية
- `src/utils/images.js` — downloadImage بـ arraybuffer
- `src/utils/tts.js` — Google Translate TTS
- `src/utils/youtube.js` — ytsr + ytdl-core + fluent-ffmpeg
- `src/utils/translate.js` — قاموس عربي→إنجليزي لـ loremflickr

## config.json
- `adminUIDs`: ["61594304253023"] — ID المطور
- `prefix`: "!"

## مشكلة appstate منتهية الصلاحية
عند ظهور "Error retrieving userID" — الكوكيز منتهية. يحتاج المستخدم تجديد appstate.json.
البوت سيعيد المحاولة تلقائياً كل 30-150 ثانية (حتى 10 محاولات).

## ثبات التشغيل والكوكيز
تسجيل الدخول يعيد المحاولة بلا حد مع تعطيل autoReconnect المزدوج، ومثبت `pnpm run fix-cookies` يطبع JSON أو Cookie header إلى المصدر اليدوي الثابت.
- ملف `appstate.json` هو مصدر الكوكيز اليدوي الأول لتبديل الحسابات، وسر Replit `FACEBOOK_APPSTATE` احتياطي؛ لا تُطبع القيم ولا تُحفظ تلقائياً.

## حماية الكنيات
أوامر حماية الكنيات أُزيلت؛ لا تحتفظ بسلوك تلقائي يستعيد كنيات الأعضاء.

---
name: zaboza bot structure
description: بوت فيسبوك مسنجر عربي — هيكله وقراراته التصميمية
---

## الهيكل
- `artifacts/messenger-bot/` — جذر البوت
- `src/index.js` — تسجيل الدخول (retry 10×)، listenMqtt، حماية القروب
- `src/handler.js` — يُطبّع كل IDs عبر normalizeEvent()، يُوزّع للأوامر
- `src/state.js` — gameSessions, mathSessions, attackState, videoSessions, protectionState
- `src/commands/*.js` — 22 أمر بالعربية
- `src/utils/images.js` — downloadImage بـ arraybuffer
- `src/utils/tts.js` — Google Translate TTS
- `src/utils/youtube.js` — ytsr + ytdl-core + fluent-ffmpeg
- `src/utils/translate.js` — قاموس عربي→إنجليزي لـ loremflickr

## config.json
- `adminUIDs`: ["61592570080622"] — ID المطور
- `prefix`: "!"

## الأوامر (22)
عام: uid, بينغ, معلومات, تايم, مساعدة
القروب: نيم, كين, حماية, طرد, اضافة
الاتاك: اتاك, تايم
الترفيه: قبلة, زواج, طلاق, سجن, مدح, صورة, قول, نرد, فيديو
الألعاب: اسئلة, رياضيات

## مشكلة appstate منتهية الصلاحية
عند ظهور "Error retrieving userID" — الكوكيز منتهية. يحتاج المستخدم تجديد appstate.json.
البوت سيعيد المحاولة تلقائياً كل 30-150 ثانية (حتى 10 محاولات).

## توقيت الاتاك
`!تايم 15_30` يحفظ نطاقاً بالثواني، وأمر `!اتاك` يستخدم `setTimeout` متسلسلاً ليختار مدة جديدة بعد كل رسالة؛ `!تايم 20` يبقى توقيتاً ثابتاً.

## حماية الكنيات
الكنيات تُحفظ عند !حماية. البوت يُعيدها عند `log:user-nickname` في index.js.
اسم القروب يُعاد عند `log:thread-name`.

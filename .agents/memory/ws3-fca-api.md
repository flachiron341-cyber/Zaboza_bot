---
name: ws3-fca API quirks
description: الفروق الجوهرية بين ws3-fca وfca-unofficial الكلاسيكي — تسبّب أخطاء صامتة إذا أُهملت
---

## القاعدة الأهم
`api.sendMessage(msg, threadID)` يعيد **Promise** فقط — لا يقبل callback كـ 3rd argument.
إذا مررت callback كـ 3rd arg، تُعامَل كـ `replyToMessage` وتُسبّب: `"MessageID should be of type string and not String"`.

**الصحيح:**
```js
const msgInfo = await api.sendMessage(msg, threadID);
// msgInfo = { threadID, messageID, timestamp }
```

## أسماء الدوال الصحيحة
| الخاطئ (fca-unofficial) | الصحيح (ws3-fca) |
|--------------------------|-----------------|
| `api.setTitle(name, tid)`       | `api.gcname(name, tid, cb)`         |
| `api.changeNickname(n, t, uid)` | `api.setNickname(n, t, uid, cb)`    |
| لا يوجد مكافئ مباشر            | `api.gcmember("add"|"remove", uids, tid, cb)` |

## تطبيع IDs
ws3-fca أحياناً يُعيد IDs كـ String objects (ليس primitive strings).
يجب دائماً: `String(event.threadID)`, `String(event.senderID)`, `String(msgInfo.messageID)`.

**Why:** Map.get() لا يطابق String object مع primitive string في JavaScript.

## loremflickr + images
`responseType: "arraybuffer"` أكثر موثوقية من "stream" لتحميل loremflickr (يتبع الـ redirects تلقائياً).

## Google TTS
`https://translate.google.com/translate_tts?ie=UTF-8&q={text}&tl=ar&client=tw-ob` يعمل بـ arraybuffer ويعيد audio/mpeg صحيح (13KB+).

## انتهاء صلاحية الكوكيز
قد يعيد `ws3-fca` الخطأ `Error retrieving userID` عند انتهاء الجلسة أو رفضها مؤقتاً. يجب أن يبقى process شغالاً، وأن تعيد كل محاولة قراءة `appstate.json` من القرص دون طباعة محتوى الكوكيز.

**Why:** الكوكيز الجديدة قد تُستبدل أثناء تشغيل workflow، وإيقاف العملية يجعل المستخدم مضطراً لإصلاح التشغيل يدوياً بدلاً من الاكتفاء بتبديل الملف.

**How to apply:** استخدم إعادة محاولة دورية قصيرة، وتعامل مع أخطاء `login` المتزامنة وغير المتزامنة، وراقب تغيّر ملف `appstate.json` لتجربة الكوكيز الجديدة فوراً.

## أحداث القروب
قد يصل `log:subscribe` أكثر من مرة أو يصل بعد أن يرسل أمر الإضافة رسالته؛ يجب أن يكون إرسال صور الأحداث في معالج الحدث وحده مع منع تكرار قصير، وتجاهل صورة مغادرة البوت نفسه بعد خروجه.

**Why:** إرسال الصورة من أمر `اضافة` ومن event listener معاً كان يكررها، وإرسالها بعد خروج البوت يسبب خطأ Messenger 1545012.

**How to apply:** خصص صورة دخول البوت عن صورة دخول عضو عادي، واعتمد على `addedParticipants` و`leftParticipantFbId` قبل الإرسال.

## إيقاف مراقبة الملف
عند الإنهاء المنظم، استدعِ `fs.unwatchFile(appstatePath)` لكل مسار بدأ مراقبته بـ `fs.watchFile`.

**Why:** بقاء مراقب الملف مفتوحاً أبقى عملية البوت تعمل بعد استقبال `SIGTERM`، رغم تنفيذ دالة الإيقاف.

**How to apply:** أزل مراقبات الملفات داخل دالة `shutdown` بجانب إلغاء المؤقتات وإغلاق مستمع Messenger.

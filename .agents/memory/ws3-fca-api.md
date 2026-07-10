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

## appstate.json
يجب أن يكون في .gitignore — يحتوي كوكيز جلسة فيسبوك.

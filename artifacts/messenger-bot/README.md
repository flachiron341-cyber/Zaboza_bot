# 🤖 بوت فيسبوك مسنجر عربي

بوت مسنجر بالبادئة `!` مبني على مكتبة `ws3-fca`.

---

## ⚡ طريقة التشغيل

### 1. ضع الكوكيز
افتح `appstate.json` وضع فيه الكوكيز (بصيغة JSON مصفوفة).

> يمكنك استخدام إضافة [c3c-fbstate](https://github.com/c3cbot/c3c-fbstate) للمتصفح لتصدير الكوكيز.

### 2. إعدادات البوت
عدّل `config.json` كما تريد:
```json
{
  "prefix": "!",
  "botName": "بوتي",
  "adminUIDs": ["YOUR_UID_HERE"],
  "cooldown": 3
}
```

### 3. تشغيل البوت
البوت يعمل تلقائياً عبر workflow في Replit.

---

## 📁 هيكل المشروع

```
messenger-bot/
├── src/
│   ├── index.js          # نقطة البداية
│   ├── handler.js        # معالج الأوامر
│   ├── commands/         # ملفات الأوامر
│   │   ├── ping.js
│   │   ├── help.js
│   │   ├── info.js
│   │   └── uid.js
│   └── utils/
│       └── logger.js     # نظام السجلات
├── appstate.json         # كوكيز فيسبوك
└── config.json           # إعدادات البوت
```

---

## ➕ إضافة أمر جديد

أنشئ ملفاً جديداً في `src/commands/` بهذا الشكل:

```js
module.exports = {
  config: {
    name: "اسم_الأمر",        // الاسم (يُستخدم مع البادئة)
    aliases: ["اسم_بديل"],    // أسماء بديلة (اختياري)
    description: "وصف الأمر",
    usage: "!اسم_الأمر [معطيات]",
    cooldown: 5,               // ثواني الانتظار بين الاستخدامات
    adminOnly: false,          // هل للمشرفين فقط؟
  },

  async run({ api, event, args, config, botID }) {
    const { threadID, senderID } = event;
    // كودك هنا
    api.sendMessage("مرحباً!", threadID);
  },
};
```

---

## 🔧 الأوامر الافتراضية

| الأمر | الوصف |
|-------|-------|
| `!ping` | قياس سرعة الاستجابة |
| `!help` | قائمة الأوامر |
| `!help [أمر]` | تفاصيل أمر معين |
| `!info` | معلومات البوت |
| `!uid` | عرض ID المستخدم |

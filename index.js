const { login } = require("ws3-fca");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.json");
const appstatePath = path.join(__dirname, "appstate.json");

let config = {};
try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else {
    config = { prefix: "!", botName: "Zaboza Bot", listenEvents: true };
  }
} catch (e) {
  config = { prefix: "!", botName: "Zaboza Bot", listenEvents: true };
}

function loadAppState() {
  // 1. محاولة القراءة من ملف appstate.json إذا كان موجوداً وغير فارغ
  if (fs.existsSync(appstatePath)) {
    try {
      const content = fs.readFileSync(appstatePath, "utf-8").trim();
      if (content) {
        const data = JSON.parse(content);
        if (Array.isArray(data) && data.length > 0) {
          console.log(`🍪 تم قراءة ${data.length} كوكي من appstate.json بنجاح.`);
          return data;
        }
      }
    } catch (e) {
      console.log("⚠️ ملاحظة: ملف appstate.json فارغ أو تالف.");
    }
  }

  // 2. المحاولة البديلة: قراءة الكوكيز من متغير البيئة FACEBOOK_APPSTATE في Render
  if (process.env.FACEBOOK_APPSTATE) {
    try {
      const envData = JSON.parse(process.env.FACEBOOK_APPSTATE);
      if (Array.isArray(envData) && envData.length > 0) {
        console.log(`🍪 تم قراءة الكوكيز من متغير البيئة بنجاح.`);
        return envData;
      }
    } catch (e) {
      console.log("⚠️ خطأ في تحليل متغير البيئة FACEBOOK_APPSTATE.");
    }
  }

  return null;
}

function startBot() {
  const appState = loadAppState();
  if (!appState) {
    console.log("❌ خطأ: يرجى إضافة ملف appstate.json في المستودع أو إضافة متغير بيئي FACEBOOK_APPSTATE في Render يحتوي على الكوكيز.");
    process.exit(1);
  }

  console.log("⏳ جاري تسجيل الدخول إلى حساب الفيسبوك...");

  login({ appState: appState }, (err, api) => {
    if (err) {
      console.error("❌ فشل تسجيل الدخول (تحقق من صلاحية الكوكيز):", err);
      process.exit(1);
    }

    const botID = api.getCurrentUserID();
    console.log(`✅ تم تسجيل الدخول بنجاح! معرف البوت (ID): ${botID}`);
    console.log(`🤖 البوت يعمل الآن وجاهز لاستقبال الرسائل.`);

    api.setOptions({
      listenEvents: config.listenEvents !== false,
      selfListen: false,
      logLevel: "silent"
    });

    api.listenMqtt((err, event) => {
      if (err) return;

      if (event.type === "message" || event.type === "message_reply") {
        const senderID = String(event.senderID || "");
        const body = String(event.body || "").trim();

        if (senderID === String(botID)) return;

        const prefix = config.prefix || "!";
        if (body.startsWith(prefix + "ping")) {
          api.sendMessage("pong! 🏓 البوت يعمل بكفاءة على Render.", event.threadID);
        }
      }
    });
  });
}

startBot();

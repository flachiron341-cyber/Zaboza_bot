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
  console.log("⚠️ خطأ في قراءة ملف config.json، سيتم استخدام الإعدادات الافتراضية.");
  config = { prefix: "!", botName: "Zaboza Bot", listenEvents: true };
}

function loadAppState() {
  if (fs.existsSync(appstatePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(appstatePath, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        console.log(`🍪 تم قراءة ${data.length} كوكي من appstate.json بنجاح.`);
        return data;
      }
    } catch (e) {
      console.log("⚠️ فشل قراءة appstate.json: " + e.message);
    }
  }
  return null;
}

function startBot() {
  const appState = loadAppState();
  if (!appState) {
    console.log("❌ خطأ: لم يتم العثور على ملف appstate.json صالح أو أن الملف فارغ.");
    return;
  }

  console.log("⏳ جاري تسجيل الدخول إلى حساب الفيسبوك...");

  login({ appState: appState }, (err, api) => {
    if (err) {
      console.error("❌ فشل تسجيل الدخول:", err);
      return;
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

        // الرد التلقائي البسيط للتأكد من عمل البوت
        const prefix = config.prefix || "!";
        if (body.startsWith(prefix + "ping")) {
          api.sendMessage("pong! 🏓 البوت يعمل بكفاءة على Render.", event.threadID);
        }
      }
    });
  });
}

startBot();

const { login } = require("ws3-fca");
const fs = require("fs");
const path = require("path");
const http = require("http");

// خادم ويب وهمي لإرضاء منصة Render ومنع خطأ الـ Port
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Zaboza Bot is running live!");
}).listen(PORT, () => {
  console.log(`🌐 خادم الويب يعمل على البورت ${PORT}`);
});

const configPath = path.join(__dirname, "config.json");
const possibleAppstatePaths = [
  path.join(__dirname, "appstate.json"),
  path.join(__dirname, "appstate.js")
];

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
  for (const filePath of possibleAppstatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, "utf-8").trim();
        if (content.startsWith("module.exports")) {
          delete require.cache[require.resolve(filePath)];
          const data = require(filePath);
          if (Array.isArray(data) && data.length > 0) {
            console.log(`🍪 تم قراءة ${data.length} كوكي من ملف JS بنجاح.`);
            return data;
          }
        }
        if (content) {
          const data = JSON.parse(content);
          if (Array.isArray(data) && data.length > 0) {
            console.log(`🍪 تم قراءة ${data.length} كوكي من ملف JSON بنجاح.`);
            return data;
          }
        }
      } catch (e) {}
    }
  }

  if (process.env.FACEBOOK_APPSTATE) {
    try {
      const envData = JSON.parse(process.env.FACEBOOK_APPSTATE);
      if (Array.isArray(envData) && envData.length > 0) {
        return envData;
      }
    } catch (e) {}
  }

  return null;
}

function startBot() {
  const appState = loadAppState();
  if (!appState) {
    console.log("❌ خطأ: لم يتم العثور على كوكيز صالحة في ملف appstate.");
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

        const prefix = config.prefix || "!";
        if (body.startsWith(prefix + "ping")) {
          api.sendMessage("pong! 🏓 البوت يعمل بكفاءة على Render.", event.threadID);
        }
      }
    });
  });
}

startBot();

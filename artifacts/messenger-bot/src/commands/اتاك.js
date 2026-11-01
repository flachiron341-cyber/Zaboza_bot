const state = require("../state");

module.exports = {
    config: {
        name: "اتاك",
        aliases: ["attack", "سبام"],
        description: "يرسل رسائل مستمرة تلقائياً بالتوقيت المضبوط",
        usage: "اتاك [الرسالة] | اتاك ايقاف!",
        cooldown: 5,
        adminOnly: true,
    },

    async run({ api, event, args }) {
        const threadID = String(event.threadID);

        // —— إيقاف الاتاك ——
        if (args[0] === "ايقاف" || args[0] === "stop") {
            const current = state.attackState.get(threadID);
            if (!current || !current.active) {
                return api.sendMessage("⚠️ لا يوجد اتاك نشط حالياً.", threadID);
            }

            current.active = false;
            if (current.timeout) clearTimeout(current.timeout);
            state.attackState.delete(threadID);
            return api.sendMessage("✅ تم إيقاف الاتاك.", threadID);
        }

        // —— منع التشغيل المتزامن ——
        if (state.attackState.has(threadID)) {
            return api.sendMessage(
                "⚠️ الاتاك شغال بالفعل! أوقفه أولاً بـ !اتاك ايقاف",
                threadID
            );
        }

        if (!args.length) {
            return api.sendMessage(
                "❌ مثال: !اتاك مرحبا يا جماعة",
                threadID
            );
        }

        const message = args.join(" ");
        const configured = state.attackDelay.get(threadID) || {
            min: 5,
            max: 5,
        };
        const min = Number(configured.min);
        const max = Number(configured.max);

        await api.sendMessage(
            `✅ بدأ إرسال الرسائل بشكل مستمر تلقائياً.\n✉️ الرسالة: "${message}"\n⏱️ كل ${min === max ? `${min}` : `${min} و ${max}`} ثانية\n\n🛑 لإيقافه: !اتاك ايقاف`,
            threadID
        );

        // انشاء الجلسة وحفظها مباشرة
        const attackSession = {
            active: true,
            timeout: null,
            message,
            min,
            max
        };
        state.attackState.set(threadID, attackSession);

        // دالة حلقة الإرسال التلقائي
        const startLoop = () => {
            const current = state.attackState.get(threadID);
            if (!current || !current.active) return;

            // حساب الوقت بالثواني وتحويله إلى مللي ثانية
            const delaySec = min === max ? min : Math.floor(Math.random() * (max - min + 1)) + min;
            const delayMs = delaySec * 1000;

            current.timeout = setTimeout(async () => {
                const session = state.attackState.get(threadID);
                if (!session || !session.active) return;

                try {
                    await api.sendMessage(message, threadID);
                } catch (err) {
                    console.error("خطأ أثناء إرسال الاتاك:", err);
                }

                // جدولة الرسالة القادمة تلقائياً
                startLoop();
            }, delayMs);
        };

        // البدء بالجدولة فوراً
        startLoop();
    },
};

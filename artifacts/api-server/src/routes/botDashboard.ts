import { clerkClient, getAuth } from "@clerk/express";
import {
  ControlBotBody,
  ControlBotResponse,
  GetBotDashboardResponse,
  SaveBotSessionBody,
  SaveBotSessionResponse,
  UpdateBotSettingsBody,
  UpdateBotSettingsResponse,
  type BotDashboard,
} from "@workspace/api-zod";
import {
  getPaths,
  readJsonFile,
  writeEncryptedAppState,
  writeJsonAtomic,
} from "@workspace/bot-control";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { logger } from "../lib/logger";

type BotStatus = BotDashboard["status"];
type EventLevel = BotDashboard["recentEvents"][number]["level"];

interface ControlState {
  desiredState: "running" | "stopped";
  autoReconnect: boolean;
  messageDelaySeconds?: number;
  action?: "start" | "stop" | "save_and_run";
  commandId?: string;
  updatedAt?: string;
}

interface StatusState {
  status?: BotStatus;
  updatedAt?: string;
}

interface StoredBotEvent {
  id: string;
  timestamp: string;
  level: EventLevel;
  message: string;
}

const router: IRouter = Router();
const paths = getPaths(process.cwd());
const defaultControl: ControlState = {
  desiredState: "running",
  autoReconnect: true,
  messageDelaySeconds: 3,
};

function normalizeMessageDelaySeconds(value: unknown): number {
  const delay = Number(value);
  return Number.isInteger(delay) && delay >= 0 && delay <= 30 ? delay : 3;
}

function loadControl(): ControlState {
  try {
    const control = readJsonFile<Partial<ControlState>>(paths.controlFile, {});
    return {
      ...defaultControl,
      ...control,
      desiredState: control.desiredState === "stopped" ? "stopped" : "running",
      autoReconnect: control.autoReconnect !== false,
      messageDelaySeconds: normalizeMessageDelaySeconds(control.messageDelaySeconds),
    };
  } catch {
    return defaultControl;
  }
}

function loadStatus(): StatusState {
  try {
    return readJsonFile<StatusState>(paths.statusFile, {});
  } catch {
    return {};
  }
}

function loadEvents(): StoredBotEvent[] {
  try {
    const events = readJsonFile<unknown>(paths.eventsFile, []);
    if (!Array.isArray(events)) return [];
    return events
      .filter((event): event is StoredBotEvent => {
        if (!event || typeof event !== "object") return false;
        const candidate = event as Partial<StoredBotEvent>;
        return (
          typeof candidate.id === "string" &&
          typeof candidate.timestamp === "string" &&
          (candidate.level === "info" || candidate.level === "warn" || candidate.level === "error") &&
          typeof candidate.message === "string"
        );
      })
      .slice(-12)
      .reverse();
  } catch {
    return [];
  }
}

function hasConfiguredSession(): boolean {
  return (
    existsSync(paths.appStateFile) ||
    existsSync(`${paths.root}/artifacts/messenger-bot/appstate.json`) ||
    existsSync(`${paths.root}/artifacts/messenger-bot/cookies.txt`) ||
    Boolean(process.env.FACEBOOK_APPSTATE?.trim())
  );
}

function getDashboardState(): BotDashboard {
  const control = loadControl();
  const storedStatus = loadStatus();
  const updatedAt = storedStatus.updatedAt && !Number.isNaN(Date.parse(storedStatus.updatedAt))
    ? new Date(storedStatus.updatedAt)
    : null;
  const statusIsStale = !updatedAt || Date.now() - updatedAt.getTime() > 45_000;
  let status: BotStatus = storedStatus.status ?? "unknown";

  if (control.desiredState === "stopped") {
    status = "stopped";
  } else if (
    (status === "stopped" || status === "error" || status === "unknown") &&
    control.updatedAt &&
    (!updatedAt || Date.parse(control.updatedAt) > updatedAt.getTime())
  ) {
    status = "connecting";
  } else if (statusIsStale) {
    status = hasConfiguredSession() ? "unknown" : "error";
  }

  return GetBotDashboardResponse.parse({
    status,
    sessionConfigured: hasConfiguredSession(),
    messageDelaySeconds: control.messageDelaySeconds,
    typingIndicator: true,
    autoReconnect: control.autoReconnect,
    updatedAt,
    recentEvents: loadEvents().map((event) => ({
      ...event,
      timestamp: new Date(event.timestamp),
    })),
  });
}

async function requireDashboardAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const allowedEmail = process.env.DASHBOARD_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) {
    res.status(503).json({ error: "Dashboard administrator is not configured." });
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const isAllowed = user.emailAddresses.some(
      (address) =>
        address.verification?.status === "verified" &&
        address.emailAddress.trim().toLowerCase() === allowedEmail,
    );
    if (!isAllowed) {
      res.status(403).json({ error: "This account cannot manage the bot." });
      return;
    }
    next();
  } catch (error) {
    logger.error(
      { errorName: error instanceof Error ? error.name : "unknown" },
      "Could not verify dashboard administrator",
    );
    res.status(503).json({ error: "Administrator verification is temporarily unavailable." });
  }
}

function writeControl(
  values: Partial<ControlState> & Pick<ControlState, "action">,
): void {
  const current = loadControl();
  writeJsonAtomic(paths.controlFile, {
    ...current,
    ...values,
    commandId: randomUUID(),
    updatedAt: new Date().toISOString(),
  });
}

router.get("/bot/dashboard", requireDashboardAdmin, (_req, res): void => {
  res.json(getDashboardState());
});

router.post("/bot/session", requireDashboardAdmin, (req, res): void => {
  const parsed = SaveBotSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "أدخل ملف appstate بصيغة JSON صحيحة." });
    return;
  }

  // Keep the original objects after validating their shape; Facebook appstate
  // entries can include domain/path/expiry metadata needed by the cookie jar.
  const appState = req.body.appState as Array<Record<string, unknown>>;
  const cookies = appState.map((cookie) => ({
    cookieName: String(
      (typeof cookie.key === "string" ? cookie.key : "") ||
      (typeof cookie.name === "string" ? cookie.name : ""),
    ).trim(),
  }));
  if (
    appState.some((cookie) => typeof cookie.value !== "string") ||
    cookies.some((cookie, index) => !cookie.cookieName || !(appState[index].value as string)) ||
    !cookies.some((cookie, index) => cookie.cookieName === "c_user" && Boolean(appState[index].value)) ||
    !cookies.some((cookie, index) => cookie.cookieName === "xs" && Boolean(appState[index].value))
  ) {
    res.status(400).json({ error: "يجب أن يحتوي appstate على كوكي c_user و xs بقيم صالحة." });
    return;
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    res.status(503).json({ error: "التخزين الآمن للجلسة غير مهيأ على الخادم." });
    return;
  }

  try {
    writeEncryptedAppState(paths.appStateFile, appState, sessionSecret);
    writeControl({
      desiredState: "running",
      action: "save_and_run",
    });
    res.status(202).json(
      SaveBotSessionResponse.parse({
        accepted: true,
        message: "حُفظت الجلسة المشفرة وطُلب تشغيل البوت.",
      }),
    );
  } catch (error) {
    logger.error(
      { errorName: error instanceof Error ? error.name : "unknown" },
      "Could not save Messenger session",
    );
    res.status(500).json({ error: "تعذر حفظ الجلسة بأمان." });
  }
});

router.post("/bot/control", requireDashboardAdmin, (req, res): void => {
  const parsed = ControlBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "إجراء التشغيل غير صالح." });
    return;
  }
  const isStart = parsed.data.action === "start";
  writeControl({
    desiredState: isStart ? "running" : "stopped",
    action: isStart ? "start" : "stop",
  });
  res.status(202).json(
    ControlBotResponse.parse({
      accepted: true,
      message: isStart ? "طُلب تشغيل البوت." : "طُلب إيقاف البوت.",
    }),
  );
});

router.put("/bot/settings", requireDashboardAdmin, (req, res): void => {
  const parsed = UpdateBotSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "الإعدادات غير صالحة." });
    return;
  }
  writeControl({
    autoReconnect: parsed.data.autoReconnect,
    ...(parsed.data.messageDelaySeconds === undefined
      ? {}
      : { messageDelaySeconds: parsed.data.messageDelaySeconds }),
    action: "start",
  });
  res.json(UpdateBotSettingsResponse.parse(getDashboardState()));
});

export default router;

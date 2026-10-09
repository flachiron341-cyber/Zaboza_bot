export interface BotControlPaths {
  root: string;
  dataDirectory: string;
  appStateFile: string;
  controlFile: string;
  statusFile: string;
  eventsFile: string;
}

export function getPaths(startDirectory?: string): BotControlPaths;
export function encryptAppState(appState: unknown, secret: string): string;
export function decryptAppState(envelopeText: string | unknown, secret: string): unknown;
export function writeEncryptedAppState(
  filePath: string,
  appState: unknown,
  secret: string,
): void;
export function readEncryptedAppState(filePath: string, secret: string): unknown;
export function writeJsonAtomic(filePath: string, value: unknown, mode?: number): void;
export function readJsonFile<T>(filePath: string, fallback: T): T;

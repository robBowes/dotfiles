import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import { readFile, writeFile, unlink, access } from "fs/promises";
import { join } from "path";

const CDP_FILE = "/tmp/playwright-cdp.json";
const STORAGE_FILE = join(process.cwd(), "playwright/storage.json");
const RECORDING_FILE = "/tmp/playwright-recording.json";

export interface CDPInfo {
  wsEndpoint: string;
  pid: number;
  launchedAt: string;
}

export class BrowserNotRunningError extends Error {
  constructor(message = "Browser not running. Start with: launch") {
    super(message);
    this.name = "BrowserNotRunningError";
  }
}

export async function saveCDPEndpoint(wsEndpoint: string, pid: number): Promise<void> {
  const info: CDPInfo = {
    wsEndpoint,
    pid,
    launchedAt: new Date().toISOString(),
  };
  await writeFile(CDP_FILE, JSON.stringify(info, null, 2));
}

export async function loadCDPEndpoint(): Promise<CDPInfo | null> {
  try {
    const data = await readFile(CDP_FILE, "utf-8");
    return JSON.parse(data) as CDPInfo;
  } catch {
    return null;
  }
}

export async function removeCDPEndpoint(): Promise<void> {
  try {
    await unlink(CDP_FILE);
  } catch {
    // File may not exist
  }
}

export async function getBrowser(): Promise<Browser> {
  const info = await loadCDPEndpoint();
  if (!info) {
    throw new BrowserNotRunningError();
  }

  try {
    return await chromium.connectOverCDP(info.wsEndpoint);
  } catch (e) {
    // Browser died but file exists - clean up
    await removeCDPEndpoint();
    throw new BrowserNotRunningError("Browser process not responding");
  }
}

export async function hasStorageState(): Promise<boolean> {
  try {
    await access(STORAGE_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function loadStorageState(): Promise<string | undefined> {
  try {
    await access(STORAGE_FILE);
    return STORAGE_FILE;
  } catch {
    return undefined;
  }
}

export async function isRecording(): Promise<boolean> {
  try {
    await access(RECORDING_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function getPage(options?: { newPage?: boolean }): Promise<Page> {
  const browser = await getBrowser();
  const contexts = browser.contexts();
  const recording = await isRecording();

  // If recording, find the recording page by marker URL
  if (recording) {
    for (const ctx of contexts) {
      for (const page of ctx.pages()) {
        if (page.url().includes("recording=true")) {
          return page;
        }
      }
    }
  }

  // Get or create context with storage state
  let context: BrowserContext;

  if (contexts.length > 0) {
    context = contexts[0];
  } else {
    const storagePath = await loadStorageState();
    context = await browser.newContext(
      storagePath ? { storageState: storagePath } : undefined
    );
  }

  const pages = context.pages();

  if (options?.newPage || pages.length === 0) {
    return await context.newPage();
  }

  return pages[0];
}

// Utility to parse CLI args
export function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

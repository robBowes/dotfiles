import { z } from "zod";
import { defineTool } from "../lib/tool.js";
import { readFile, unlink } from "fs/promises";

const CDP_FILE = "/tmp/playwright-cdp.json";

export const close = defineTool({
  name: "close",
  description: "Close browser (stops the browser process)",
  schema: z.object({}),
  timeout: 10000,
  handle: async (ctx) => {
    // Read CDP file to get PID
    let pid: number | undefined;
    try {
      const data = await readFile(CDP_FILE, "utf-8");
      const info = JSON.parse(data);
      pid = info.pid;
    } catch {
      return { status: "not_running" };
    }

    // Try graceful close via CDP
    try {
      await ctx.ensureBrowser();
      await ctx.closeBrowser();
    } catch {
      // Ignore - browser may already be unreachable
    }

    // Force kill the process if it's still running
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Process already gone
      }
    }

    // Clean up CDP file
    await unlink(CDP_FILE).catch(() => {});

    return { status: "closed" };
  },
});

/**
 * Exit watchdog - ensures process exits even if cleanup hangs.
 * Pattern from MS Playwright MCP.
 */

let cleanupFn: (() => Promise<void>) | undefined;

export function setupExitWatchdog(cleanup?: () => Promise<void>) {
  cleanupFn = cleanup;
  let isExiting = false;

  const handleExit = async () => {
    if (isExiting) return;
    isExiting = true;

    // Force exit after 15s regardless of cleanup status
    setTimeout(() => {
      console.error("[watchdog] Force exit after 15s timeout");
      process.exit(1);
    }, 15000).unref();

    try {
      if (cleanupFn) await cleanupFn();
    } catch (e) {
      console.error("[watchdog] Cleanup error:", e);
    }
    process.exit(0);
  };

  // Handle various exit signals
  process.stdin.on("close", handleExit);
  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);
  process.on("SIGHUP", handleExit);
}

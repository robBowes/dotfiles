import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import { access, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { withTimeout } from "./timeout.js";

const CDP_PORT = 9222;
const CDP_CONNECT_TIMEOUT = 10000;
const CDP_FILE = "/tmp/playwright-cdp.json";

export interface ContextConfig {
  headless?: boolean;
  devtools?: boolean;
  storagePath?: string;
}

export class Context {
  private _browser: Browser | null = null;
  private _context: BrowserContext | null = null;
  private _page: Page | null = null;
  private _config: ContextConfig;
  private _runningTool: string | undefined;
  private _abortController = new AbortController();
  private _ownsBrowser = false; // Did we launch the browser or connect to existing?
  private _ownsContext = false; // Did we create the context or reuse existing?
  private _callerCwd: string | undefined; // Caller's working directory for storage state

  constructor(config: ContextConfig = {}) {
    this._config = config;
  }

  setCallerCwd(cwd: string) {
    this._callerCwd = cwd;
  }

  get abortSignal(): AbortSignal {
    return this._abortController.signal;
  }

  setRunningTool(name: string | undefined) {
    this._runningTool = name;
  }

  get runningTool(): string | undefined {
    return this._runningTool;
  }

  /**
   * Connect to browser via CDP. Auto-launches if not running.
   */
  async ensureBrowser(): Promise<Browser> {
    if (this._browser) return this._browser;

    // Try to connect to existing browser
    try {
      this._browser = await withTimeout(
        chromium.connectOverCDP(`http://localhost:${CDP_PORT}`),
        CDP_CONNECT_TIMEOUT,
        "CDP connect"
      );
      return this._browser;
    } catch {
      // No browser running, launch one
    }

    // Launch browser as detached process using the launch script
    await this.launchBrowserProcess();

    // Connect to it
    this._browser = await withTimeout(
      chromium.connectOverCDP(`http://localhost:${CDP_PORT}`),
      CDP_CONNECT_TIMEOUT,
      "CDP connect after launch"
    );

    return this._browser;
  }

  /**
   * Launch browser as detached background process.
   */
  private async launchBrowserProcess(): Promise<void> {
    const scriptDir = new URL(".", import.meta.url).pathname;
    const launchScript = join(scriptDir, "../launch.ts");

    const args: string[] = ["--fg"];
    if (this._config.headless) args.push("--headless");
    if (this._config.devtools) args.push("--devtools");

    // Spawn detached browser process
    const cmd = `cd "${scriptDir}" && nohup tsx "${launchScript}" ${args.join(" ")} > /dev/null 2>&1 &`;
    spawn("sh", ["-c", cmd], { detached: true, stdio: "ignore" }).unref();

    // Wait for CDP file to appear
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        await access(CDP_FILE);
        return;
      } catch {
        // Keep waiting
      }
    }

    throw new Error("Browser launch timeout - CDP file not created");
  }

  /**
   * Get or create a browser context with optional storage state.
   * Uses the browser's default context to persist across CDP sessions.
   */
  async ensureContext(): Promise<BrowserContext> {
    if (this._context) return this._context;

    const browser = await this.ensureBrowser();
    const contexts = browser.contexts();

    // Check for storage state - use caller's cwd if available
    const baseDir = this._callerCwd || process.cwd();
    const storagePath = this._config.storagePath ?? join(baseDir, "playwright/storage.json");

    // debug:`[context] Browser has ${contexts.length} contexts, callerCwd=${baseDir}`);

    // Use the first/default context (persists across CDP sessions)
    if (contexts.length > 0) {
      this._context = contexts[0];
      this._ownsContext = false;

      // Inject cookies from storage.json if available
      try {
        await access(storagePath);
        const storageData = JSON.parse(await readFile(storagePath, "utf-8"));
        if (storageData.cookies?.length) {
          await this._context.addCookies(storageData.cookies);
          // debug:`[context] Injected ${storageData.cookies.length} cookies from storage`);
        }
      } catch (e) {
        // debug:`[context] No storage to inject: ${e}`);
      }

      return this._context;
    }

    // No context exists - this shouldn't happen with a launched browser
    // debug:`[context] No contexts found, creating new one`);
    this._context = await browser.newContext({ ignoreHTTPSErrors: true });
    this._ownsContext = true;
    return this._context;
  }

  /**
   * Get or create a page.
   */
  async getPage(): Promise<Page> {
    if (this._page && !this._page.isClosed()) return this._page;

    const context = await this.ensureContext();
    const pages = context.pages();
    // debug(`[getPage] Context has ${pages.length} pages`);

    // Find a meaningful page (not blank/chrome)
    const meaningfulPage = pages.find(p => {
      const url = p.url();
      return url && !url.startsWith("about:") && !url.startsWith("chrome://");
    });

    if (meaningfulPage) {
      this._page = meaningfulPage;
      // debug(`[getPage] Using existing page: ${this._page.url()}`);
      return this._page;
    }

    // Use first page if exists, or create new
    if (pages.length > 0) {
      this._page = pages[0];
      // debug(`[getPage] Using blank page: ${this._page.url()}`);
      return this._page;
    }

    // debug(`[getPage] Creating new page`);
    this._page = await context.newPage();

    // Set default timeouts
    this._page.setDefaultTimeout(5000);
    this._page.setDefaultNavigationTimeout(60000);

    return this._page;
  }

  /**
   * Get page or throw if not initialized.
   */
  async requirePage(): Promise<Page> {
    const page = await this.getPage();
    if (page.url() === "about:blank") {
      throw new Error("No page loaded. Use navigate first.");
    }
    return page;
  }

  /**
   * Clean up resources. Browser always persists (disconnect only).
   */
  async dispose() {
    this._abortController.abort("Context disposed");

    // Never close context or browser - they persist across commands
    // Just disconnect from CDP
    if (this._browser) {
      // Disconnect without closing - browser continues running
      this._browser = null;
    }
    this._context = null;
    this._page = null;
  }

  /**
   * Fully close browser (use for explicit shutdown).
   */
  async closeBrowser() {
    if (this._browser) {
      await this._browser.close().catch(() => {});
      this._browser = null;
    }
    this._context = null;
    this._page = null;
  }
}

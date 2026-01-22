#!/usr/bin/env tsx
/**
 * Playwright skill CLI client.
 * Sends commands to the server via JSON-RPC.
 */
import { spawn, type ChildProcess } from "child_process";
import { createInterface } from "readline";
import { join } from "path";
import { readFile, writeFile, access, unlink } from "fs/promises";

const SERVER_PID_FILE = "/tmp/playwright-skill-server.json";
const SCRIPT_DIR = new URL(".", import.meta.url).pathname;

interface ServerInfo {
  pid: number;
  startedAt: string;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

let requestId = 1;

async function getServerInfo(): Promise<ServerInfo | null> {
  try {
    const data = await readFile(SERVER_PID_FILE, "utf-8");
    return JSON.parse(data) as ServerInfo;
  } catch {
    return null;
  }
}

async function saveServerInfo(pid: number): Promise<void> {
  await writeFile(
    SERVER_PID_FILE,
    JSON.stringify({ pid, startedAt: new Date().toISOString() })
  );
}

async function removeServerInfo(): Promise<void> {
  try {
    await unlink(SERVER_PID_FILE);
  } catch {}
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function startServer(): Promise<ChildProcess> {
  const serverPath = join(SCRIPT_DIR, "server.ts");

  const server = spawn("tsx", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    detached: false,
  });

  // Wait for ready signal
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server start timeout")), 10000);

    server.stderr?.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("[playwright-server] Ready")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    server.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });

    server.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0) reject(new Error(`Server exited with code ${code}`));
    });
  });

  await saveServerInfo(server.pid!);
  return server;
}

async function getOrStartServer(): Promise<ChildProcess> {
  const info = await getServerInfo();

  if (info && isProcessRunning(info.pid)) {
    // Connect to existing server - but we can't reconnect to stdio...
    // For simplicity, we always start a new server per command
    // This is OK because the server maintains browser state via CDP
  }

  await removeServerInfo();
  return startServer();
}

async function sendRequest(
  server: ChildProcess,
  method: string,
  params?: Record<string, unknown>
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const request = JSON.stringify({ jsonrpc: "2.0", id, method, params });

    const timeout = setTimeout(() => {
      reject(new Error("Request timeout"));
    }, 120000); // 2 minute timeout

    const rl = createInterface({ input: server.stdout! });

    rl.on("line", (line) => {
      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        if (response.id === id) {
          clearTimeout(timeout);
          rl.close();
          resolve(response);
        }
      } catch {}
    });

    server.stdin?.write(request + "\n");
  });
}

function parseArgs(args: string[]): { method: string; params: Record<string, unknown> } {
  const [method, ...rest] = args;

  if (!method) {
    console.error("Usage: pw <command> [args...]");
    console.error("Commands: navigate, click, fill, select, wait, snapshot, screenshot, evaluate, get_text, get_html, pdf, close");
    process.exit(1);
  }

  // Parse remaining args into params
  const params: Record<string, unknown> = {};
  const positional: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-/g, "_"); // Convert kebab to snake
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        // Check for boolean values
        if (next === "true") {
          params[key] = true;
        } else if (next === "false") {
          params[key] = false;
        } else if (/^\d+$/.test(next)) {
          params[key] = parseInt(next, 10);
        } else {
          params[key] = next;
        }
        i++;
      } else {
        params[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  // Map positional args based on method
  switch (method) {
    case "navigate":
      if (positional[0]) params.url = positional[0];
      break;
    case "click":
    case "wait":
    case "snapshot":
    case "get_text":
    case "get_html":
      if (positional[0]) params.selector = positional[0];
      break;
    case "fill":
      if (positional[0]) params.selector = positional[0];
      if (positional[1]) params.value = positional.slice(1).join(" ");
      break;
    case "select":
      if (positional[0]) params.selector = positional[0];
      if (positional[1]) params.value = positional[1];
      break;
    case "screenshot":
    case "pdf":
      if (positional[0]) params.path = positional[0];
      break;
    case "evaluate":
      if (positional.length > 0) params.script = positional.join(" ");
      break;
  }

  return { method, params };
}

async function main() {
  const args = process.argv.slice(2);
  const { method, params } = parseArgs(args);

  // Pass caller's cwd so storage state is resolved correctly
  params._cwd = process.cwd();

  const server = await getOrStartServer();

  try {
    const response = await sendRequest(server, method, params);

    if (response.error) {
      console.error(`Error: ${response.error.message}`);
      process.exit(1);
    }

    // Pretty print result
    const result = response.result;
    if (typeof result === "object" && result !== null) {
      // Special handling for snapshot - just print the snapshot string
      if ("snapshot" in result && typeof (result as { snapshot: string }).snapshot === "string") {
        console.log((result as { snapshot: string }).snapshot);
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } else {
      console.log(result);
    }
  } finally {
    // Shutdown server after each command (unless we just called shutdown)
    // The browser stays running via CDP, only the server process exits
    if (method !== "shutdown") {
      await sendRequest(server, "shutdown", {}).catch(() => {});
    }
    server.kill();
    await removeServerInfo();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

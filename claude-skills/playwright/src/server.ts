#!/usr/bin/env tsx
/**
 * Playwright skill server - JSON-RPC over stdio.
 * Long-running process that handles tool calls.
 */
import * as readline from "readline";
import { Context } from "./lib/context.js";
import { setupExitWatchdog } from "./lib/watchdog.js";
import { executeTool, type Tool } from "./lib/tool.js";
import { tools } from "./tools/index.js";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

const toolMap = new Map<string, Tool>(tools.map((t) => [t.name, t]));
const ctx = new Context();

function sendResponse(response: JsonRpcResponse) {
  console.log(JSON.stringify(response));
}

async function handleRequest(request: JsonRpcRequest): Promise<void> {
  const { id, method, params } = request;

  // Special methods
  if (method === "list_tools") {
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
    });
    return;
  }

  if (method === "shutdown") {
    sendResponse({ jsonrpc: "2.0", id, result: { ok: true } });
    await ctx.dispose();
    process.exit(0);
  }

  // Tool call
  const tool = toolMap.get(method);
  if (!tool) {
    sendResponse({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Unknown method: ${method}` },
    });
    return;
  }

  // Extract _cwd from params and set on context
  const rawParams = params as Record<string, unknown> | undefined;
  if (rawParams?._cwd && typeof rawParams._cwd === "string") {
    ctx.setCallerCwd(rawParams._cwd);
    delete rawParams._cwd;
  }

  ctx.setRunningTool(method);
  try {
    const { result, error } = await executeTool(tool, ctx, rawParams);
    if (error) {
      sendResponse({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: error },
      });
    } else {
      sendResponse({ jsonrpc: "2.0", id, result });
    }
  } finally {
    ctx.setRunningTool(undefined);
  }
}

async function main() {
  // Setup watchdog with cleanup
  setupExitWatchdog(async () => {
    await ctx.dispose();
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Signal ready
  console.error("[playwright-server] Ready");

  rl.on("line", async (line) => {
    if (!line.trim()) return;

    try {
      const request = JSON.parse(line) as JsonRpcRequest;
      await handleRequest(request);
    } catch (e) {
      // Invalid JSON
      console.log(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        })
      );
    }
  });

  rl.on("close", () => {
    ctx.dispose().finally(() => process.exit(0));
  });
}

main();

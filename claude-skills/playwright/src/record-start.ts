#!/usr/bin/env tsx
/**
 * Start video recording session (runs in background)
 * Usage: record-start [output.mp4] [--width 1280] [--height 720]
 *
 * Creates a recording context. Commands automatically use this context.
 * Stop with record-stop to finalize and compress video.
 */
import { chromium } from "playwright";
import { writeFile, mkdir, unlink, readFile, rm, readdir } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { parseArgs, loadCDPEndpoint, BrowserNotRunningError } from "./lib/browser.js";

const RECORDING_FILE = "/tmp/playwright-recording.json";
const CONTROL_FILE = "/tmp/playwright-recording-control";

export interface RecordingInfo {
  outputPath: string;
  videoDir: string;
  startedAt: string;
  width: number;
  height: number;
  pid: number;
}

const { positional, flags } = parseArgs(process.argv.slice(2));

const outputPath = positional[0] || `recording-${Date.now()}.mp4`;
const width = flags.width ? parseInt(flags.width as string, 10) : 1280;
const height = flags.height ? parseInt(flags.height as string, 10) : 720;

const cdpInfo = await loadCDPEndpoint();
if (!cdpInfo) {
  throw new BrowserNotRunningError();
}

// Create temp dir for video
const videoDir = `/tmp/playwright-videos-${Date.now()}`;
await mkdir(videoDir, { recursive: true });

// Connect and create recording context
const browser = await chromium.connectOverCDP(cdpInfo.wsEndpoint);

const context = await browser.newContext({
  recordVideo: {
    dir: videoDir,
    size: { width, height },
  },
  viewport: { width, height },
});

// Create initial page with marker URL
const page = await context.newPage();
await page.goto("about:blank?recording=true");

// Save recording info
const finalOutput = join(process.cwd(), outputPath.replace(/\.webm$/, ".mp4"));
const info: RecordingInfo = {
  outputPath: finalOutput,
  videoDir,
  startedAt: new Date().toISOString(),
  width,
  height,
  pid: process.pid,
};
await writeFile(RECORDING_FILE, JSON.stringify(info, null, 2));

console.log(`Recording started (PID ${process.pid})`);
console.log(`Output: ${finalOutput}`);
console.log(`Size: ${width}x${height}`);
console.log(`Stop with: record-stop`);

// Watch for stop signal
const checkStop = async () => {
  try {
    const control = await readFile(CONTROL_FILE, "utf-8");
    if (control.trim() === "stop") {
      await unlink(CONTROL_FILE);

      // Close context to finalize video
      await context.close();

      // Wait for video file
      await new Promise((r) => setTimeout(r, 500));

      // Find and process video
      const files = await readdir(videoDir);
      const videoFile = files.find((f) => f.endsWith(".webm"));

      if (videoFile) {
        const rawPath = join(videoDir, videoFile);

        console.log("\nCompressing video...");

        // Compress with ffmpeg
        const ffmpeg = spawn("ffmpeg", [
          "-i", rawPath,
          "-c:v", "libx264",
          "-crf", "23",
          "-preset", "medium",
          "-y",
          finalOutput,
        ], { stdio: ["ignore", "pipe", "pipe"] });

        ffmpeg.stderr.on("data", (d) => process.stderr.write(d));

        await new Promise<void>((resolve) => {
          ffmpeg.on("close", () => resolve());
        });

        console.log(`\nVideo saved: ${finalOutput}`);
      } else {
        console.error("No video file found");
      }

      // Cleanup
      await rm(videoDir, { recursive: true });
      await unlink(RECORDING_FILE);

      console.log("Recording stopped");
      process.exit(0);
    }
  } catch {
    // Control file doesn't exist yet
  }
  setTimeout(checkStop, 500);
};

checkStop();

// Handle signals
process.on("SIGINT", async () => {
  console.log("\nAborting recording...");
  await context.close();
  await rm(videoDir, { recursive: true });
  await unlink(RECORDING_FILE).catch(() => {});
  process.exit(1);
});

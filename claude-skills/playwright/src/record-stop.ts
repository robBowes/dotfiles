#!/usr/bin/env tsx
/**
 * Stop video recording
 * Usage: record-stop
 *
 * Signals the recording process to stop, compress, and save.
 */
import { writeFile, readFile, access } from "fs/promises";

const RECORDING_FILE = "/tmp/playwright-recording.json";
const CONTROL_FILE = "/tmp/playwright-recording-control";

// Check if recording is active
try {
  await access(RECORDING_FILE);
} catch {
  console.error("No recording in progress");
  process.exit(1);
}

// Signal stop
await writeFile(CONTROL_FILE, "stop");
console.log("Stop signal sent. Waiting for video to be saved...");

// Wait for recording to finish (recording file removed)
const waitForFinish = async (timeout = 60000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await access(RECORDING_FILE);
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      // File gone = recording finished
      return true;
    }
  }
  return false;
};

const finished = await waitForFinish();
if (!finished) {
  console.error("Timeout waiting for recording to finish");
  process.exit(1);
}

process.exit(0);

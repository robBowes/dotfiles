#!/usr/bin/env tsx
import { readdirSync, statSync, rmSync, mkdirSync, symlinkSync, chmodSync } from "fs";
import { join, basename, resolve } from "path";

const DOTFILES_ROOT = import.meta.dirname;
const SKILLS_DIR = join(DOTFILES_ROOT, "claude-skills");
const BIN_DIR = join(DOTFILES_ROOT, ".bin");

// Find all scripts across all skills
function findAllScripts(): Map<string, string[]> {
  const scriptsByName = new Map<string, string[]>();

  const skills = readdirSync(SKILLS_DIR).filter((d) => {
    const path = join(SKILLS_DIR, d);
    return statSync(path).isDirectory();
  });

  for (const skill of skills) {
    const scriptsDir = join(SKILLS_DIR, skill, "scripts");
    try {
      const scripts = readdirSync(scriptsDir).filter((f) => f.endsWith(".ts"));
      for (const script of scripts) {
        const name = basename(script, ".ts");
        const fullPath = join(scriptsDir, script);
        const existing = scriptsByName.get(name) || [];
        existing.push(fullPath);
        scriptsByName.set(name, existing);
      }
    } catch {
      // No scripts dir for this skill
    }
  }

  return scriptsByName;
}

// Check for conflicts
function checkConflicts(scriptsByName: Map<string, string[]>): string[] {
  const conflicts: string[] = [];
  for (const [name, paths] of scriptsByName) {
    if (paths.length > 1) {
      conflicts.push(`"${name}" exists in multiple skills:\n  ${paths.join("\n  ")}`);
    }
  }
  return conflicts;
}

// Sync symlinks
function syncSymlinks(scriptsByName: Map<string, string[]>) {
  // Wipe and recreate bin dir
  rmSync(BIN_DIR, { recursive: true, force: true });
  mkdirSync(BIN_DIR, { recursive: true });

  let count = 0;
  for (const [name, paths] of scriptsByName) {
    const target = paths[0];
    const link = join(BIN_DIR, name);
    symlinkSync(target, link);
    count++;
  }

  console.log(`Created ${count} symlinks in ${BIN_DIR}`);
  console.log(`\nAdd to PATH: export PATH="${BIN_DIR}:$PATH"`);
}

// Main
const scripts = findAllScripts();
const conflicts = checkConflicts(scripts);

if (conflicts.length > 0) {
  console.error("Conflicts detected:\n");
  for (const c of conflicts) {
    console.error(c);
    console.error();
  }
  process.exit(1);
}

syncSymlinks(scripts);

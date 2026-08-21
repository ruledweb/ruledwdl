#!/usr/bin/env node

/**
 * Script to synchronize repository Agent Skills from .github/skills/
 * to the local user skills directory (/home/pradeep/.agents/skills/).
 *
 * Usage:
 *   npm run sync:skills
 */

import { cpSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(__dirname, '../.github/skills');
const targetDir = process.env.AGENTS_SKILLS_DIR || '/home/pradeep/.agents/skills';

if (!existsSync(sourceDir)) {
  console.error(`❌ Source skills directory not found at: ${sourceDir}`);
  process.exit(1);
}

if (!existsSync(targetDir)) {
  console.log(`📁 Creating target skills directory: ${targetDir}`);
  mkdirSync(targetDir, { recursive: true });
}

console.log(`🔄 Syncing skills from ${sourceDir} -> ${targetDir}...`);

const entries = readdirSync(sourceDir);
let count = 0;

for (const entry of entries) {
  const srcPath = join(sourceDir, entry);
  const destPath = join(targetDir, entry);

  if (statSync(srcPath).isDirectory()) {
    cpSync(srcPath, destPath, { recursive: true, force: true });
    console.log(`  ✓ Synced skill: ${entry}`);
    count++;
  }
}

console.log(`✅ Successfully synchronized ${count} skills to ${targetDir}!`);

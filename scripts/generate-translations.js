#!/usr/bin/env node

/**
 * Auto-generate translated pages
 *
 * This script:
 * 1. Copies all .astro pages from src/pages/ to src/pages/fr/
 * 2. Updates lang="en" to lang="fr"
 * 3. Skips api/, play/, and fr/ folders
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGES_DIR = path.join(__dirname, "../src/pages");
const FR_DIR = path.join(PAGES_DIR, "fr");

// Folders to skip
const SKIP_FOLDERS = ["api", "play", "fr"];

// Remove existing fr/ directory to clean up old routes
if (fs.existsSync(FR_DIR)) {
  console.log("🗑️  Removing old fr/ directory...");
  fs.rmSync(FR_DIR, { recursive: true, force: true });
  console.log("✓ Old translations removed\n");
}

// Ensure fr/ directory exists
if (!fs.existsSync(FR_DIR)) {
  fs.mkdirSync(FR_DIR, { recursive: true });
}

/**
 * Update lang variable from "en" to "fr"
 */
function updateLang(content) {
  return content
    .replace(/const lang = ["']en["'];/g, 'const lang = "fr";')
    .replace(/const lang: Language = ["']en["'];/g, 'const lang: Language = "fr";');
}

/**
 * Process a single .astro file
 */
function processAstroFile(sourcePath, targetPath) {
  let content = fs.readFileSync(sourcePath, "utf-8");

  // Update lang variable
  content = updateLang(content);

  // Ensure target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(targetPath, content, "utf-8");
  console.log(`✓ Generated: ${path.relative(PAGES_DIR, targetPath)}`);
}

/**
 * Recursively process directory
 */
function processDirectory(sourceDir, targetDir) {
  const entries = fs.readdirSync(sourceDir);

  for (const entryName of entries) {
    const sourcePath = path.join(sourceDir, entryName);
    const targetPath = path.join(targetDir, entryName);
    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      // Skip certain folders
      if (SKIP_FOLDERS.includes(entryName)) {
        continue;
      }

      // Recursively process subdirectories
      processDirectory(sourcePath, targetPath);
    } else if (stats.isFile() && entryName.endsWith(".astro")) {
      processAstroFile(sourcePath, targetPath);
    }
  }
}

// Main execution
console.log("🌍 Generating French translations...\n");

// Process all .astro files in src/pages/
const entries = fs.readdirSync(PAGES_DIR);

for (const entryName of entries) {
  const sourcePath = path.join(PAGES_DIR, entryName);
  const targetPath = path.join(FR_DIR, entryName);
  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    // Skip certain folders
    if (SKIP_FOLDERS.includes(entryName)) {
      console.log(`⏭️  Skipping: ${entryName}/`);
      continue;
    }

    // Process directory
    processDirectory(sourcePath, targetPath);
  } else if (stats.isFile() && entryName.endsWith(".astro")) {
    processAstroFile(sourcePath, targetPath);
  }
}

console.log("\n✅ Translation generation complete!");
console.log(`\n📁 Generated files are in: src/pages/fr/`);

#!/usr/bin/env node

import { readdir, stat, unlink } from "fs/promises";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, "..", "public", "uploads");

/**
 * Check if file exists
 */
async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file is a preview file
 */
function isPreviewFile(filename) {
  return filename.startsWith("preview_");
}

/**
 * Check if a file is a thumbnail file
 */
function isThumbnailFile(filename) {
  return filename.includes("_thumb.");
}

/**
 * Clean up a single folder by removing preview and thumbnail files
 */
async function cleanupFolder(folderPath) {
  const folderName = basename(folderPath);
  console.log(`\n📁 Cleaning folder: ${folderName}`);

  try {
    const files = await readdir(folderPath);
    let previewCount = 0;
    let thumbCount = 0;

    for (const file of files) {
      const filePath = join(folderPath, file);
      const stats = await stat(filePath);

      // Only process files, not subdirectories
      if (stats.isFile()) {
        // Check if it's a preview file or thumbnail file
        if (isPreviewFile(file) || isThumbnailFile(file)) {
          console.log(`  🗑️  Removing: ${file}`);
          await unlink(filePath);

          if (isPreviewFile(file)) {
            previewCount++;
          }
          if (isThumbnailFile(file)) {
            thumbCount++;
          }
        }
      }
    }

    if (previewCount === 0 && thumbCount === 0) {
      console.log(`  ✓ No files to clean`);
    } else {
      console.log(
        `  ✓ Removed ${previewCount} preview file(s) and ${thumbCount} thumbnail file(s)`
      );
    }
  } catch (error) {
    console.error(`✗ Error cleaning folder ${folderName}: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🧹 Starting media cleanup script...\n");
  console.log(`📂 Uploads directory: ${UPLOADS_DIR}\n`);

  // Check for specific folder parameter
  const specificFolder = process.argv[2];
  if (specificFolder) {
    console.log(`🎯 Cleaning specific folder: ${specificFolder}\n`);
  }

  try {
    // Check if uploads directory exists
    const uploadsExists = await fileExists(UPLOADS_DIR);
    if (!uploadsExists) {
      console.error(`✗ Uploads directory does not exist: ${UPLOADS_DIR}`);
      process.exit(1);
    }

    // If a specific folder is provided, clean only that folder
    if (specificFolder) {
      const specificPath = join(UPLOADS_DIR, specificFolder);
      const specificExists = await fileExists(specificPath);
      if (!specificExists) {
        console.error(`✗ Folder does not exist: ${specificFolder}`);
        process.exit(1);
      }

      const stats = await stat(specificPath);
      if (!stats.isDirectory()) {
        console.error(`✗ Path is not a directory: ${specificFolder}`);
        process.exit(1);
      }

      // Clean only the specific folder
      await cleanupFolder(specificPath);
      console.log("\n\n✅ Cleanup completed successfully!");
      return;
    }

    // Clean all folders in uploads directory
    const entries = await readdir(UPLOADS_DIR);
    let totalFolders = 0;

    for (const entry of entries) {
      const entryPath = join(UPLOADS_DIR, entry);
      const stats = await stat(entryPath);

      // Only process directories
      if (stats.isDirectory()) {
        totalFolders++;
        await cleanupFolder(entryPath);
      }
    }

    console.log(`\n\n✅ Cleanup completed successfully!`);
    console.log(`📊 Processed ${totalFolders} folder(s)`);
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();

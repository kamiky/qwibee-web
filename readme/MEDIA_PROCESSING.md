# Media Processing Flow

## Overview

Two scripts work together to prepare media files and generate JSON metadata for profile content.

## File Naming Convention

### Format

- **Paid files**: `paid_[8char_id]_[30char_hash].[ext]`
- **Preview files**: `preview_[8char_id]_[30char_hash].[ext]`
- **Thumbnails**: `paid_[8char_id]_[30char_hash]_thumb.jpg` or `preview_[8char_id]_[30char_hash]_thumb.jpg`

### Key Rules

- The 8-character ID is the **same** for paid and preview files of the same content
- The 30-character hash is **different** between paid and preview files
- Thumbnails use the **same hash** as their source file

## Script 1: prepare-medias.js

### Purpose

Processes raw media files and generates required assets (previews, thumbnails).

### Process

1. **Validate folder names**: Ensure all folders match `u[20-char-hash]` format
2. **For each folder**:
   - Find all video/image files
   - **If file is not processed** (doesn't start with `paid_` or `preview_`):
     - Generate unique 8-char ID and two different 30-char hashes
     - Rename to `paid_[id]_[hash1].[ext]`
     - Create blurred preview: `preview_[id]_[hash2].[ext]` (5 seconds for videos)
     - Generate thumbnails for videos: `paid_[id]_[hash1]_thumb.jpg` and `preview_[id]_[hash2]_thumb.jpg`
   - **If file is already processed** (starts with `paid_`):
     - Look for matching preview file by ID (any hash)
     - If missing, generate preview with new hash
     - Check and generate missing thumbnails

### Video Processing

- **Preview**: First 5 seconds, blurred (blur radius = 1% of width)
- **Thumbnails**: Frame at 1 second, saved as JPG

### Image Processing

- **Preview**: Blurred version (blur radius = 1% of width)
- **Thumbnails**: Images use themselves as thumbnails

## Script 2: generate-datas.js

### Purpose

Scans processed files and generates/updates JSON metadata for each profile.

### Process

1. **For each profile folder**:
   - Group files by their 8-character ID
   - Match with existing JSON data by ID (not filename)
   - **If ID exists in JSON**:
     - Preserve all metadata (title, description, price, type, etc.)
     - Update file paths: `paidFilename`, `previewFilename`, `paidThumbnail`, `previewThumbnail`
     - Set to `undefined` if file doesn't exist
   - **If ID is new**:
     - Generate default metadata
     - Extract video duration (if applicable)
     - Determine content type (free/membership/paid)
2. **Generate profiles.ts**: TypeScript file importing all profile JSONs

### File Matching

- Uses the 8-character ID as the primary key
- Matches any hash for the same ID
- This allows the system to update file paths even when hashes change

## Running the Scripts

```bash
# Step 1: Process media files
node scripts/prepare-medias.js

# Step 2: Generate JSON metadata
node scripts/generate-datas.js
```

## Important Notes

- **Always run prepare-medias.js before generate-datas.js**
- The scripts preserve existing metadata in JSON files
- Only file paths are updated on re-runs
- Missing preview/thumbnail files are set to `undefined` in JSON
- The 8-char ID is the stable identifier across all related files

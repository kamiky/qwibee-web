# Uploads Folder Migration

## Overview

The uploads folder has been moved from `web/public/uploads` to `uploads/` at the project root level. This prevents build issues and provides better separation of concerns.

## Directory Structure

```
qwibee/
├── api/                    # Backend
├── web/                    # Frontend
├── uploads/                # Media files (NEW LOCATION)
│   ├── scripts/
│   │   ├── prepare-medias.js
│   │   └── cleanup-medias.js
│   ├── package.json
│   ├── README.md
│   └── u[7-char-id]/      # User folders
└── nginx/
```

## Local Development

### Setup

Run once to create the symlink for dev mode:

```bash
cd web
yarn setup:dev
```

This creates a symlink: `web/public/uploads -> ../uploads`

### Building

**Safe Build Process:**

The build now uses a safe two-step process:
1. Backs up current `dist/` to `dist-backup/`
2. Builds new version
3. Copies uploads
4. If successful: removes backup
5. If failed: restores previous build from backup

```bash
yarn build          # Regular build with safety
yarn build:prod     # Production build with safety
```

This ensures that if a build fails, your previous working build remains intact and serving users.

The `safe-build.sh` script:
- Detects environment (local vs production)
- Copies only media files (excludes .git, scripts, README, etc.)
- Uses rsync for efficient copying
- Automatically restores previous build on failure

### Scripts

All scripts should be run from the **web** folder:

```bash
# Process media files
yarn prepare:medias [optional-profile-id]

# Clean up generated files
yarn cleanup:medias [optional-profile-id]

# Generate data JSON files
yarn generate:datas [optional-profile-id]
```

## Production

### Directory Paths

- Backend: `/var/www/qwibee-api`
- Frontend: `/var/www/qwibee-web`
- Uploads: `/var/www/qwibee-uploads`

### Deployment Workflow

1. **Deploy uploads** (from local to production):
   ```bash
   cd web
   yarn deploy:medias
   ```
   This syncs `uploads/` → `/var/www/qwibee-uploads/`

2. **Build and restart frontend** (on production server):
   ```bash
   cd /var/www/qwibee-web
   yarn restart:prod
   ```
   This script:
   - Pulls latest code
   - Installs dependencies
   - Builds the app (which automatically runs `copy-uploads.sh`)
   - Creates symlink for prerendered pages
   - Restarts PM2

### Modified Scripts

#### `bin/safe-build.sh` (NEW)
Safe build script that:
- Backs up current `dist/` to `dist-backup/`
- Builds the application
- Copies uploads from appropriate source
- Auto-detects environment (local uses `../uploads`, production uses `/var/www/qwibee-uploads`)
- Excludes unnecessary files (.git, scripts, README, package.json)
- **Automatically restores previous build if anything fails**
- Cleans up backup on success

#### `bin/copy-uploads.sh`
Standalone upload copy script (still available but now integrated into safe-build.sh):
- Smart environment detection
- Efficient rsync with exclusions

#### `bin/deploy.medias.sh`
Now syncs to `/var/www/qwibee-uploads` instead of `/var/www/qwibee-web/public/uploads`

#### `bin/restart.prod.sh`
Updated with error handling:
- Uses `set -e` to exit on any error
- Only restarts PM2 if build succeeds
- Provides clear feedback on success/failure

#### `scripts/generate-datas.js`
Updated to read from `../../uploads` instead of `../public/uploads`

## Migration Notes

- Old scripts removed from `web/scripts/`:
  - `cleanup-medias.js` (moved to `uploads/scripts/`)
  - `prepare-medias.js` (moved to `uploads/scripts/`)
  
- New scripts added:
  - `web/bin/setup-dev.sh` (creates symlink for local dev)
  - `web/bin/safe-build.sh` (safe build with automatic rollback on failure)
  - `web/bin/copy-uploads.sh` (copies uploads to dist - used by safe-build)
  
- `web/public/uploads` is now a symlink (dev mode) or doesn't exist (build mode)
- `dist/client/uploads` contains the actual files after build
- `dist-backup/` temporarily holds previous build during deployment
- `web/public/uploads`, `dist-backup/` are in `.gitignore`

## Build Integration

The build process now uses a **safe build strategy** with automatic rollback:

```json
"build": "./bin/safe-build.sh development"
"build:prod": "./bin/safe-build.sh production"
```

**How it works:**

1. **Backup**: Current `dist/` is moved to `dist-backup/`
2. **Build**: Astro builds the application
3. **Copy uploads**: Uploads are copied to `dist/client/uploads`
4. **Success**: `dist-backup/` is deleted
5. **Failure**: Previous build is restored from `dist-backup/`

This ensures that:
- If a build fails, your previous working build stays intact
- Users continue to be served by the last successful build
- No downtime during failed deployments
- Both local and production environments work the same way


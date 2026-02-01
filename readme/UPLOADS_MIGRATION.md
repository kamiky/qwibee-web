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

When you build locally, uploads are automatically copied to `dist/client/uploads`:

```bash
yarn build          # Regular build + copy uploads
yarn build:prod     # Production build + copy uploads
```

The `copy-uploads.sh` script:
- Detects environment (local vs production)
- Copies only media files (excludes .git, scripts, README, etc.)
- Uses rsync for efficient copying

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

#### `bin/copy-uploads.sh` (NEW)
Smart copy script that:
- Auto-detects environment (local uses `../uploads`, production uses `/var/www/qwibee-uploads`)
- Excludes unnecessary files (.git, scripts, README, package.json)
- Uses rsync for efficient copying
- Runs automatically after `build` and `build:prod`

#### `bin/deploy.medias.sh`
Now syncs to `/var/www/qwibee-uploads` instead of `/var/www/qwibee-web/public/uploads`

#### `bin/restart.prod.sh`
Simplified - no longer has manual copy step (handled by build script)

#### `scripts/generate-datas.js`
Updated to read from `../../uploads` instead of `../public/uploads`

## Migration Notes

- Old scripts removed from `web/scripts/`:
  - `cleanup-medias.js` (moved to `uploads/scripts/`)
  - `prepare-medias.js` (moved to `uploads/scripts/`)
  
- New scripts added:
  - `web/bin/setup-dev.sh` (creates symlink for local dev)
  - `web/bin/copy-uploads.sh` (copies uploads to dist after build)
  
- `web/public/uploads` is now a symlink (dev mode) or doesn't exist (build mode)
- `dist/client/uploads` contains the actual files after build
- `web/public/uploads` is in `.gitignore`

## Build Integration

The build process now automatically includes uploads:

```json
"build": "yarn translate && astro check && astro build && ./bin/copy-uploads.sh"
"build:prod": "yarn translate && astro check && astro build --mode production && ./bin/copy-uploads.sh"
```

This ensures that whether you build locally or on production, the uploads folder is always copied to the correct location in the build output.


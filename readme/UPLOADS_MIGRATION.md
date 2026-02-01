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

Run once to create the symlink:

```bash
cd web
yarn setup:dev
```

This creates a symlink: `web/public/uploads -> ../uploads`

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
   - Builds the app
   - **Copies `/var/www/qwibee-uploads` to `dist/client/uploads`**
   - Restarts PM2

### Modified Scripts

#### `bin/deploy.medias.sh`
Now syncs to `/var/www/qwibee-uploads` instead of `/var/www/qwibee-web/public/uploads`

#### `bin/restart.prod.sh`
Added step to copy uploads folder to build output after building:
```bash
cp -r /var/www/qwibee-uploads dist/client/uploads
```

#### `scripts/generate-datas.js`
Updated to read from `../../uploads` instead of `../public/uploads`

## Migration Notes

- Old scripts removed from `web/scripts/`:
  - `cleanup-medias.js` (moved to `uploads/scripts/`)
  - `prepare-medias.js` (moved to `uploads/scripts/`)
  
- New scripts added:
  - `web/bin/setup-dev.sh` (creates symlink for local dev)
  
- `web/public/uploads` is now a symlink (local) or copied folder (production)
- `web/public/uploads` is in `.gitignore`

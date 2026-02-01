# Safe Build Strategy

## Overview

The build process now uses a safe two-step approach that prevents broken builds from affecting production. If a build fails at any stage, the previous working build is automatically restored.

## How It Works

### Build Flow

```
1. Backup current dist/          → dist-backup/
2. Run astro build                → Creates new dist/
3. Copy uploads to dist/          → dist/client/uploads
4. Create symlink                 → dist/server/client → ../client
5. Success?
   ✓ YES: Delete dist-backup/
   ✗ NO:  Restore dist/ from dist-backup/
```

### Scripts

**Main Build Script:**
```bash
yarn build          # Development build with safety
yarn build:prod     # Production build with safety
```

Both commands use `bin/safe-build.sh` which handles the entire safe build process.

## Implementation Details

### `bin/safe-build.sh`

**Parameters:**
- `$1`: Build mode (`development` or `production`)

**Process:**

1. **Backup Phase**
   - If `dist/` exists, move it to `dist-backup/`
   - This preserves the last working build

2. **Build Phase**
   - Run translations
   - Run Astro type checking
   - Run Astro build (development or production mode)
   - If build fails → restore from backup and exit

3. **Upload Phase**
   - Detect environment (local vs production)
   - Copy uploads using rsync with exclusions
   - If copy fails → restore from backup and exit

4. **Symlink Phase**
   - Create `dist/server/client -> ../client` symlink
   - Required for SSR mode to access static assets

5. **Cleanup Phase**
   - Remove `dist-backup/` on success

### Error Handling

Every critical step checks for errors:

```bash
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  
  # Restore backup if it exists
  if [ -d "dist-backup" ]; then
    echo "🔄 Restoring previous dist from backup..."
    rm -rf dist
    mv dist-backup dist
  fi
  
  exit 1
fi
```

This ensures that:
- The previous build is never deleted until the new build succeeds
- Failed builds don't leave the system in a broken state
- Users continue to be served by the last successful build

## Production Deployment

### `bin/restart.prod.sh`

Updated with error handling:

```bash
set -e  # Exit on any error

# ... git pull, yarn install ...

yarn build:prod  # Uses safe-build.sh

if [ $? -eq 0 ]; then
  # Only restart if build succeeded
  pm2 restart qwibee-web
else
  echo "❌ Build failed! PM2 not restarted."
  exit 1
fi
```

**Benefits:**
- PM2 only restarts if build succeeds
- Previous build stays running if deployment fails
- Zero downtime on failed deployments

## Directory Structure

```
web/
├── dist/               # Current active build
├── dist-backup/        # Temporary backup during build (auto-deleted)
└── bin/
    └── safe-build.sh   # Safe build orchestrator
```

**Note:** `dist-backup/` is in `.gitignore`

## Testing

To test the safe build locally:

```bash
cd web

# Test successful build
yarn build

# Test failed build (simulated)
# 1. Introduce a TypeScript error
# 2. Run yarn build
# 3. Verify previous dist/ is restored
```

## Comparison: Before vs After

### Before

```bash
# Build directly to dist/
yarn build
→ If build fails: dist/ may be incomplete or broken
→ Users served broken code
```

### After

```bash
# Safe build with rollback
yarn build
→ If build fails: dist/ restored from backup
→ Users continue being served last working build
```

## Benefits

1. **Zero Downtime**: Failed builds don't affect running application
2. **Automatic Rollback**: No manual intervention needed
3. **Same Locally & Production**: Consistent behavior everywhere
4. **Clear Feedback**: Scripts report exactly what happened
5. **Simple to Use**: Just `yarn build` or `yarn build:prod`

## Troubleshooting

### No Styles / MIME Type Errors

**Symptom:**
- Running `yarn start` shows no styles
- Browser console error: "Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'"

**Cause:**
Missing symlink `dist/server/client -> ../client`

**Solution:**
```bash
# Quick fix (manual):
cd dist/server
ln -sf ../client ./client

# Permanent fix:
yarn build  # Rebuild with safe-build.sh (creates symlink automatically)
```

**Why this happens:**
Astro SSR mode requires the server to access static assets (CSS, JS) via the symlink. Without it, the server can't find the client assets.


# Safe Build Strategy

## Overview

Simple and effective: Build to `dist/`, rename to `build/` on success. The old `build/` folder serves the site until the new build is complete and ready.

## How It Works

### Build Flow

```
1. Remove old dist/ (if exists from failed build)
2. Run astro build → Creates dist/
3. Copy uploads to dist/client/uploads
4. Create symlink dist/server/client → ../client
5. Success?
   ✓ YES: mv dist/ → build/ (old build/ deleted, new build/ active)
   ✗ NO:  rm dist/ (cleanup failed build)
```

**Key points:**
- Nginx/PM2 serve from `build/` 
- Build happens in `dist/`
- Only on success: `dist/` becomes `build/`
- Site stays up until the swap happens

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

1. **Clean Phase**
   - Remove old `dist/` if it exists (leftover from failed build)

2. **Build Phase**
   - Run translations
   - Run Astro type checking
   - Run Astro build → creates `dist/`
   - If build fails → remove `dist/` and exit

3. **Finalize Phase**
   - Copy uploads to `dist/client/uploads`
   - Create symlink `dist/server/client → ../client`
   - If anything fails → remove `dist/` and exit

4. **Swap Phase**
   - Delete old `build/` if exists
   - Rename `dist/` → `build/` (new build now active)

### Error Handling

Every critical step checks for errors:

```bash
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  echo "🗑️  Cleaning up dist/..."
  rm -rf dist
  exit 1
fi
```

This ensures that:
- **Site never goes down** - `build/` folder stays intact until new build succeeds
- Failed builds are cleaned up automatically (`dist/` removed)
- PM2/Nginx keep serving from `build/` folder
- The swap is a single `mv` operation (instant)

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
├── build/              # Active build (PM2/Nginx serve from here)
├── dist/               # Temporary build folder (only during build process)
└── bin/
    └── safe-build.sh   # Build orchestrator
```

**Note:** 
- `build/` is the active production build
- `dist/` only exists during build process, then renamed to `build/`
- Both `build/` and `dist/` are in `.gitignore`

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


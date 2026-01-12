# Production Deployment Guide - Ubuntu Server

This guide explains how to deploy the watchmefans web application with Stripe integration on an Ubuntu server using PM2 and Nginx.

## Understanding Hybrid Mode

With `output: 'hybrid'` in Astro config:

- ✅ Static pages (homepage, wallpaper listings) are pre-rendered to HTML
- ✅ API endpoints (`/api/stripe/*`) run server-side via Node.js
- ⚠️ You need a Node.js server running alongside Nginx (not just static files)

## Prerequisites

- Ubuntu server with Node.js 18+ installed
- PM2 installed globally
- Nginx installed
- Domain configured with SSL (Let's Encrypt)

## Step 1: Install Node.js Adapter

On your **local machine**, install the Node.js adapter:

```bash
npm install @astrojs/node
```

## Step 2: Update Astro Config

Update `astro.config.mjs` to use the Node adapter:

```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

export default defineConfig({
  output: "hybrid",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [react(), tailwind()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
```

## Step 3: Update Package.json Scripts

Add production start script:

```json
{
  "scripts": {
    "dev": "astro dev",
    "start": "node dist/server/entry.mjs",
    "build": "astro check && astro build",
    "build:prod": "astro check && astro build --mode production",
    "preview": "astro preview",
    "astro": "astro",
    "deploy:prod": "./bin/deploy.prod.sh",
    "restart:prod": "./bin/restart.prod.sh"
  }
}
```

## Step 4: Build for Production

On your **local machine**:

```bash
# Build the application
npm run build:prod

# This creates a dist/ folder with:
# - dist/client/ (static assets)
# - dist/server/ (Node.js server code)
```

## Step 5: Deploy to Server

### Transfer Files

```bash
# From your local machine
rsync -avz --exclude 'node_modules' \
  /path/to/your/project/ \
  user@your-server:/var/www/watchmefans/
```

### Install Dependencies on Server

```bash
# SSH into your server
ssh user@your-server

# Navigate to project directory
cd /var/www/watchmefans

# Install production dependencies only
npm install --production
```

## Step 6: Set Environment Variables

Create `.env.production` on the server:

```bash
nano /var/www/watchmefans/.env.production
```

Add your production Stripe credentials:

```env
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY
STRIPE_PRODUCT_ID=prod_YOUR_PRODUCT_ID
STRIPE_PRICE_ID=price_YOUR_PRICE_ID
PUBLIC_APP_URL=https://watchmefans.com
NODE_ENV=production
```

## Step 7: Configure PM2

### Create PM2 Ecosystem File

Create `ecosystem.config.js` in your project root:

```javascript
module.exports = {
  apps: [
    {
      name: "watchmefans-web",
      script: "dist/server/entry.mjs",
      cwd: "/var/www/watchmefans",
      instances: 1,
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
        PORT: 4321,
        HOST: "127.0.0.1",
      },
      error_file: "/var/www/watchmefans/logs/pm2-error.log",
      out_file: "/var/www/watchmefans/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
```

### Create Logs Directory

```bash
mkdir -p /var/www/watchmefans/logs
```

### Start with PM2

```bash
# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions printed by the command above
```

### Useful PM2 Commands

```bash
# View logs
pm2 logs watchmefans-web

# Restart application
pm2 restart watchmefans-web

# Stop application
pm2 stop watchmefans-web

# Monitor
pm2 monit

# View status
pm2 status

# Delete from PM2
pm2 delete watchmefans-web
```

## Step 8: Configure Nginx

Update your Nginx configuration to proxy requests to the Node.js server:

```nginx
# /etc/nginx/sites-available/watchmefans.com

# Redirect HTTP to HTTPS
server {
  listen 80;
  listen [::]:80;
  server_name watchmefans.com www.watchmefans.com;
  return 301 https://watchmefans.com$request_uri;
}

# HTTPS Server
server {
  listen 443 ssl default_server;
  listen [::]:443 ssl default_server;
  server_name watchmefans.com www.watchmefans.com;

  ssl_certificate /etc/letsencrypt/live/watchmefans.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/watchmefans.com/privkey.pem;

  # Redirect www to non-www
  if ($host = 'www.watchmefans.com') {
    return 301 https://watchmefans.com$request_uri;
  }

  # Proxy to Node.js server
  location / {
    proxy_pass http://127.0.0.1:4321;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # Optional: Serve static assets directly from Nginx (for better performance)
  location /_astro/ {
    alias /var/www/watchmefans/dist/client/_astro/;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location /favicon.svg {
    alias /var/www/watchmefans/dist/client/favicon.svg;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location /screenshots/ {
    alias /var/www/watchmefans/dist/client/screenshots/;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location /videos/ {
    alias /var/www/watchmefans/dist/client/videos/;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
}
```

### Test and Reload Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 9: Deployment Script

Create a deployment script `bin/deploy.prod.sh`:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting production deployment...${NC}"

# Build locally
echo "Building application..."
npm run build:prod

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Transfer to server
echo "Transferring files to server..."
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'logs' \
    ./ user@your-server:/var/www/watchmefans/

if [ $? -ne 0 ]; then
    echo -e "${RED}File transfer failed!${NC}"
    exit 1
fi

# Restart on server
echo "Restarting application on server..."
ssh user@your-server << 'ENDSSH'
    cd /var/www/watchmefans
    npm install --production
    pm2 restart ecosystem.config.js --env production
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}Restart failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
```

Make it executable:

```bash
chmod +x bin/deploy.prod.sh
```

## Step 10: Deploy

From your local machine:

```bash
npm run deploy:prod
```

## Verification

1. **Check PM2 is running:**

   ```bash
   pm2 status
   ```

2. **Check logs:**

   ```bash
   pm2 logs watchmefans-web
   ```

3. **Test the site:**

   ```bash
   curl https://watchmefans.com
   ```

4. **Test Stripe endpoint:**
   ```bash
   curl -X POST https://watchmefans.com/api/stripe/create-checkout-session \
     -H "Content-Type: application/json" \
     -d '{"priceId":"price_test","successUrl":"https://watchmefans.com","cancelUrl":"https://watchmefans.com"}'
   ```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 4321
sudo lsof -i :4321

# Kill the process
sudo kill -9 <PID>
```

### PM2 Not Starting on Boot

```bash
# Generate startup script
pm2 startup

# Save current PM2 process list
pm2 save
```

### Application Crashes

```bash
# View error logs
pm2 logs watchmefans-web --err

# Check system logs
journalctl -u nginx -f
```

### Stripe API Errors

- Verify `.env.production` has correct live keys
- Check `pm2 logs` for environment variable loading
- Ensure `NODE_ENV=production` is set

## Monitoring

### Set up PM2 monitoring

```bash
# Enable web-based monitoring
pm2 plus
```

### Monitor Nginx logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

## Performance Tips

1. **Use Nginx for static assets** (configured above)
2. **Enable Gzip compression** in Nginx
3. **Set up caching headers** (configured above)
4. **Use CDN** for static assets (optional)
5. **Monitor memory usage** with PM2

## Security Checklist

- [ ] SSL certificate installed and auto-renewing
- [ ] Environment variables secured (not in git)
- [ ] Firewall configured (UFW)
- [ ] Only necessary ports open (22, 80, 443)
- [ ] Regular security updates
- [ ] PM2 logs rotated
- [ ] Stripe webhooks secured (optional)

## Updating the Application

When you make changes:

```bash
# 1. Build locally
npm run build:prod

# 2. Deploy
npm run deploy:prod

# Or manually:
rsync -avz dist/ user@server:/var/www/watchmefans/dist/
ssh user@server 'pm2 restart watchmefans-web'
```

## Rollback Strategy

If deployment fails:

```bash
# On server, keep previous version
cp -r /var/www/watchmefans /var/www/watchmefans.backup

# To rollback
pm2 stop watchmefans-web
mv /var/www/watchmefans.backup /var/www/watchmefans
pm2 restart watchmefans-web
```

## Summary

**Key Differences from Static Deployment:**

| Aspect          | Static (Old)      | Hybrid (New)              |
| --------------- | ----------------- | ------------------------- |
| Nginx serves    | Static files only | Proxies to Node.js        |
| PM2 needed      | ❌ No             | ✅ Yes                    |
| Node.js running | ❌ No             | ✅ Yes (port 4321)        |
| API endpoints   | ❌ Not possible   | ✅ Works                  |
| Build output    | HTML/CSS/JS       | HTML/CSS/JS + Node server |

**Your Deployment Flow:**

1. Build locally → `dist/` folder created
2. Transfer to server → `/var/www/watchmefans/`
3. PM2 runs Node.js server → Listens on `127.0.0.1:4321`
4. Nginx proxies requests → To Node.js server
5. Static assets served by Nginx → Direct file access (faster)
6. API requests served by Node.js → Stripe checkout works

Need help? Check logs: `pm2 logs watchmefans-web`

# Production Setup Quick Start

## 🚀 What Changed?

Your site now uses **Hybrid mode** = Static pages + API endpoints

**Before (Static):**

```
Nginx → /var/www/watchmefans/dist/ (static files)
```

**After (Hybrid):**

```
Nginx → Node.js Server (port 4321) → Handles everything
      ↓
   PM2 manages Node.js process
```

## ⚡ Quick Setup (On Server)

### 1. Install Node.js Adapter (First Time Only)

```bash
# On your LOCAL machine
cd /Users/alexis/Documents/dev/projects/watchmefans/web
npm install @astrojs/node
```

### 2. Build and Deploy

```bash
# On your LOCAL machine
npm run build:prod

# Transfer to server (update with your server details)
rsync -avz --exclude 'node_modules' \
  ./ your-user@your-server:/var/www/watchmefans/
```

### 3. Setup on Server (First Time Only)

```bash
# SSH into your server
ssh your-user@your-server

# Navigate to project
cd /var/www/watchmefans

# Install dependencies
npm install --production

# Create logs directory
mkdir -p logs

# Create .env.production with your Stripe keys
nano .env.production
# Add:
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLIC_KEY=pk_live_...
# STRIPE_PRODUCT_ID=prod_...
# STRIPE_PRICE_ID=price_...
# PUBLIC_APP_URL=https://watchmefans.com
# NODE_ENV=production
```

### 4. Start with PM2

```bash
# Start the app
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup auto-start on boot (first time only)
pm2 startup
# Run the command it tells you to run
```

### 5. Update Nginx Config

```bash
# Copy new nginx config
sudo cp /var/www/watchmefans/nginx/watchmefans.com /etc/nginx/sites-available/

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 6. Verify

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs watchmefans-web

# Test your site
curl https://watchmefans.com
```

## 🔄 Updating Your App (Regular Deployments)

```bash
# 1. Build locally
npm run build:prod

# 2. Transfer to server
rsync -avz --exclude 'node_modules' \
  ./ your-user@your-server:/var/www/watchmefans/

# 3. Restart on server
ssh your-user@your-server "cd /var/www/watchmefans && pm2 restart watchmefans-web"
```

## 📋 PM2 Commands Cheat Sheet

```bash
# View status
pm2 status

# View logs (live)
pm2 logs watchmefans-web

# View error logs only
pm2 logs watchmefans-web --err

# Restart
pm2 restart watchmefans-web

# Stop
pm2 stop watchmefans-web

# Start
pm2 start ecosystem.config.js --env production

# Monitor (dashboard)
pm2 monit

# Delete from PM2
pm2 delete watchmefans-web
```

## 🐛 Troubleshooting

### App won't start?

```bash
# Check logs
pm2 logs watchmefans-web

# Common issues:
# - Missing .env.production file
# - Wrong file permissions
# - Port 4321 already in use
```

### 502 Bad Gateway?

```bash
# Check if PM2 is running
pm2 status

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart both
pm2 restart watchmefans-web
sudo systemctl reload nginx
```

### Stripe not working?

```bash
# Verify environment variables are loaded
pm2 logs watchmefans-web | grep STRIPE

# Check the .env.production file exists
ls -la /var/www/watchmefans/.env.production

# Restart to reload env vars
pm2 restart watchmefans-web
```

## 📊 Key Files

```
/var/www/watchmefans/
├── dist/
│   ├── client/          # Static assets (served by Nginx)
│   └── server/          # Node.js server (run by PM2)
│       └── entry.mjs    # Main entry point
├── ecosystem.config.js  # PM2 configuration
├── .env.production      # Environment variables (CREATE THIS!)
├── logs/                # PM2 logs
│   ├── pm2-error.log
│   └── pm2-out.log
└── package.json
```

## ✅ Checklist

- [ ] Install @astrojs/node locally
- [ ] Build with `npm run build:prod`
- [ ] Transfer files to server
- [ ] Run `npm install --production` on server
- [ ] Create `.env.production` with Stripe keys
- [ ] Create `logs/` directory
- [ ] Start with PM2
- [ ] Update Nginx config
- [ ] Test site is accessible
- [ ] Test Stripe checkout works

## 📚 Full Documentation

See `PRODUCTION_DEPLOYMENT.md` for complete details.

## 🆘 Need Help?

1. Check PM2 logs: `pm2 logs watchmefans-web`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify process is running: `pm2 status`
4. Test Node server directly: `curl http://127.0.0.1:4321`

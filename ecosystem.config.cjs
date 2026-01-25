module.exports = {
  apps: [
    {
      name: "qwibee-web",
      script: "dist/server/entry.mjs",
      cwd: "/var/www/qwibee-web",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 8000,
        HOST: "127.0.0.1",
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};

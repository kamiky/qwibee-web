#!/bin/bash
# Deploy staging from local machine

# Check this notion if issues with git auth (ssh key passphrase)
# https://www.notion.so/Local-Remote-SSH-deploy-b57482f9a06f40629802003434db95a4?pvs=4

eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

echo "Connecting to server, pulling staging branch, yarn install, build and pm2 restart"
ssh -A root@142.93.173.10 "source ~/.nvm/nvm.sh && cd /var/www/qwibee-web-staging/ && nvm use && bash bin/restart.staging.sh"

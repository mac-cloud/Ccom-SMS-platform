#!/usr/bin/env bash

set -euo pipefail

SERVICE_NAME="customer-connect-sms"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "==> Stopping and disabling $SERVICE_NAME"
sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true

if [ -f "$SERVICE_FILE" ]; then
    echo "==> Removing $SERVICE_FILE"
    sudo rm "$SERVICE_FILE"
    sudo systemctl daemon-reload
fi

echo "==> Done. node_modules, .env, and the source files were left in place —"
echo "    remove the project directory yourself if you want those gone too."
#!/usr/bin/env bash

set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
    echo "Don't run this as root — run it as the normal user who should own the service." >&2
    echo "The script will sudo internally for the parts that need it." >&2
    exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="$(id -un)"
SERVICE_NAME="customer-connect-sms"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "==> Installing to: $APP_DIR (service will run as user: $APP_USER)"

# --- 1. Runtime + package manager ---
# The project ships a bun.lock, so bun is the intended package manager.
# Fall back to npm only if bun genuinely isn't available, since npm won't
# respect bun.lock and may resolve slightly different versions.
if command -v bun >/dev/null 2>&1; then
    RUNNER="bun"
    echo "==> Using bun (found on PATH)"
elif command -v npm >/dev/null 2>&1; then
    RUNNER="npm"
    echo "==> bun not found — falling back to npm (bun.lock will be ignored)"
else
    echo "Neither bun nor npm is installed. Install one of them first:" >&2
    echo "    bun:  curl -fsSL https://bun.sh/install | bash" >&2
    echo "    node/npm: sudo apt install nodejs npm" >&2
    exit 1
fi

# --- 2. Dependencies ---
echo "==> Installing dependencies with $RUNNER (this can take a while the first time)"
cd "$APP_DIR"
if [ "$RUNNER" = "bun" ]; then
    bun install --silent
else
    npm install --silent
fi

# --- 3. .env ---
if [ -f "$APP_DIR/.env.example" ] && [ ! -f "$APP_DIR/.env" ]; then
    echo "==> No .env found — copying .env.example. EDIT THIS before starting (e.g. backend API URL):"
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    echo "    $APP_DIR/.env"
elif [ -f "$APP_DIR/.env" ]; then
    echo "==> .env already exists, leaving it as-is"
fi

# --- 4. systemd unit ---
echo "==> Writing systemd unit to $SERVICE_FILE (needs sudo)"
sed \
    -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__APP_USER__|$APP_USER|g" \
    -e "s|__RUNNER__|$RUNNER|g" \
    "$APP_DIR/deploy/customer-connect-sms.service.template" \
    | sudo tee "$SERVICE_FILE" > /dev/null

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

echo
echo "==> Done. Start it with:"
echo "        sudo systemctl start $SERVICE_NAME"
echo "    Check status / logs with:"
echo "        sudo systemctl status $SERVICE_NAME"
echo "        sudo journalctl -u $SERVICE_NAME -f"
echo "    Once running, it's reachable at: http://<this-machine-ip>:3000"
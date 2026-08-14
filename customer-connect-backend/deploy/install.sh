#!/usr/bin/env bash

set -euo pipefail
 
if [ "$(id -u)" -eq 0 ]; then
    echo "Don't run this as root — run it as the normal user who should own the service." >&2
    echo "The script will sudo internally for the parts that need it." >&2
    exit 1
fi
 
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="$(id -un)"
SERVICE_NAME="customer-connect-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
 
echo "==> Installing to: $APP_DIR (service will run as user: $APP_USER)"
 
# --- 1. Python venv + dependencies ---
# Some setups already have a "venv" folder from manual `python -m venv venv`.
# Reuse it if present instead of creating a second, separate ".venv" —
# having both around is a common source of "which one is actually running"
# confusion.
if [ -d "$APP_DIR/venv" ]; then
    VENV_DIR="$APP_DIR/venv"
elif [ -d "$APP_DIR/.venv" ]; then
    VENV_DIR="$APP_DIR/.venv"
else
    VENV_DIR="$APP_DIR/.venv"
    echo "==> Creating virtualenv at $VENV_DIR"
    python3 -m venv "$VENV_DIR"
fi
echo "==> Using virtualenv: $VENV_DIR"
echo "==> Installing dependencies"
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet -r "$APP_DIR/requirements.txt"
 
# --- 2. .env ---
if [ ! -f "$APP_DIR/.env" ]; then
    echo "==> No .env found — copying .env.example. EDIT THIS before the service will work correctly:"
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    echo "    $APP_DIR/.env"
else
    echo "==> .env already exists, leaving it as-is"
fi
 
# --- 3. systemd unit ---
echo "==> Writing systemd unit to $SERVICE_FILE (needs sudo)"
sed \
    -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__APP_USER__|$APP_USER|g" \
    -e "s|__VENV_DIR__|$VENV_DIR|g" \
    "$APP_DIR/deploy/customer-connect-backend.service.template" \
    | sudo tee "$SERVICE_FILE" > /dev/null
 
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
 
echo
echo "==> Done. Before starting, make sure $APP_DIR/.env has real values (DATABASE_URL, TALKSASA_*, etc)."
echo "    Then start it with:"
echo "        sudo systemctl start $SERVICE_NAME"
echo "    Check status / logs with:"
echo "        sudo systemctl status $SERVICE_NAME"
echo "        sudo journalctl -u $SERVICE_NAME -f"
 
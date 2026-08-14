#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/customer-connect-backend"
FRONTEND_DIR="$ROOT_DIR/customer-connect-sms"

echo "############################################"
echo "  Customer Connect — full install"
echo "############################################"
echo

if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo "Expected both customer-connect-backend/ and customer-connect-sms/ next to this script." >&2
    echo "Run this from the root of the extracted project." >&2
    exit 1
fi

echo "==> [1/2] Backend"
bash "$BACKEND_DIR/deploy/install.sh"

echo
echo "==> [2/2] Frontend"
bash "$FRONTEND_DIR/deploy/install.sh"

echo
echo "############################################"
echo "  Install complete"
echo "############################################"
echo "Start both services with:"
echo "    sudo systemctl start customer-connect-backend"
echo "    sudo systemctl start customer-connect-sms"
echo
echo "Set both to start on boot automatically, they already are (enabled during install)."
echo "Frontend will be at http://<this-machine-ip>:3000, backend at :8000."
echo
echo "Reminder: edit the .env files in each folder before first start if you haven't already —"
echo "the installers only copy .env.example, they don't fill in real values for you."
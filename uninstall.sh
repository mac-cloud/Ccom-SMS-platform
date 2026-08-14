#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Uninstalling backend service"
bash "$ROOT_DIR/customer-connect-backend/deploy/uninstall.sh"

echo "==> Uninstalling frontend service"
bash "$ROOT_DIR/customer-connect-sms/deploy/uninstall.sh"

echo "==> Both services removed. Project files, venv, and node_modules were left untouched."
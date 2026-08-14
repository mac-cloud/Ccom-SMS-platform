
set -euo pipefail
 
SERVICE_NAME="customer-connect-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
 
if systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
    echo "==> Stopping and disabling $SERVICE_NAME"
    sudo systemctl stop "$SERVICE_NAME" || true
    sudo systemctl disable "$SERVICE_NAME" || true
    sudo rm -f "$SERVICE_FILE"
    sudo systemctl daemon-reload
    echo "==> Service removed. Project files, venv, and .env were left untouched."
else
    echo "No $SERVICE_NAME service found — nothing to do."
fi
 
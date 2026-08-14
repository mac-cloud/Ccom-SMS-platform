# Sharing this tool with someone else's Kali box

## Before you zip it up

`venv/` and `node_modules/` are machine-specific and huge — don't ship them.
`install.sh` recreates both on the recipient's machine. From the project root:

```bash
tar --exclude='customer-connect-backend/venv' \
    --exclude='customer-connect-sms/node_modules' \
    --exclude='.git' \
    -czf customer-connect.tar.gz .
```

(If you're already tracking this in git, `git archive` does the same thing
automatically without needing the `--exclude` flags.)

## What the recipient does

```bash
tar -xzf customer-connect.tar.gz
cd customer-connect
chmod +x install.sh customer-connect-backend/deploy/*.sh customer-connect-sms/deploy/*.sh
./install.sh
```

That's the "install" step. It needs `sudo` for the systemd parts (asks for
their password when it gets there, not upfront) and needs `python3`,
`pip`, and either `bun` or `node`/`npm` already on the machine — it doesn't
install those for you.

They'll be prompted to fill in `.env` in both folders before starting the
services (DB connection string, TalkSasa API key, etc.) — the installer
only copies `.env.example`, it can't know real values.

## Starting it

```bash
sudo systemctl start customer-connect-backend
sudo systemctl start customer-connect-sms
```

Both are enabled to start on boot automatically. Frontend at
`http://<machine-ip>:3000`, backend at `:8000`.

## Removing it

```bash
./uninstall.sh
```

Stops and removes both systemd services. Doesn't touch the project
folder, `.env` files, or dependencies — delete the directory yourself if
you want a clean wipe.

## What "executable" means here

There's no single native binary — it's still a Python backend and a
Vite/TanStack dev server underneath. What `install.sh` gives you is a
one-command setup + two long-running background services, which is the
practical equivalent for something a non-technical person needs to "just
run" on their own machine without touching source code.
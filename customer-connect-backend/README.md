# ISP SMS Console — Backend (FastAPI + Postgres)

Implements every endpoint listed in the frontend's README, with response
shapes that match `Customer`, `Message`, `SendResult`, `Balance`,
`DashboardStats`, and `ImportResult` exactly — so `src/lib/api.ts` should
need no changes beyond pointing `VITE_API_BASE_URL` here.

## File structure

```
isp-sms-backend/
  requirements.txt
  .env.example
  app/
    main.py              # FastAPI app, CORS, router wiring, table creation
    config.py             # Settings (env vars) — DB URL, CORS origins, TalkSasa creds
    database.py            # SQLAlchemy engine/session/Base
    models.py               # Customer, Message ORM tables
    schemas.py               # Pydantic request/response models
    routers/
      customers.py             # GET/POST /customers, GET/PUT/DELETE /customers/{id}
      imports.py                 # POST /customers/import
      sms.py                       # POST /sms/send, /sms/send/bulk, GET /sms/balance
      messages.py                    # GET /messages
      stats.py                         # GET /stats
    services/
      talksasa.py                        # TalkSasa API client (only module that calls TalkSasa)
      sms_utils.py                         # phone normalization + GSM-7/UCS-2 segment counter
```

## Setup

1. Create a Postgres database:
   ```bash
   createdb isp_sms
   ```
2. Copy the env file and fill in real values:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies (a virtualenv is recommended):
   ```bash
   pip install -r requirements.txt
   ```
4. Run it:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Tables are created automatically on startup for local dev. Visit
   `http://localhost:8000/docs` for interactive API docs.
5. Point the frontend at it — in the frontend's `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

## Notes / things to double-check before production

- **TalkSasa endpoint paths & response shape** (`app/services/talksasa.py`):
  built from TalkSasa's published client-library conventions
  (`https://bulksms.talksasa.com/api/v3`, Bearer auth, `recipient` /
  `sender_id` / `message` fields). Confirm the exact `/sms/send` and
  `/sms/balance` paths and response field names against your TalkSasa
  dashboard/API key docs — providers sometimes version or rename these.
- **Migrations**: `Base.metadata.create_all()` runs on startup, which is
  fine for getting started but won't handle future schema changes to
  existing tables. `alembic` is already in `requirements.txt` — run
  `alembic init alembic` when you're ready to switch to real migrations.
- **Phone normalization** defaults to Kenyan numbers (`254` prefix) in
  `services/sms_utils.py`. Change `default_country_code` there if you
  serve other countries.
- **CORS**: set `CORS_ORIGINS` in `.env` to your actual frontend origin(s),
  comma-separated. The frontend README's `*` suggestion for dev is not
  used here on purpose — safer to list origins explicitly even in dev.
- **No authentication**, matching the frontend's current "no auth in this
  iteration" state. When you add it, `app/main.py` and each router's
  `Depends(get_db)` are the natural places to also add
  `Depends(get_current_user)`.
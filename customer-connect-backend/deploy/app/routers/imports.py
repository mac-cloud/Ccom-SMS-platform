"""
Bulk customer import. The CSV file itself is parsed in the browser
(papaparse) and column-mapped there — this endpoint just receives the
already-mapped rows as JSON and inserts what it can, reporting per-row
failures back so the wizard can show a result summary.

Mounted at the same "/customers" prefix as customers.py, and included
in main.py BEFORE that router so this literal "/customers/import" path
is matched ahead of the "/customers/{customer_id}" route.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.sms_utils import normalize_phone

router = APIRouter(prefix="/customers", tags=["import"])


@router.post("/import", response_model=schemas.ImportResult)
def import_customers(payload: schemas.ImportRequest, db: Session = Depends(get_db)):
    inserted = 0
    errors: list[str] = []

    for index, row in enumerate(payload.rows):
        try:
            normalized_phone = normalize_phone(row.phone)
        except ValueError as exc:
            errors.append(f"Row {index + 1}: {exc}")
            continue

        existing = db.query(models.Customer).filter(models.Customer.phone == normalized_phone).first()
        if existing:
            errors.append(f"Row {index + 1}: duplicate phone number {normalized_phone}")
            continue

        db.add(
            models.Customer(
                name=row.name,
                phone=normalized_phone,
                plan=row.plan,
                status=row.status,
                notes=row.notes,
            )
        )
        inserted += 1

    db.commit()

    return schemas.ImportResult(inserted=inserted, failed=len(errors), errors=errors)
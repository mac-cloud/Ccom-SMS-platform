"""
Customer CRM endpoints — powers the /customers page and the customer
dropdowns used on Send SMS / Messages.
"""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.services.sms_utils import normalize_phone

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[schemas.Customer])
def list_customers(
    search: str | None = Query(None, description="Matches against name or phone"),
    plan: str | None = Query(None),
    status: str | None = Query(None, description="active | suspended | cancelled | all"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Customer)

    if search:
        like = f"%{search}%"
        query = query.filter(or_(models.Customer.name.ilike(like), models.Customer.phone.ilike(like)))

    if plan:
        query = query.filter(models.Customer.plan == plan)

    if status and status != "all":
        query = query.filter(models.Customer.status == status)

    return query.order_by(models.Customer.created_at.desc()).all()


@router.post("", response_model=schemas.Customer, status_code=201)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    normalized_phone = normalize_phone(payload.phone)

    existing = db.query(models.Customer).filter(models.Customer.phone == normalized_phone).first()
    if existing:
        raise HTTPException(status_code=409, detail="A customer with this phone number already exists")

    customer = models.Customer(**{**payload.model_dump(), "phone": normalized_phone})
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=schemas.Customer)
def get_customer(customer_id: uuid.UUID, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: uuid.UUID, payload: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    updates = payload.model_dump(exclude_unset=True)

    if "phone" in updates:
        normalized_phone = normalize_phone(updates["phone"])
        clash = (
            db.query(models.Customer)
            .filter(models.Customer.phone == normalized_phone, models.Customer.id != customer_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail="Another customer already uses this phone number")
        updates["phone"] = normalized_phone

    for field, value in updates.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: uuid.UUID,
    x_confirm_code: str = Header(..., alias="X-Confirm-Code", description="6-character delete confirmation code"),
    db: Session = Depends(get_db),
):
    # Checked before the existence lookup so a wrong code never leaks
    # whether a given customer_id exists.
    if not settings.delete_confirmation_code or x_confirm_code != settings.delete_confirmation_code:
        raise HTTPException(status_code=403, detail="Incorrect confirmation code")

    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db.delete(customer)
    db.commit()
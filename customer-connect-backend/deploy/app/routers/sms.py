"""
Powers the Send SMS page (both the single-message form and the bulk
campaign form) plus the TalkSasa balance card shown on the Dashboard.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import talksasa
from app.services.sms_utils import normalize_phone

router = APIRouter(prefix="/sms", tags=["sms"])


@router.post("/send", response_model=schemas.SendResult)
async def send_single(payload: schemas.SendSingleRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.to)

    # customer_id is optional and only used to link the logged message
    # back to a CRM record — the phone actually sent to is always `to`.
    customer_id = None
    if payload.customer_id:
        customer = db.get(models.Customer, payload.customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        customer_id = customer.id

    batch_id = uuid.uuid4()
    message = models.Message(
        customer_id=customer_id,
        phone=phone,
        body=payload.message,
        status="queued",
        batch_id=batch_id,
    )
    db.add(message)
    db.commit()

    succeeded, failed = 0, 0
    try:
        result = await talksasa.send_sms(phone, payload.message)
    except talksasa.TalkSasaError as exc:
        message.status = "failed"
        message.error = str(exc)
        failed = 1
    else:
        message.status = "sent"
        message.provider_message_id = str(result.get("message_id") or result.get("id") or "")
        succeeded = 1

    db.commit()

    return schemas.SendResult(batch_id=batch_id, total=1, succeeded=succeeded, failed=failed)


@router.post("/send/bulk", response_model=schemas.SendResult)
async def send_bulk(payload: schemas.SendBulkRequest, db: Session = Depends(get_db)):
    batch_id = uuid.uuid4()
    succeeded = 0
    failed = 0

    for raw_phone in payload.recipients:
        phone = normalize_phone(raw_phone)

        # Best-effort link back to a CRM record for this phone, if one
        # exists — recipients are phone numbers, not customer ids, so
        # this is optional and never blocks the send.
        customer = db.query(models.Customer).filter(models.Customer.phone == phone).first()

        message = models.Message(
            customer_id=customer.id if customer else None,
            phone=phone,
            body=payload.message,
            status="queued",
            batch_id=batch_id,
            campaign_name=payload.name,
        )
        db.add(message)
        db.flush()  # get message.id without a full commit yet

        try:
            result = await talksasa.send_sms(phone, payload.message)
        except talksasa.TalkSasaError as exc:
            message.status = "failed"
            message.error = str(exc)
            failed += 1
        else:
            message.status = "sent"
            message.provider_message_id = str(result.get("message_id") or result.get("id") or "")
            succeeded += 1

    db.commit()

    return schemas.SendResult(
        batch_id=batch_id, total=len(payload.recipients), succeeded=succeeded, failed=failed
    )


@router.get("/balance", response_model=schemas.Balance)
async def balance():
    try:
        data = await talksasa.get_balance()
    except talksasa.TalkSasaError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return schemas.Balance(**data)
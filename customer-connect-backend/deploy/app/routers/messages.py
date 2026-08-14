
"""powers the message page"""


from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("", response_model=list[schemas.Message])
def list_messages(
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
    status: str | None = Query(None, description="queued | sent | delivered | failed"),
    customer_id: str | None = Query(None),
    limit: int = Query(50, gen=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(models.Message)

    if from_:
        query = query.filter(models.Message.created_at >= from_)
    if to:
        query = query.filter(models.Message.created_at <= to) 
    if status:
        query = query.filter(models.Message.status == status)
    if customer_id:
        query = query.filter(models.Message.customer_id == customer_id)

    return query.order_by(models.Message.created_at.desc()).limit(limit).all()               












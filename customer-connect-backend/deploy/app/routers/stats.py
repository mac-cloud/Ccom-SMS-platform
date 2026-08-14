"""
Powers the Dashboard's KPI cards: total customers, sent today/this month,
delivery rate, and TalkSasa balance — all in one call so the page loads
with a single round trip.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import talksasa

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=schemas.DashboardStats)
async def dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_customers = db.query(func.count(models.Customer.id)).scalar() or 0

    sent_today = (
        db.query(func.count(models.Message.id)).filter(models.Message.created_at >= start_of_day).scalar() or 0
    )
    sent_month = (
        db.query(func.count(models.Message.id)).filter(models.Message.created_at >= start_of_month).scalar() or 0
    )

    month_total = sent_month
    month_delivered_or_sent = (
        db.query(func.count(models.Message.id))
        .filter(
            models.Message.created_at >= start_of_month,
            models.Message.status.in_(("sent", "delivered")),
        )
        .scalar()
        or 0
    )
    delivery_rate = (month_delivered_or_sent / month_total * 100) if month_total else 0.0

    try:
        balance_data = await talksasa.get_balance()
        balance = balance_data["credits"]
    except talksasa.TalkSasaError:
        # Don't let a TalkSasa outage take down the whole dashboard —
        # show zero balance instead of a 502 on the one endpoint every
        # page depends on.
        balance = 0.0

    return schemas.DashboardStats(
        customers=total_customers,
        sent_today=sent_today,
        sent_month=sent_month,
        delivery_rate=round(delivery_rate, 1),
        balance=balance,
    )
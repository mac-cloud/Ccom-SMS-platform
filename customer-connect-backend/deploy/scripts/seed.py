"""
Populate the database with sample customers and messages so the API and
frontend have something to show. Doesn't call TalkSasa — messages are
inserted directly with a spread of statuses/dates, since the point is to
exercise the endpoints, not actually send SMS.

Usage (from the isp-sms-backend/ folder, with DATABASE_URL set via .env):

    python -m scripts.seed          # add sample data
    python -m scripts.seed --reset  # wipe customers/messages first, then add
"""

import argparse
import random
import uuid
from datetime import datetime, timedelta

from app.database import Base, SessionLocal, engine
from app.models import Customer, Message

SAMPLE_CUSTOMERS = [
    {"name": "Wanjiru Kamau", "phone": "254712345001", "plan": "10 Mbps Home", "status": "active", "notes": "Pays via M-Pesa on the 1st"},
    {"name": "Otieno Odhiambo", "phone": "254712345002", "plan": "20 Mbps Home", "status": "active", "notes": None},
    {"name": "Achieng Mbeki", "phone": "254712345003", "plan": "5 Mbps Home", "status": "suspended", "notes": "Overdue 2 months"},
    {"name": "Kiptoo Rotich", "phone": "254712345004", "plan": "50 Mbps Business", "status": "active", "notes": "Runs a cyber cafe"},
    {"name": "Nyambura Gitau", "phone": "254712345005", "plan": "10 Mbps Home", "status": "cancelled", "notes": "Moved out of coverage area"},
    {"name": "Mutiso Kioko", "phone": "254712345006", "plan": "20 Mbps Home", "status": "active", "notes": None},
    {"name": "Chebet Langat", "phone": "254712345007", "plan": "10 Mbps Home", "status": "active", "notes": None},
    {"name": "Onyango Owuor", "phone": "254712345008", "plan": "50 Mbps Business", "status": "active", "notes": "Second line for backup"},
    {"name": "Wafula Simiyu", "phone": "254712345009", "plan": "5 Mbps Home", "status": "suspended", "notes": "Router needs replacing"},
    {"name": "Njeri Kariuki", "phone": "254712345010", "plan": "10 Mbps Home", "status": "active", "notes": None},
]

MESSAGE_TEMPLATES = [
    "Hi {name}, your internet payment of KES 2,500 is due tomorrow. Pay via Paybill 123456.",
    "Dear {name}, we detected an outage in your area and are working on it. Sorry for the inconvenience.",
    "Hi {name}, thank you for your payment. Your service is now active until the 1st of next month.",
    "Reminder: {name}, your plan renews in 3 days. Reply STOP to opt out of reminders.",
    "Hi {name}, scheduled maintenance tonight 11pm-1am may briefly interrupt your connection.",
]

MESSAGE_STATUSES = ["sent", "delivered", "delivered", "delivered", "failed", "queued"]


def seed(reset: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if reset:
            db.query(Message).delete()
            db.query(Customer).delete()
            db.commit()
            print("Cleared existing customers and messages.")

        customers = []
        for row in SAMPLE_CUSTOMERS:
            existing = db.query(Customer).filter(Customer.phone == row["phone"]).first()
            if existing:
                customers.append(existing)
                continue
            customer = Customer(**row)
            db.add(customer)
            customers.append(customer)
        db.commit()
        for c in customers:
            db.refresh(c)
        print(f"Seeded {len(customers)} customers.")

        # Spread messages over the last 40 days so /stats (today/this month)
        # and the Messages page date filter both have something to show.
        now = datetime.utcnow()
        message_count = 0
        for customer in customers:
            for _ in range(random.randint(2, 5)):
                days_ago = random.randint(0, 40)
                sent_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
                status = random.choice(MESSAGE_STATUSES)
                body = random.choice(MESSAGE_TEMPLATES).format(name=customer.name.split()[0])

                message = Message(
                    customer_id=customer.id,
                    phone=customer.phone,
                    body=body,
                    status=status,
                    error="TalkSasa: recipient unreachable" if status == "failed" else None,
                    cost=round(random.uniform(0.5, 1.2), 4) if status in ("sent", "delivered") else None,
                    created_at=sent_at,
                )
                db.add(message)
                message_count += 1

        # One bulk campaign, all sent together under one batch_id, so the
        # frontend's campaign_name / batch grouping has an example too.
        batch_id = uuid.uuid4()
        campaign_sent_at = now - timedelta(days=5)
        for customer in customers:
            if customer.status != "active":
                continue
            db.add(
                Message(
                    customer_id=customer.id,
                    phone=customer.phone,
                    body="Sasa! We've upgraded our network — expect faster speeds this week.",
                    status="delivered",
                    cost=0.8,
                    batch_id=batch_id,
                    campaign_name="Network upgrade announcement",
                    created_at=campaign_sent_at,
                )
            )
            message_count += 1

        db.commit()
        print(f"Seeded {message_count} messages.")

    finally:
        db.close()


def clear(db=None):
    """Delete all customers and messages, no reseeding. Standalone connection
    if no session is passed in."""
    owns_session = db is None
    db = db or SessionLocal()
    try:
        message_count = db.query(Message).delete()
        customer_count = db.query(Customer).delete()
        db.commit()
        print(f"Deleted {customer_count} customers and {message_count} messages.")
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--reset", action="store_true", help="Delete existing customers/messages, then add sample data")
    group.add_argument("--clear", action="store_true", help="Delete existing customers/messages and exit (no reseeding)")
    args = parser.parse_args()

    if args.clear:
        clear()
    else:
        seed(reset=args.reset)
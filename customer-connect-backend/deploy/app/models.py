"""database table. @ tables only customers amd messages"""


import uuid
from datetime import datetime


from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


from app.database import Base 

#customer page in the frontend
CUSTOMER_STATUSES = ("active", "suspended", "cancelled")

MESSAGE_STATUSES = ("queued", "sent", "delivered", "failed")
class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)

    #stored in E.164-ish normalized form
    phone = Column(String(32), nullable=False, unique=True, index=True)
    plan = Column(String(100), nullable=True)
    status = Column(
        Enum(*CUSTOMER_STATUSES, name="customer_status"),
        nullable=False,
        default="active",
        index=True,

    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    messages = relationship("Message", back_populates="customer")

class Message(Base):
    __tablename__= "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)   

    #Nullable: bulk/single sends to a manually-typed number
    customer_id = Column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True 
    )
    phone = Column(String(32), nullable=False, index=True)
    body = Column(Text, nullable=False)
    status = Column(
        Enum(*MESSAGE_STATUSES, name="message_status"),
        nullable=False,
        default="queued",
        index=True,
    )
    error = Column(Text, nullable=True)
    cost = Column(Numeric(10,4), nullable=True)

    #Group messages sent together as one bulk campaign, Null single sends
    batch_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    campaign_name = Column(String(255), nullable=True)

     # Raw id TalkSasa returns for the send, useful for reconciling delivery
    # reports for a webhook/polling job 
    
    provider_message_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    customer = relationship("Customer", back_populates="messages")



















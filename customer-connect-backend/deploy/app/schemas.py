"""
Pydantic schemas. Response field names deliberately mirror the shapes
listed in the frontend README (Customer, Message, SendResult, Balance,
DashboardStats, ImportResult) so src/lib/api.ts needs no translation layer.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

CustomerStatus = Literal["active", "suspended", "cancelled"]
MessageStatus = Literal["queued", "sent", "delivered", "failed"]


# ---------- Customers ----------

class CustomerBase(BaseModel):
    name: str
    phone: str
    plan: Optional[str] = None
    status: CustomerStatus = "active"
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    # All optional: PUT /customers/:id only needs to send changed fields.
    name: Optional[str] = None
    phone: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[CustomerStatus] = None
    notes: Optional[str] = None


class Customer(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


# ---------- CSV import ----------

class ImportRow(BaseModel):
    """One mapped row as sent by the CSV import wizard after column mapping."""

    name: str
    phone: str
    plan: Optional[str] = None
    status: CustomerStatus = "active"
    notes: Optional[str] = None


class ImportRequest(BaseModel):
    rows: list[ImportRow]


class ImportResult(BaseModel):
    inserted: int
    failed: int
    # src/lib/api.ts types this as string[] (e.g. "Row 3: duplicate phone
    # number"), not structured objects — keep it that way here.
    errors: list[str]


# ---------- Messages ----------

class Message(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    phone: str
    body: str
    status: MessageStatus
    error: Optional[str] = None
    cost: Optional[Decimal] = None
    created_at: datetime


# ---------- Send SMS ----------

class SendSingleRequest(BaseModel):
    # sendSms() in src/lib/api.ts always sends "to" (the phone number —
    # for a CRM-selected customer the frontend fills this with that
    # customer's phone). customer_id is sent alongside it when the
    # message came from selecting a customer, purely so we can link the
    # logged message back to that customer's record.
    to: str
    customer_id: Optional[uuid.UUID] = None
    message: str = Field(min_length=1)


class SendBulkRequest(BaseModel):
    # sendBulkSms() sends raw phone numbers, not customer ids — the
    # frontend resolves "select all" / filtered selections down to phone
    # numbers before calling this endpoint.
    recipients: list[str] = Field(min_length=1)
    message: str = Field(min_length=1)
    name: Optional[str] = None


class SendResult(BaseModel):
    batch_id: uuid.UUID
    total: int
    succeeded: int
    failed: int


# ---------- Balance / stats ----------

class Balance(BaseModel):
    credits: float
    currency: Optional[str] = None


class DashboardStats(BaseModel):
    customers: int
    sent_today: int
    sent_month: int
    delivery_rate: float
    # api.ts types this as a plain number (credits), not a Balance object.
    # Use GET /sms/balance separately if currency is ever needed here too.
    balance: float
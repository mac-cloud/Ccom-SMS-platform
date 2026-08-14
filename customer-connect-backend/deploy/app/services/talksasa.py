
"""thin wrapper around the TalkSasa SMS gateway"""



import httpx 

from app.config import settings

class TalkSasaError(Exception):
    """Raised when TalkSasa returns an error or an unreachable/ bad response"""

def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.talksasa_api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }    

async def send_sms(phone: str, message: str, sender_id: str | None = None) -> dict:
    """Send a single SMS. Return TalkSasa's raw JSON response on success"""
    payload = {
        "recipient": phone,
        "sender_id": sender_id or settings.talksasa_sender_id,
        "type": "plain",
        "message": message,
    }

    async with httpx.AsyncClient(base_url=settings.talksasa_base_url, timeout=30) as client:
        response = await client.post("/sms/send", json=payload,headers=_headers())

    if response.status_code >= 400:
        raise TalkSasaError(f"TalkSasa send failed ({response.status_code}): {response.text}")
    
    return response.json()

async def get_balance() -> dict:
    """fetch current SMS credit balance. Returns {'credits': float, 'currency': str| None}"""
    async with httpx.AsyncClient(base_url=settings.talksasa_base_url, timeout=15) as client:
        response = await client.get("/sms/balance", headers=_headers())

    if response.status_code >= 400:
        raise TalkSasaError(f"TalkSasa balance check failed ({response.status_code}): {response.text}")

    data = response.json()

    return {
        "credits": float(data.get("credits") or data.get("balance") or 0),
        "currency": data.get("currency"),
                         
    }    
        










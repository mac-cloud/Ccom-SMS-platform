
"""Small, dependency-free helpers used before every send
   
- normalize phone
- gsm7_segment_count: mirrors the character/segment counter the frontend
  shows live while composing, so the backend's idea of "how many SMS
  segments will this cost" matches what the user saw before hitting send.
"""


import re 

# GSM 03.38 basic character set (default alphabet). If a message contains
# any character outside this set, the whole message is sent as UCS-2
# instead, which has a much smaller per-segment budget.
_GSM7_BASIC = (
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?"
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
)

# Extended-table characters take 2 characters worth of space (escape + char).
_GSM7_EXTENDED = "^{}\\[~]|€"


def normalize_phone(raw: str, default_country_code: str = "254") -> str:
    """Normalize a phone number to digits-only, country-code-prefixed form"""
    digits = re.sub(r"\D", "", raw or "")
    if not digits:
        raise ValueError(f"'{raw}' is not a valid phone number")
    if digits.startswith("0"):
        digits = default_country_code + digits[1:]
    elif not digits.startswith(default_country_code):
        digits = default_country_code + digits
    return digits 

def gsm7_segment_count(message: str) -> dict:


    is_gem7 = all(ch in _GSM7_BASIC or ch in _GSM7_EXTENDED for ch in message)

    if is_gem7:
        length = sum(2 if ch in _GSM7_EXTENDED else 1 for ch in message)
        single_limit, multi_limit = 160, 153
        encoding = "GSM-7"
    else:
        length = len(message)
        single_limit, multi_limit = 70, 67
        encoding = "UCS-2"

    if length <= single_limit:
        segments = 1 if length > 0 else 0
    else:
        segments = -(-length // multi_limit)

    return {"encoding": encoding, "length": length, "segments": segments}                        

 





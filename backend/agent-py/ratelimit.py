"""Rate limits for the Python-served agent endpoints (slowapi)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

CHAT_LIMIT = "20/minute"
APPROVE_LIMIT = "60/minute"

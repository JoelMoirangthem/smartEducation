"""JWT auth — same secret/claims as the Express server (id, role, name)."""

import jwt
from fastapi import Header, HTTPException

import config


class UserCtx(dict):
    """Per-turn authenticated user context: {id, role, name, token}."""

    @property
    def id(self) -> str:
        return self.get("id", "")

    @property
    def role(self) -> str:
        return (self.get("role") or "student").lower()

    @property
    def name(self) -> str:
        return self.get("name", "")

    @property
    def token(self) -> str:
        return self.get("token", "")


def verify_token(authorization: str | None = Header(default=None, alias="Authorization")) -> dict:
    """Decode `Authorization: Bearer <jwt>`; raises 401 on failure."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Not authorized, no token")
    token = authorization.split(" ", 1)[1].strip()
    if not config.JWT_SECRET:
        raise HTTPException(500, "JWT_SECRET not configured")
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Not authorized, token failed")
    if not payload.get("id"):
        raise HTTPException(401, "Invalid token payload")
    return {
        "id": str(payload["id"]),
        "role": (payload.get("role") or "student").lower(),
        "name": payload.get("name", ""),
        "token": token,
    }

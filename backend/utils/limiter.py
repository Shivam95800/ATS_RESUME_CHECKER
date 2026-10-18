import jwt
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

def get_user_identifier(request: Request) -> str:
    """Extract user identifier for rate limiting: user ID from token or state, falling back to client IP."""
    # 1. Check if user_id was set on request state
    if hasattr(request.state, "user_id") and request.state.user_id:
        return str(request.state.user_id)

    # 2. Extract subject from Bearer token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            sub = payload.get("sub")
            if sub:
                return str(sub)
        except Exception:
            pass

    # 3. Fallback to client remote IP
    return get_remote_address(request)

limiter = Limiter(key_func=get_user_identifier)

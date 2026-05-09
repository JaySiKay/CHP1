import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

if not firebase_admin._apps:
    cred = credentials.Certificate(settings.firebase_dict)
    firebase_admin.initialize_app(cred)

security = HTTPBearer()


def verify_firebase_token(
    res: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    try:
        return auth.verify_id_token(res.credentials, clock_skew_seconds=5)
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except auth.InvalidIdTokenError as e:
        print(f"Firebase invalid token: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    except Exception as e:
        print(f"Firebase verify error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )

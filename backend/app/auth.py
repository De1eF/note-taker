import os
from google.oauth2 import id_token
from google.auth.transport import requests
import jwt
from fastapi import HTTPException, Header

# Load keys
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

def verify_google_token(token: str):
    try:
        # Request Google to verify this token
        id_info = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID
        )
        # Returns the unique Google User ID (sub)
        return id_info['sub']
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")

def create_session_token(user_id: str):
    # Create our internal JWT
    payload = {"user_id": user_id}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

def decode_session_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token Expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid Token")

# Dependency for Routes
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    
    token = authorization.replace("Bearer ", "")
    return decode_session_token(token)

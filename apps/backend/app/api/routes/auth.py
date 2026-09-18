import os
import re
import hashlib
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import List
from uuid import uuid4

import bcrypt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field

# pyrefly: ignore [missing-import]
from app.db.mongodb import active_db
# pyrefly: ignore [missing-import]
from app.services.case_access_service import accessible_case_ids


router = APIRouter(prefix="/auth", tags=["Authentication"])

users = active_db["users"]
sessions = active_db["sessions"]

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

POLICE_RANKS = [
    "Constable", "Head Constable", "Assistant Sub-Inspector (ASI)",
    "Sub-Inspector (SI)", "Inspector", "Station House Officer (SHO)",
    "Assistant Commissioner of Police (ACP)",
    "Deputy Superintendent of Police (DSP)",
    "Additional Superintendent of Police (Addl. SP)", "Superintendent of Police (SP)",
    "Deputy Commissioner of Police (DCP)",
    "Additional Commissioner of Police (Addl. CP)", "Commissioner of Police (CP)",
    "Deputy Inspector General (DIG)", "Inspector General (IG)",
    "Additional Director General of Police (ADGP)", "Director General of Police (DGP)",
]


# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    police_id: str = Field(min_length=1, max_length=100)
    rank: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    department: str = Field(min_length=1, max_length=150)
    role: str = Field(default="investigator")


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    police_id: str
    rank: str
    state: str
    department: str
    role: str = Field(default="investigator")
    case_access_ids: List[str] = Field(default_factory=list)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ---------- Helpers ----------

def user_response(user):
    police_id = user.get("police_id", "")
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        police_id=police_id,
        rank=user.get("rank", "Constable"),
        state=user.get("state", ""),
        department=user.get("department", ""),
        role=user.get("role", "investigator"),
        case_access_ids=accessible_case_ids(police_id) if police_id else [],
    )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def token_hash(token: str) -> str:
    """Store a non-reversible session lookup value instead of a bearer token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def active_session_filter(token: str) -> dict:
    """Support legacy plaintext sessions while new sessions use token_hash."""
    return {
        "revoked": False,
        "$or": [{"token_hash": token_hash(token)}, {"token": token}],
    }


@lru_cache(maxsize=1)
def ensure_session_indexes() -> None:
    """Keep one modern session per token and remove it after JWT expiry."""
    sessions.create_index(
        "token_hash",
        unique=True,
        partialFilterExpression={"token_hash": {"$type": "string"}},
        name="sessions_token_hash_unique",
    )
    sessions.create_index("expires_at", expireAfterSeconds=0, name="sessions_expiry_ttl")
    sessions.create_index([("user_id", 1), ("revoked", 1)], name="sessions_by_user")


def create_token(user):
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    session_id = uuid4().hex

    payload = {
        "sub": str(user["_id"]),
        "username": user["username"],
        "jti": session_id,
        "iat": now,
        "exp": expires_at,
    }

    return (
        jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM),
        session_id,
        expires_at,
    )


# ---------- Register ----------

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(data: RegisterRequest):

    username = data.username.strip()
    email = str(data.email).strip().lower()
    police_id = data.police_id.strip()
    rank = data.rank.strip()
    state = data.state.strip()
    department = data.department.strip()

    if rank not in POLICE_RANKS:
        raise HTTPException(status_code=422, detail="Select a valid Indian police rank.")

    if users.find_one({
        "username": {
            "$regex": f"^{re.escape(username)}$",
            "$options": "i"
        }
    }):
        raise HTTPException(
            status_code=409,
            detail="Username already taken"
        )

    if users.find_one({"email": email}):
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    if users.find_one({"police_id": police_id}):
        raise HTTPException(
            status_code=409,
            detail="Police ID already registered"
        )

    role = data.role.strip().lower() if data.role else "investigator"
    if role not in ["investigator", "supervisor"]:
        role = "investigator"

    user = {
        "username": username,
        "email": email,
        "password_hash": hash_password(data.password),
        "police_id": police_id,
        "rank": rank,
        "state": state,
        "department": department,
        "role": role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }

    result = users.insert_one(user)
    user["_id"] = result.inserted_id

    return user_response(user)


# ---------- Login ----------

@router.post(
    "/login",
    response_model=LoginResponse
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends()
):

    identifier = form_data.username.strip()
    password = form_data.password

    user = users.find_one({
        "$or": [
            {
                "username": {
                    "$regex": f"^{re.escape(identifier)}$",
                    "$options": "i"
                }
            },
            {
                "email": {
                    "$regex": f"^{re.escape(identifier)}$",
                    "$options": "i"
                }
            }
        ]
    })

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password"
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=403,
            detail="Account is disabled"
        )

    password_hash = user.get("password_hash")

    if not password_hash:
        raise HTTPException(
            status_code=401,
            detail="Account has no valid password"
        )

    if not verify_password(password, password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password"
        )

    token, session_id, expires_at = create_token(user)

    ensure_session_indexes()
    sessions.insert_one({
        "token_hash": token_hash(token),
        "session_id": session_id,
        "user_id": user["_id"],
        "revoked": False,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
    })

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=user_response(user)
    )


# ---------- Logout ----------

@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme)):

    result = sessions.update_one(
        active_session_filter(token),
        {
            "$set": {
                "revoked": True,
                "revoked_at": datetime.now(timezone.utc)
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=401,
            detail="Invalid or already logged-out token"
        )

    return {"message": "Successfully logged out"}


# ---------- Current User ----------

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Resolve an active investigator for protected case routes."""
    session = sessions.find_one(active_session_filter(token))
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or logged-out token")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if session.get("session_id") and session["session_id"] != payload.get("jti"):
            raise HTTPException(status_code=401, detail="Invalid session token")
        user = users.find_one({"_id": ObjectId(user_id)})
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    return user


def is_supervisor(user: dict) -> bool:
    """Determine whether the officer holds supervisor privileges."""
    role = user.get("role", "").lower()
    if role == "supervisor":
        return True
    rank = user.get("rank", "")
    SUPERVISOR_RANKS = [
        "Station House Officer (SHO)",
        "Assistant Commissioner of Police (ACP)",
        "Deputy Superintendent of Police (DSP)",
        "Additional Superintendent of Police (Addl. SP)",
        "Superintendent of Police (SP)",
        "Deputy Commissioner of Police (DCP)",
        "Additional Commissioner of Police (Addl. CP)",
        "Commissioner of Police (CP)",
        "Deputy Inspector General (DIG)",
        "Inspector General (IG)",
        "Additional Director General of Police (ADGP)",
        "Director General of Police (DGP)",
    ]
    return rank in SUPERVISOR_RANKS


def get_current_supervisor(current_user: dict = Depends(get_current_user)):
    """Enforce role-based authorization so only supervisors can perform management actions."""
    if not is_supervisor(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supervisor authority required to perform this action.",
        )
    return current_user


@router.get(
    "/me",
    response_model=UserResponse
)
def me(current_user: dict = Depends(get_current_user)):
    return user_response(current_user)

# ---------- Delete Account ----------

@router.delete("/account")
def delete_account(token: str = Depends(oauth2_scheme)):

    # Check active session
    session = sessions.find_one(active_session_filter(token))

    if not session:
        raise HTTPException(
            status_code=401,
            detail="Invalid or logged-out token"
        )

    # Decode JWT
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        user_object_id = ObjectId(user_id)

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    # Make sure user exists
    user = users.find_one({
        "_id": user_object_id
    })

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Delete all sessions belonging to this user
    sessions.delete_many({
        "user_id": user_object_id
    })

    # Delete the account
    result = users.delete_one({
        "_id": user_object_id
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "Account deleted successfully"
    }

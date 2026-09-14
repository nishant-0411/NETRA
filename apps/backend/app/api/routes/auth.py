import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field

from app.db.mongodb import active_db


router = APIRouter(prefix="/auth", tags=["Authentication"])

users = active_db["users"]
sessions = active_db["sessions"]

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    police_id: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    department: str = Field(min_length=1, max_length=150)


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    police_id: str
    state: str
    department: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ---------- Helpers ----------

def user_response(user):
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        police_id=user.get("police_id", ""),
        state=user.get("state", ""),
        department=user.get("department", ""),
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


def create_token(user):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user["_id"]),
        "username": user["username"],
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
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
    state = data.state.strip()
    department = data.department.strip()

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

    user = {
        "username": username,
        "email": email,
        "password_hash": hash_password(data.password),
        "police_id": police_id,
        "state": state,
        "department": department,
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

    token = create_token(user)

    sessions.insert_one({
        "token": token,
        "user_id": user["_id"],
        "revoked": False,
        "created_at": datetime.now(timezone.utc),
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
        {
            "token": token,
            "revoked": False
        },
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

@router.get(
    "/me",
    response_model=UserResponse
)
def me(token: str = Depends(oauth2_scheme)):

    session = sessions.find_one({
        "token": token,
        "revoked": False
    })

    if not session:
        raise HTTPException(
            status_code=401,
            detail="Invalid or logged-out token"
        )

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

        user = users.find_one({
            "_id": ObjectId(user_id)
        })

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=403,
            detail="Account is disabled"
        )

    return user_response(user)

# ---------- Delete Account ----------

@router.delete("/account")
def delete_account(token: str = Depends(oauth2_scheme)):

    # Check active session
    session = sessions.find_one({
        "token": token,
        "revoked": False
    })

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

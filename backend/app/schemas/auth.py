from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    full_name: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class UserLogin(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: str = Field(default="analyst")

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

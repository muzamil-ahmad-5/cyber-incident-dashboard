from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_admin
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import Token, UserLogin, UserCreate, UserResponse
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a SOC analyst or administrator with username and password."""
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        record_audit_event(
            db=db,
            action="LOGIN_FAILED",
            actor=login_data.username,
            outcome="FAILURE",
            details="Invalid username or password attempt"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )

    # Issue JWT token
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}
    )

    record_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        actor=user.username,
        outcome="SUCCESS",
        details=f"User {user.username} successfully authenticated with role '{user.role}'"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name
    }

@router.get("/me", response_model=UserResponse)
def get_current_profile(current_user: User = Depends(get_current_user)):
    """Retrieve profile details for the currently authenticated user."""
    return current_user

@router.post("/register", response_model=UserResponse)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Register a new user account (Admin role required)."""
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_in.username}' is already registered."
        )

    new_user = User(
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name or user_in.username.title(),
        role=user_in.role if user_in.role in ["admin", "analyst"] else "analyst",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit_event(
        db=db,
        action="USER_CREATED",
        actor=admin.username,
        outcome="SUCCESS",
        details=f"Admin {admin.username} created user '{new_user.username}' with role '{new_user.role}'"
    )

    return new_user

@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all user accounts in the SOC platform (Admin only)."""
    return db.query(User).all()

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from .. import auth
from ..schemas import Token, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(body: UserRegister):
    user = auth.register_user(body.email, body.password)
    token = auth.create_access_token(user["email"], user["role"])
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = auth.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid email or password")
    token = auth.create_access_token(user["email"], user["role"])
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: auth.CurrentUser = Depends(auth.get_current_user)):
    return UserOut(email=current_user.email, role=current_user.role)
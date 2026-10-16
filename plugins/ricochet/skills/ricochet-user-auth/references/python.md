# Verify the user in Python

Add the dependency with `uv add "pyjwt[crypto]"`.

## Shared helper

```python
import os

import jwt
from jwt import PyJWKClient

RICOCHET_URL = os.environ.get("RICOCHET_URL", "http://localhost:6188")
CONTENT_ID = os.environ.get("RICOCHET_CONTENT_ID")
DEMO_USER = {"sub": "demo", "name": "Demo User", "role": "developer", "groups": []}

jwks = PyJWKClient(f"{RICOCHET_URL}/.well-known/jwks.json") if CONTENT_ID else None


def ricochet_user(token: str | None) -> dict | None:
    """Return verified claims, None for an anonymous visitor, or raise on a bad token."""
    if not CONTENT_ID:
        return DEMO_USER
    if not token:
        return None
    key = jwks.get_signing_key_from_jwt(token)
    return jwt.decode(token, key.key, algorithms=["RS256"], audience=CONTENT_ID)
```

`PyJWKClient` finds the key by `kid` and caches the key set.
`jwt.decode` checks the signature, `exp`, and `aud`, and does not require `iss` unless told to.

It raises `jwt.InvalidTokenError` on any failure.

## Shiny for Python

Verify once, at the top of `server`:

```python
def server(input, output, session):
    user = ricochet_user(session.http_conn.headers.get("X-Ricochet-User"))
```

## FastAPI

```python
from fastapi import Depends, FastAPI, HTTPException, Request


def current_user(request: Request) -> dict:
    try:
        user = ricochet_user(request.headers.get("X-Ricochet-User"))
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid token")
    if user is None:
        raise HTTPException(status_code=401, detail="not signed in")
    return user


@app.get("/me")
def me(user: dict = Depends(current_user)):
    return {"sub": user["sub"], "name": user.get("name")}
```

## Flask and Dash

Both read the header from Flask's request, inside a route or a Dash callback:

```python
from flask import request

user = ricochet_user(request.headers.get("X-Ricochet-User"))
```

## Streamlit

Streamlit reads headers when the session opens, so verify once and keep the result in session state:

```python
import streamlit as st

if "user" not in st.session_state:
    st.session_state.user = ricochet_user(st.context.headers.get("X-Ricochet-User"))
```

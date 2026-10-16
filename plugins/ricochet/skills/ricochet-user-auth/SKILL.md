---
name: ricochet-user-auth
description: Use for questions about authenticating users or finding out who is signed in to a deployed app, such as how to authenticate a Shiny app, get the current user's name or email, show per-user data, or restrict pages by group or role, in Shiny, Plumber, plumber2, FastAPI, Flask, Streamlit, Dash, Shiny for Python, Genie, or HTTP.jl.
---

# Identify the signed-in user

Ricochet signs users in before they reach an app.
It then adds an `X-Ricochet-User` header to every request, with a signed token that names the user.

The app verifies the token and reads the user from it.
No login code, OAuth client, or password handling belongs in the app.

Read the reference for the app's language before writing code:

- [references/r.md](references/r.md) for Shiny, Plumber, and plumber2
- [references/python.md](references/python.md) for Shiny for Python, FastAPI, Flask, Streamlit, and Dash
- [references/julia.md](references/julia.md) for HTTP.jl and Genie

## Token claims

| Claim | Value |
| --- | --- |
| `sub` | The user's ID from the sign-in provider. Use it as the key for per-user data. |
| `name` | Display name, when the provider sends one |
| `email` | Email, when the provider sends one |
| `role` | `admin`, `developer`, or `consumer`, the user's role on the Ricochet server |
| `groups` | IDs of the user's groups from the sign-in provider |
| `aud` | The ID of the content item the token was issued for |
| `iat`, `exp` | Issue and expiry time in Unix seconds. Tokens expire 5 minutes after issue. |

The token has no `iss` claim, so never configure the token library to require one.

## Verify every token

1. Fetch the signing keys from `$RICOCHET_URL/.well-known/jwks.json` once at startup, and use the key whose `kid` matches the token header.
2. Verify the RS256 signature and `exp`.
3. Check that `aud` equals `RICOCHET_CONTENT_ID`, which rejects a token issued for a different app.

Ricochet sets `RICOCHET_URL` and `RICOCHET_CONTENT_ID` in the app's environment.
Ricochet removes any `X-Ricochet-User` header a browser sends, so the header can only come from Ricochet.

Read only the claims from a token that passed all three checks.

## When there is no header

Visitors to an item with `access_type = "external"` are not signed in, so their requests have no header.
Treat a missing header as an anonymous visitor, not as an error.

Private and internal items always have a signed-in user.

Locally there is no Ricochet, so fall back to a fixed demo user when `RICOCHET_CONTENT_ID` is unset, and never when it is set.

## Shiny, Streamlit, and other WebSocket apps

These apps read request headers once, when the session opens, and the token expires 5 minutes later.
Verify the token at session start and keep the claims for the rest of the session.

Verifying again inside a reactive later in the session fails once the token has expired.

## Restrict by group or role

Check `groups` or `role` from verified claims:

```r
is_finance <- "finance-analysts" %in% claims$groups
is_admin <- identical(claims$role, "admin")
```

```python
is_finance = "finance-analysts" in claims["groups"]
is_admin = claims["role"] == "admin"
```

```julia
is_finance = "finance-analysts" in claims["groups"]
is_admin = claims["role"] == "admin"
```

`groups` lists what the sign-in provider sends, which can be opaque IDs rather than names.
Print the claims for a test user to find the exact values before hard-coding one.

Use this to hide parts of an app.
To control who can open the app at all, use `access_type` and collaborators in Ricochet instead.

## Store data per user

Key stored data by `sub`, never by `name` or `email`, which can change.
Write it to SQLite or files under `persistent/` so it survives redeploys.

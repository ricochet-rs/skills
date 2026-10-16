# Verify the user in Julia

Add `JWTs` and `HTTP` to the project.

```julia
using HTTP, JWTs

ricochet_url = get(ENV, "RICOCHET_URL", "http://localhost:6188")
content_id = get(ENV, "RICOCHET_CONTENT_ID", "")

verifier = JWTs.Verifier(; jwks_uri = "$ricochet_url/.well-known/jwks.json", algorithms = ["RS256"])

# Returns verified claims, nothing for an anonymous visitor, or throws on a bad token
function ricochet_user(token::AbstractString)
    isempty(content_id) && return Dict("sub" => "demo", "name" => "Demo User")
    isempty(token) && return nothing
    claims = JWTs.claims(JWTs.verify(verifier, token))
    aud = get(claims, "aud", nothing)
    audiences = aud isa AbstractString ? [aud] : something(aud, [])
    content_id in audiences || error("token issued for different content")
    claims
end
```

`JWTs.Verifier` fetches and caches the key set, refreshes it on an unknown `kid`, and checks the signature and `exp`.

In an HTTP.jl handler, read the header from the request:

```julia
user = ricochet_user(HTTP.header(http.message, "X-Ricochet-User", ""))
```

In Genie, read the same header from the current request inside the route and pass it to `ricochet_user`.

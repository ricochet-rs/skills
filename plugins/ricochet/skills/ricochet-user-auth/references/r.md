# Verify the user in R

Add `jose` and `yyjsonr` to the project and run `renv::snapshot()`.

## Shared helper

Put this in a file the app sources, such as `R/ricochet_user.R`:

```r
ricochet_url <- Sys.getenv("RICOCHET_URL", "http://localhost:6188")
content_id <- Sys.getenv("RICOCHET_CONTENT_ID")

jwks <- if (nzchar(content_id)) {
  yyjsonr::read_json_conn(
    file.path(ricochet_url, ".well-known", "jwks.json"),
    arr_of_objs_to_df = FALSE
  )$keys
}

demo_user <- list(sub = "demo", name = "Demo User", email = NULL, role = "developer", groups = list())

# Returns verified claims, NULL for an anonymous visitor, or stops on a bad token
ricochet_user <- function(token) {
  if (!nzchar(content_id)) return(demo_user)
  if (is.null(token) || !nzchar(token)) return(NULL)

  kid <- jose::jwt_split(token)$header$kid
  key <- Find(function(k) identical(k$kid, kid), jwks)
  if (is.null(key)) stop("token signed with an unknown key")

  claims <- jose::jwt_decode_sig(token, jose::read_jwk(key))
  if (!identical(claims$aud, content_id)) stop("token issued for different content")
  claims
}
```

`jwt_decode_sig()` checks the signature and `exp`, and the helper checks `aud`.

## Shiny

Verify once per session, at the top of `server`:

```r
server <- function(input, output, session) {
  user <- ricochet_user(session$request$HTTP_X_RICOCHET_USER)

  output$greeting <- renderText({
    if (is.null(user)) "Hello, guest" else paste("Hello,", user$name)
  })
}
```

## Plumber

The header arrives as `req$HTTP_X_RICOCHET_USER`.
Verify on each request, because every request has a fresh token:

```r
#* @get /me
function(req, res) {
  user <- tryCatch(ricochet_user(req$HTTP_X_RICOCHET_USER), error = function(e) {
    res$status <- 401
    NULL
  })
  if (is.null(user)) return(list(error = "not signed in"))
  user[c("sub", "name", "email")]
}
```

## plumber2

Read the header with `request$get_header("x-ricochet-user")` inside the handler, then call `ricochet_user()` the same way.

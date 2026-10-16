# R content

Every R item needs a current `renv.lock` beside `_ricochet.toml`.
Run `renv::snapshot()` from the content directory after changing dependencies.

`pak` and `install.packages()` workflows without renv are not supported.
Packages the app loads only at startup, such as `pkgload`, must be in the lockfile too.

## Shiny (`shiny`)

The entrypoint is `app.R`, or a directory holding `ui.R` and `server.R`.
Ricochet starts the app and passes the port, so never call `runApp()` with a port.

```toml
[content]
name = "sales-explorer"
entrypoint = "app.R"
access_type = "internal"
content_type = "shiny"

[language]
name = "r"
packages = "renv.lock"
```

A golem app deploys from an `app.R` that loads the package and runs it:

```r
pkgload::load_all(export_all = FALSE, helpers = FALSE, attach_testthat = FALSE)
options("golem.app.prod" = TRUE)
pkgload::pkg_env("myapp")$run_app()
```

Calling `run_app()` through `pkgload::pkg_env()` stops the automatic sourcing of `R/` by Shiny from replacing it.
Keep `dev/` out of renv's dependency scan with a `.renvignore`.

## Shiny documents (`rmd-shiny`, `quarto-r-shiny`)

`rmd-shiny` is an R Markdown file with `runtime: shiny_prerendered`.
`quarto-r-shiny` is a `.qmd` with `server: shiny` and its server code in `#| context: server` chunks.

## Plumber (`plumber`)

The entrypoint is `plumber.R` with `#*` annotations.
Ricochet builds and runs the router, so the file defines only the endpoints.

```r
#* @get /echo
function(msg = "") list(msg = msg)
```

## plumber2 and other `_server.yml` engines (`r-server`)

The entrypoint is `_server.yml`, never `app.R`, because `app.R` on its own deploys as Shiny.

```yaml
engine: plumber2
constructor: app.R
```

The engine package, such as `plumber2`, must be in `renv.lock`, or the deployment fails.

## Ambiorix (`ambiorix`)

The entrypoint builds the app and ends with `app$start()`.
Ricochet sets `AMBIORIX_PORT`, which Ambiorix reads.

## Any other server (`r-service`)

The entrypoint starts the server itself on `PORT`:

```r
port <- as.integer(Sys.getenv("PORT", "8080"))
httpuv::runServer("0.0.0.0", port, app)
```

## Tasks (`r`, `rmd`, `quarto-r`)

An `r` task runs the entrypoint script top to bottom and exits.
Print progress with `message()` or `cat()`, because the output is the run log.

`rmd` and `quarto-r` render the document.
Add `[static]` to serve the HTML, and set `output_dir` when the render writes somewhere other than the bundle root, such as `_book` for `bookdown`.

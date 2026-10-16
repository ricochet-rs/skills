---
name: ricochet-apps
description: Use for questions about making an app, report, notebook, or script work once deployed, such as keeping a SQLite or DuckDB database or other files across deployments, which content type or entrypoint to use, which port to listen on, links that break under `/app/<id>`, or serving a rendered report as a website, for Shiny, Plumber, plumber2, Ambiorix, FastAPI, Flask, Dash, Streamlit, Shiny for Python, Genie, Dash.jl, HTTP.jl, Quarto, R Markdown, Jupyter, and R, Python, or Julia scripts.
---

# Build content for Ricochet

Ricochet runs two kinds of content.
An **app** keeps running and serves HTTP: Shiny, Plumber, FastAPI, Streamlit, and similar.

A **task** runs once and exits: a script, an R Markdown or Quarto render, or a Jupyter notebook.
Decide the kind first, because it sets the content type, whether `[serve]` or `[schedule]` is allowed, and how the code starts.

Use the `ricochet-cli` skill to write `_ricochet.toml` and deploy.
Read the reference for the language before changing app code:

- [references/r.md](references/r.md) for Shiny, golem, Plumber, plumber2, Ambiorix, R Markdown, and R scripts
- [references/python.md](references/python.md) for FastAPI, Flask, Dash, Streamlit, Shiny for Python, Jupyter, and Python scripts
- [references/julia.md](references/julia.md) for Genie, Dash.jl, HTTP.jl, and Julia scripts

## Choose the content type

| Language | Apps | Tasks |
| --- | --- | --- |
| R | `shiny`, `rmd-shiny`, `quarto-r-shiny`, `plumber`, `ambiorix`, `r-server`, `r-service` | `r`, `rmd`, `quarto-r` |
| Python | `shiny-py`, `fast-api`, `flask`, `dash`, `streamlit`, `python-service` | `python`, `quarto-py`, `jupyter` |
| Julia | `genie`, `julia-service` | `julia`, `quarto-jl` |

Use the framework's own type whenever one exists.
Fall back to `r-service`, `python-service`, or `julia-service` for any other HTTP server, which must bind the port itself.

## Bind the port

Ricochet assigns a free port to every app instance and sets `PORT`, `RICOCHET_PORT`, `SHINY_PORT`, `FLASK_RUN_PORT`, and `AMBIORIX_PORT` to it.
Read `PORT` and listen on `0.0.0.0`.

Ricochet starts these frameworks itself and passes the port, so the code needs no port handling: `shiny`, `rmd-shiny`, `quarto-r-shiny`, `plumber`, `ambiorix`, `r-server`, `shiny-py`, `fast-api`, and `streamlit`.
Every other app type runs the entrypoint as a script, so the script must start the server on `PORT`.

An app that never binds is retried 5 times and then marked failed.

## Handle the base path

Ricochet serves an app at `https://<server>/app/<content-id>/`, or at `https://<server>/app/<slug>/` when it has a slug, and strips that prefix before the request reaches the app.

Links written relative to the current page work everywhere.
Links that start with `/` point at the server root and break.

Frameworks that build absolute URLs need the prefix:

- FastAPI: `FastAPI(root_path=f"/app/{os.environ['RICOCHET_CONTENT_ID']}")`
- Julia services and Genie: read `BASEPATH`, which Ricochet sets to `/app/<content-id>`

Fall back to an empty prefix when the variable is absent, so the app still runs locally.

## Variables Ricochet sets

| Variable | Value |
| --- | --- |
| `PORT` | The port to listen on (apps only) |
| `RICOCHET_CONTENT_ID` | The item's ID, which is also the `aud` of the user token |
| `RICOCHET_URL` | The server's base URL, for calling back to it |
| `BASEPATH` | `/app/<content-id>` (Julia services only) |

User-defined variables are set with `ricochet app env-vars set` or `ricochet task env-vars set`, never committed to the bundle.
`.env` and `.Renviron` are left out of every deploy.

## Keep files across deployments

The working directory is the bundle, so relative paths resolve inside it.
Every deploy replaces the bundle, and anything written there is lost.

Write anything that must last to `persistent/`, which is linked into every deployment of the item and shared by all its instances:

```r
dir.create("persistent", showWarnings = FALSE)
saveRDS(results, file.path("persistent", "results.rds"))
```

```python
from pathlib import Path

Path("persistent").mkdir(exist_ok=True)
results.to_parquet("persistent/results.parquet")
```

```julia
mkpath("persistent")
write(joinpath("persistent", "results.json"), JSON3.write(results))
```

Several instances can write to `persistent/` at once, so use SQLite or one file per writer instead of appending to a shared file.
Keep secrets in environment variables, never in `persistent/`.

## Serve rendered output as a static site

R Markdown, Quarto, and Jupyter tasks render to HTML.
Ricochet serves the result only when `_ricochet.toml` has a `[static]` table:

```toml
[static]
output_dir = "_site"
index = "index.html"
```

`output_dir` is where the render writes, relative to the bundle, and `index` defaults to `index.html`.
A Quarto entrypoint of `_quarto.yml` renders the whole project, which is how websites and books deploy.

Jupyter output is always served as a static site.
A task with `[static]` and `[schedule]` republishes the site on every run, which is how a daily report stays current.

## Scale and size

Use the `ricochet-scaling` skill for instance counts and connections, and the `ricochet-resources` skill for CPU and memory.

## Before deploying

- [ ] The lockfile exists and is current: `renv.lock`, `uv.lock` with `.python-version`, or `Manifest.toml`
- [ ] Apps that run as scripts listen on `PORT` and `0.0.0.0`
- [ ] No link or asset path starts with `/`
- [ ] Files that must survive a redeploy are written to `persistent/`
- [ ] Rendered tasks that should be viewable have `[static]`

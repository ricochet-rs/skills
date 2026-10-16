# `_ricochet.toml` reference

A `_ricochet.toml` describes one content item.
Put it in the deployed directory, beside the package lockfile.

Only `[content]` and `[language]` are required.
Some tables are rejected for the wrong kind of content.

## `[content]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | no | The item ID. Leave it out for a new item. The first deploy writes it in. |
| `name` | string | yes | Display name, up to 120 characters |
| `slug` | string | no | URL name, served at `https://<server>/app/<slug>`. Letters, digits, `-`, and `_`. |
| `entrypoint` | path | yes | Relative to the deployed directory. See [content types](#content-types). |
| `access_type` | string | yes | `private`, `internal`, or `external` |
| `content_type` | string | yes | See [content types](#content-types) |
| `summary` | string | no | Short description shown in the web UI |
| `thumbnail` | path | no | Image shown in the web UI: `.png`, `.jpg`, or `.gif` up to 5 MB |
| `tags` | list of strings | no | Labels for finding the item |
| `include` | list of globs | no | When set, only matching files are deployed |
| `exclude` | list of globs | no | Matching files are left out, after `include` |
| `exec_env` | string | no | Execution environment image, on servers that run content in containers |

`.venv`, `.renv`, and `__pycache__` are always left out, even when `include` names them.

## `[language]`

| Key | Required | Notes |
| --- | --- | --- |
| `name` | yes | `r`, `python`, or `julia`, matching the content type |
| `packages` | yes | `renv.lock` for R, `uv.lock` for Python, or `Manifest.toml` for Julia |

The lockfile must exist before deploying.
The CLI also finds `uv.lock` and `.python-version` in a parent directory, as in a uv workspace.

## `[schedule]`

Tasks only.

| Key | Notes |
| --- | --- |
| `cron` | A cron expression such as `0 9 * * 1-5`, or `@hourly`, `@daily`, `@weekly`, `@monthly`. Runs in UTC. |

The server reads `[schedule]` when it creates the item.
Change it later with `ricochet task schedule` or `ricochet task settings update`.

## `[serve]`

Apps only.
Once the table exists, the first four keys are required.

| Key | Type | Typical | Notes |
| --- | --- | --- | --- |
| `min_instances` | integer | `0` | Instances kept running |
| `max_instances` | integer | `5` | Most instances at once |
| `spawn_threshold` | integer | `80` | Percentage of `max_connections` that starts another instance |
| `max_connections` | integer | `10` | Connections one instance takes |
| `max_connection_age` | seconds | unset | How long an instance may live. Unset, it ends when its last connection closes. |
| `inactive_timeout` | seconds | unset | Idle time before a connection is closed |
| `connection_timeout` | seconds | unset | Time allowed to reach an instance |

### `[serve.k8s]`

On Kubernetes servers only.

| Key | Notes |
| --- | --- |
| `strategy` | `rolling` (default) or `recreate`, for how a redeploy replaces instances |
| `max_surge` | Count or percentage, such as `1` or `25%` |
| `max_unavailable` | Count or percentage, such as `0` or `10%` |
| `config` | Extra Deployment settings, allowed only when the server admin turns it on |

## `[static]`

Tasks only.
Serves the rendered output at `https://<server>/static/<id>`.

| Key | Notes |
| --- | --- |
| `output_dir` | Where the render writes, relative to the deployed directory |
| `index` | File served first. Defaults to `index.html`. |
| `render_fn` | For `rmd` tasks, an R function called with the entrypoint instead of `rmarkdown::render`, such as `bookdown::render_book` |

## `[resources]`

Apps and tasks.
Unset keys use the server's defaults.

| Key | Example | Notes |
| --- | --- | --- |
| `cpu_request` | `"500m"` | `"500m"` is half a core, and `"2"` is two cores |
| `cpu_limit` | `"2"` | Same format |
| `memory_request` | `"512Mi"` | `Ki`, `Mi`, or `Gi` suffix |
| `memory_limit` | `"2Gi"` | Same format |
| `restore_timeout` | `1800` | Seconds allowed for installing packages. `0` removes the limit. |

## `[repositories]`

| Key | Notes |
| --- | --- |
| `r` | Named repositories, such as `{ CRAN = "https://cran.rpkgs.com" }`. Names are uppercase letters and underscores. |
| `python` | Ordered list of package index URLs |

The server admin can merge these with server-wide repositories, or ignore them.
Ricochet has no setting for extra Julia package sources.

## `[retention]`

How many old deployments the server keeps for this item.
These can only be stricter than the server's own policy.

| Key | Notes |
| --- | --- |
| `max_deployments` | Deployments kept. The server default is `20`. |
| `max_age_days` | Deployments older than this are removed |

## `[env_vars]`

Written by `ricochet deploy -e`.
Never edit it.
Manage variables with `ricochet app env-vars` or `ricochet task env-vars`.

## Content types

Tasks run and exit, and can be scheduled and served as static output.
Apps keep running and serve requests.

| `content_type` | Language | Kind | Entrypoint |
| --- | --- | --- | --- |
| `r` | R | task | `.R` |
| `rmd` | R | task | `.Rmd` or `.R` |
| `quarto-r` | R | task | `.qmd`, `.Rmd`, `.R`, or `_quarto.yml` |
| `shiny` | R | app | `.R`, or a directory with `ui.R` and `server.R` |
| `rmd-shiny` | R | app | `.Rmd` with `runtime: shiny_prerendered` |
| `quarto-r-shiny` | R | app | `.qmd` with `server: shiny` |
| `plumber` | R | app | `.R` with Plumber annotations |
| `r-server` | R | app | `_server.yml`, as for plumber2 |
| `ambiorix` | R | app | `.R` |
| `r-service` | R | app | `.R` that serves on `PORT` |
| `python` | Python | task | `.py` |
| `quarto-py` | Python | task | `.qmd` or `_quarto.yml` |
| `jupyter` | Python | task | `.ipynb` |
| `shiny-py` | Python | app | `.py`, or a directory |
| `fast-api` | Python | app | `.py` that defines `app` |
| `flask` | Python | app | `.py` that serves on `PORT` |
| `dash` | Python | app | `.py` that serves on `PORT` |
| `streamlit` | Python | app | `.py` |
| `python-service` | Python | app | `.py` that serves on `PORT` |
| `julia` | Julia | task | `.jl` |
| `quarto-jl` | Julia | task | `.qmd` or `_quarto.yml` |
| `genie` | Julia | app | `.jl` |
| `julia-service` | Julia | app | `.jl` that serves on `PORT` |

## Examples

A Quarto report that refreshes every weekday morning:

```toml
[content]
name = "Weekly sales report"
entrypoint = "report.qmd"
access_type = "internal"
content_type = "quarto-r"
summary = "Sales rollup, refreshed every weekday morning."
tags = ["sales", "reporting"]

[language]
name = "r"
packages = "renv.lock"

[repositories]
r = { CRAN = "https://cran.rpkgs.com" }

[schedule]
cron = "0 9 * * 1-5"

[static]
output_dir = "_site"

[retention]
max_deployments = 10
```

A Shiny app kept warm with memory limits:

```toml
[content]
name = "Fleet dashboard"
entrypoint = "app.R"
access_type = "internal"
content_type = "shiny"

[language]
name = "r"
packages = "renv.lock"

[serve]
min_instances = 1
max_instances = 10
spawn_threshold = 75
max_connections = 20
inactive_timeout = 900

[resources]
cpu_limit = "1"
memory_limit = "2Gi"
```

A FastAPI service:

```toml
[content]
name = "Scoring API"
entrypoint = "main.py"
access_type = "internal"
content_type = "fast-api"

[language]
name = "python"
packages = "uv.lock"

[serve]
min_instances = 1
max_instances = 4
spawn_threshold = 80
max_connections = 50
```

A Julia Genie app:

```toml
[content]
name = "Forecast explorer"
entrypoint = "app.jl"
access_type = "internal"
content_type = "genie"

[language]
name = "julia"
packages = "Manifest.toml"
```

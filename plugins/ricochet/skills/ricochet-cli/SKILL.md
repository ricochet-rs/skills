---
name: ricochet-cli
description: Use for any request to deploy, publish, host, share, or put online a Shiny app, Plumber or plumber2 API, Ambiorix, FastAPI, Flask, Dash, Streamlit, Shiny for Python, Genie, or Dash.jl app, a Quarto or R Markdown report, a Jupyter notebook, or an R, Python, or Julia script, and for installing the `ricochet` CLI, getting a server, signing in, writing `_ricochet.toml`, environment variables, running and scheduling tasks, deleting content, and CLI errors.
---

# Deploy with the Ricochet CLI

The `ricochet` CLI deploys content to a Ricochet server and manages it afterward.
Read [references/ricochet-toml.md](references/ricochet-toml.md) before writing a `_ricochet.toml`.

Run `ricochet <COMMAND> --help` for every flag.

## Install the CLI

Run `ricochet --version` first, and install only when it is missing.
Ask the user before installing, because the installer downloads and runs a script.

```sh
# macOS, Linux, Git Bash, or WSL
curl -fsSL https://raw.githubusercontent.com/ricochet-rs/cli/main/install.sh | sh

# macOS with Homebrew
brew tap ricochet-rs/homebrew-tap
brew install ricochet
```

```powershell
# Windows PowerShell
curl.exe -fsSL https://raw.githubusercontent.com/ricochet-rs/cli/main/install.ps1 -o install.ps1; .\install.ps1; Remove-Item install.ps1
```

`install.sh` installs to `~/.local/bin`, `$HOME/bin` under Git Bash, or `/usr/local/bin` as root.
`install.ps1` installs to `$HOME\bin` and adds it to the user `PATH`.

The current shell may not find `ricochet` yet.
Call it by the full path the installer prints, and tell the user how to add that directory to `PATH`.

Set `RICOCHET_VERSION` to pin a release, or `RICOCHET_INSTALL_DIR` to choose the directory.
In the `sh` pipeline, put the variable before `sh`:

```sh
curl -fsSL https://raw.githubusercontent.com/ricochet-rs/cli/main/install.sh | RICOCHET_INSTALL_DIR="$HOME/bin" sh
```

## Get a server

Deploying needs a Ricochet server.
When `ricochet server list` shows none and the user has no server address, offer these:

- **Ricochet Cloud**: create an organization at [cloud.ricochet.rs](https://cloud.ricochet.rs) for a free 14-day trial, then create an instance at `https://<instance>-<organization>.cloud.ricochet.rs`.
- **Self-hosted**: install Ricochet on a Linux server, in Docker, or on Kubernetes, following [docs.ricochet.rs](https://docs.ricochet.rs), and it runs as the free Community Edition.
- **License**: buy an Enterprise license for one self-hosted server at [ricochet.rs/pricing](https://ricochet.rs/pricing).

A Cloud instance is ready in about a minute.
The first person to sign in to a new server becomes its admin.

The Community Edition serves public content only, and supports 2 users with the Admin or Developer role and 3 Git deployments.
When a deploy fails on one of those limits, tell the user it needs a license or Ricochet Cloud.

## First deploy

Follow these steps for a directory that has never been deployed:

1. Run `ricochet detect . -F json` to list the language, each candidate entrypoint with its content type, and whether the lockfile exists.
2. Choose the content type and entrypoint with the rules below.
3. Confirm `name`, `slug`, and `access_type` with the user when they did not say, defaulting `access_type` to `private`.
4. Write `_ricochet.toml` by hand, as in [Describe the item](#describe-the-item).
5. Run `ricochet deploy . -S <profile> --follow`.
6. On `No API key configured` or `Credentials are invalid or expired`, run `ricochet login -S <profile>` and deploy again.
7. Give the user the overview link that `deploy` prints, or read the streamed logs when it fails.

Choose the content type with these rules:

- A `_server.yml` means `r-server` with `entrypoint = "_server.yml"`, even beside an `app.R`, because `app.R` alone deploys as Shiny.
- A `.qmd` or `_quarto.yml` is `quarto-r`, `quarto-py`, or `quarto-jl`, matching the language that renders it.
- A Python web framework has its own type: `fast-api`, `flask`, `streamlit`, `dash`, or `shiny-py`.
- A script that runs and exits is a task: `r`, `python`, or `julia`.

`slug` sets the address, `https://<server>/app/<slug>`, using letters, digits, `-`, and `_`.
The server derives one from `name` when it is absent.

`access_type` takes one of three values:

- `private`: the owner and the collaborators they add
- `internal`: every signed-in user of the server
- `external`: anyone, without signing in

Add collaborators and share with groups in the item's settings in the web UI.

## Work without a terminal

`ricochet init` refuses to run without an interactive terminal, or when `CI` or `RICOCHET_NON_INTERACTIVE` is set.
In those cases, `ricochet deploy` fails with `No _ricochet.toml found` instead of offering to create one.
So write `_ricochet.toml` by hand in non-interactive sessions and CI.

`ricochet detect . -F json` gathers what `init` would ask, and never writes a file.
It reports the language, each possible entrypoint with its content type, whether the lockfile exists, and a Quarto project's output directory.
A directory with both `app.R` and `report.qmd` lists both.

Pass `-F json` to any command whose output you parse.
With `-F json` or `-F yaml`, stdout has only the data, and messages and links go to stderr.

`ricochet deploy -F json` writes one JSON event per line.
The last line is `{"event":"done",...}` with the item `id` and, for a local deploy, the `deployment_id`.
On failure it is `{"event":"error",...}` with a `kind` of `project`, `auth`, `network`, `rejected`, or `server`.

Pass `--debug` to show the request and response when a command fails.

## Connect to a server

Servers are named profiles in `~/.config/ricochet/config.toml` on every platform:

```sh
ricochet server add production https://ricochet.example.com --default
ricochet server list
ricochet server set-default production
```

The address must start with `http://` or `https://`.

```sh
ricochet login -S production
ricochet login -S production --no-browser
ricochet login -S https://ricochet.example.com -k rico_...
```

- On the user's own machine, run `ricochet login -S <profile>` yourself, which opens their browser, waits up to 5 minutes for approval, and stores the key.
- Over SSH, in a dev container, or in a remote editor, pass `--no-browser`, which prints the server's `/credentials` page and reads the key from a prompt or stdin.
- `-k` takes a key directly.

Keys from `ricochet login` expire after 8 hours, so expect to sign in again in a new session.
For automation, create a key in the web UI and set `RICOCHET_API_KEY`.

The CLI chooses the server in this order:

1. `RICOCHET_SERVER`, which wins over `-S`
2. `-S` or `--server`, matched to a profile name, then to a configured address
3. The default profile

`RICOCHET_API_KEY` replaces the stored key for the chosen server.
`ricochet config` prints the resolved settings, and `ricochet config -A` includes the stored keys.

## Describe the item

Each deployed directory has a `_ricochet.toml` beside its lockfile:

```toml
[content]
name = "weekly-report"
entrypoint = "report.qmd"
access_type = "private"
content_type = "quarto-r"

[language]
name = "r"
packages = "renv.lock"

[schedule]
cron = "0 9 * * 1-5"
```

A new item has no `content.id`.
The first deploy writes the ID into the file, and later deploys of that directory update the same item.
Most `app` and `task` commands read the ID from the local file when you leave out `ID`, so run them from the content directory or pass `-p`.

The lockfile must exist before deploying: `renv.lock` for R, `uv.lock` for Python, or `Manifest.toml` for Julia.
Python also needs `.python-version`.
The CLI finds both in a parent directory too, as in a uv workspace.

## Deploy

```sh
ricochet deploy
ricochet deploy ./reports -S staging
ricochet deploy --follow
ricochet deploy --dry-run
ricochet deploy -e DATABASE_URL -e LOG_LEVEL=debug
```

- `--follow` streams the deployment logs and exits non-zero when the deployment fails.
- `--dry-run` lists the files that would be deployed.
- The path is a directory with `_ricochet.toml` in it, not the file itself.
- Everything in the directory is deployed except `.venv`, `.renv`, and `__pycache__`, and `content.include` and `content.exclude` narrow it further.

`-e KEY=VALUE` sets a variable, and `-e KEY` reads it from `.env`, `.Renviron`, or the environment.
Values are encrypted before they leave the machine.

`-e` works on the first deploy only, so use `env-vars` after that.

Deploy from Git without uploading files:

```sh
ricochet user credentials
ricochet deploy --git https://github.com/acme/reports --branch main --path dashboards --credential <CREDENTIAL_ID>
```

## Manage apps

```sh
ricochet app list -a --sort=-updated
ricochet app instances
ricochet app stop
ricochet app stop <ID> <INSTANCE_ID>
ricochet app toml <ID>
ricochet app deployment list <ID> --fields all
ricochet app deployment get <DEPLOYMENT_ID>
```

`ricochet app stop` without an instance stops every instance of the item.
`ricochet app toml` shows the item's settings as the server has them.

Delete an app or task with `ricochet delete <ID>`, which asks first unless `-f` is given.
Deleting cannot be undone, so confirm the ID with the user.

## Manage tasks

Tasks run and exit: `r`, `rmd`, `quarto-r`, `python`, `quarto-py`, `jupyter`, `julia`, and `quarto-jl`.

```sh
ricochet task list
ricochet task invoke <ID>
ricochet task invoke <ID> --wait
ricochet task invocation get <ID> <INVOCATION_ID>
ricochet task schedule <ID> "0 9 * * 1-5"
```

- `task invoke` starts a run and prints its ID.
- `--wait` waits for the run to finish and exits non-zero when it fails, so a task can be a CI step.
- `task invocation get` shows one run's status.
- `task schedule` checks the cron expression and prints the next run time in UTC.

## Change settings

Edits to `_ricochet.toml` reach the server only when applied:

```sh
ricochet app settings
ricochet app settings update
ricochet task settings update -f
```

`settings` shows how the local file differs from the server, and `update` applies it.

## Keep `_ricochet.toml` in sync

The local file and the server drift apart:

- A redeploy does not apply settings edits.
- `[schedule]` is read only when the item is created.
- Changes made in the web UI or the API never reach the local file.

Run `ricochet app settings` or `ricochet task settings` before changing settings, and decide which side is right.

- **The server is right**: copy the differing tables from `ricochet app toml <ID>` or `ricochet task toml <ID>` into the local file, keeping the local `id`.
- **The local file is right**: run `ricochet app settings update` or `ricochet task settings update`.

After a change through `ricochet task schedule` or the web UI, update the local file to match.

## Environment variables

```sh
ricochet app env-vars get
ricochet app env-vars set API_TOKEN LOG_LEVEL=debug
ricochet app env-vars delete API_TOKEN
ricochet app env-vars replace API_TOKEN=abc
```

- `get` lists names, never values.
- `set` adds or updates the listed variables only.
- `replace` deletes every variable not listed, so `replace` with no arguments deletes them all.
- A bare `KEY` reads its value from `.env`, `.Renviron`, or the environment.

The same commands work under `ricochet task`.

## Errors

| Message | Fix |
| --- | --- |
| `No API key configured` | Run `ricochet login -S <profile>`, or set `RICOCHET_API_KEY`. |
| `Credentials are invalid or expired for server <url>` | The key is missing, wrong, or older than 8 hours. Run `ricochet login -S <url>`. |
| `Cannot run init in non-interactive mode` | Run `ricochet detect -F json`, then write `_ricochet.toml` by hand. |
| `No _ricochet.toml found in <dir>` | Create the file, or pass the directory that has it. |
| `Path must be a directory containing _ricochet.toml` | Pass the directory, not the file. |
| ``Required package file `renv.lock` not found`` | Run `renv::snapshot()` in R, `uv lock` in Python, or `Pkg.instantiate()` in Julia. |
| ``Please create a `.python-version` via `uv python pin` `` | Run `uv python pin 3.12` beside `uv.lock`. |
| `403` while redeploying | The ID belongs to another server, or the user lacks permission. Check `-S` before removing `content.id`, which creates a new item. |
| `Environment variables can only be set on a content item's first deployment` | Deploy without `-e`, then run `ricochet app env-vars set`. |
| `Server '<name>' not found` | Run `ricochet server list`, then `ricochet server add`. |
| `Server URL must include the scheme prefix` | Start the address with `http://` or `https://`. |
| `Local _ricochet.toml has no item ID` | Deploy once, or pass the ID. |
| `Package file required` | Set `packages = "uv.lock"` for Python. |
| `Chosen content type cannot be served` | Remove `[serve]` from a task. |
| `Chosen content type cannot be scheduled. It must be served.` | Remove `[schedule]` from an app. |
| `Chosen content type cannot be served as a static site` | Remove `[static]` from an app. |
| `Invalid entrypoint` | Match the entrypoint to the content type, as the reference lists. |

## Keep the CLI current

```sh
ricochet self update --dry-run
ricochet self update
```

Update checks are off when `CI` or `RICOCHET_NO_UPDATE_CHECK` is set, when `skip_update_check` is true in the config, or for Homebrew installs.

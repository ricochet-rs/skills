---
name: ricochet-server-config
description: Use for questions about configuring a self-hosted Ricochet server in ricochet-config.toml, such as where the file lives, overriding settings with environment variables, setting the public URL and ports, moving from SQLite to Postgres, storing encryption keys, limiting deployment history and bundle size, setting server-wide package repositories like CRAN or a private PyPI, default memory limits, package install timeouts, the time limit on task runs, or sending email notifications through an SMTP mail server.
---

# Configure the server

Ricochet reads `ricochet-config.toml` at start, so restart it after every change.
It writes a default file on first start when none exists.

The packaged service reads `/var/lib/ricochet/ricochet-config.toml`.
Elsewhere, pass the path with `ricochet start --config <path>`.

## Environment variables

Every key can be set as an environment variable, which wins over the file.
Prefix it with `RICOCHET_`, and join nested keys with `__`:

```sh
RICOCHET_URL=https://ricochet.example.com
RICOCHET_AUTH__OIDC__CLIENT_SECRET=secret-value
RICOCHET_DATABASE__URL=postgres://ricochet:secret@db.example.com:5432/ricochet
RICOCHET_NETWORK__PROXY_PORT=8080
```

Keep credentials in environment variables or a secret store, out of the file.

## Address and storage

```toml
url = "https://ricochet.example.com"
home = "/var/lib/ricochet/data"
```

- `url` is the public address users open, which Ricochet otherwise learns from the first request it serves.
- `home` is the directory that stores the SQLite database, deployed bundles, logs, and encryption keys.
- `home` defaults to the working directory, or `/var/lib/ricochet/data` for the packaged service, so always give an absolute path.

## Ports

```toml
[network]
proxy_port = 6188
api_port = 3000
metrics = "127.0.0.1:6189"
```

| Key | Meaning |
| --- | --- |
| `proxy_port` | The port users and the reverse proxy connect to, on every interface |
| `api_port` | An internal port on `127.0.0.1` only. Change it only if `3000` is taken. |
| `metrics` | The full address of the Prometheus endpoint. A bare port fails at startup. |

## Database

Without a `[database]` section, Ricochet uses a SQLite file in `home`, created on first start.
Use Postgres when more than one Ricochet replica runs or the database must outlive the machine:

```toml
[database]
url = "postgres://ricochet:secret@db.example.com:5432/ricochet"
```

Point it at an empty database whose role can create tables.
Ricochet creates and upgrades the schema itself.
Behind a connection pool in transaction mode, such as PgBouncer, set `direct_url` to a direct connection, and use PgBouncer 1.21 or newer with `max_prepared_statements` on.

Two Ricochet processes can share one SQLite file only on the same machine.

### Move from SQLite to Postgres

1. Stop Ricochet.
2. Create an empty Postgres database and a role that owns it.
3. Copy the data:

   ```sh
   ricochet db copy \
     --from sqlite:///var/lib/ricochet/data/ricochet.sqlite3 \
     --to postgres://ricochet:secret@db.example.com:5432/ricochet
   ```

4. Add `[database] url` to the config and start Ricochet.

Keep the same `home` and encryption keys, because only they can read the stored environment variables and Git credentials.
Users sign in again, and the SQLite file stays as a backup.
The copy also works from Postgres to a new SQLite file.

## Encryption keys

Ricochet encrypts environment variables and Git credentials with a keypair it creates in `home` on first start, in `.ricochet.json` and `.ricochet.pub`.
Back up `.ricochet.json`, because nothing else can read the encrypted values.
Set `secrets` to read the keypair from another directory, such as a mounted secret shared by several replicas:

```toml
secrets = "/etc/ricochet/secrets"
```

Never run `ricochet secrets-init` for a server that already has data, because a new keypair cannot read the old values.
A server that already stores encrypted values will not start without its keypair, and never creates a new one in its place.

## Deployment history

```toml
[retention]
max_deployments = 10
max_age_days = 90
max_bundle_size = "100mb"
```

- A cleanup runs daily at 05:00 UTC and removes old bundles past either limit.
- The latest successful deployment is always kept.
- `max_deployments` defaults to `5`, and `max_age_days` has no default.
- An item's own `[retention]` can only make these stricter.
- `max_bundle_size` is the largest bundle a deploy can upload, server-wide only, and defaults to `"100mb"`.

## Package installs

```toml
[restore]
timeout = 3600
concurrency = 4

[resources]
default_memory_limit = "4Gi"
```

- `restore.timeout` is the seconds allowed for installing an item's packages.
- `restore.concurrency` is how many deployments install packages at once on this server, with a default based on the machine's memory.
- `resources.default_memory_limit` applies to items that set no memory limit of their own.
- On a host install without `default_memory_limit`, an item may use up to half the machine's memory.

## Task time limit

```toml
[tasks]
max_duration = 21600
```

Ricochet stops a task run after `max_duration` seconds, `3600` by default, and marks it cancelled.
The limit covers scheduled and manual runs on every backend, and a task's own `[schedule] max_duration` replaces it.

## Email

Ricochet emails editors when it cannot deploy or run their item, and can email everyone who can open a task after a successful run.
It sends nothing until `[smtp]` names a mail server:

```toml
[smtp]
host = "smtp.example.com"
username = "ricochet"
password = "..."
from = "ricochet <ricochet@example.com>"
```

| Key | Meaning |
| --- | --- |
| `host` | The mail server's hostname or IP address, with no scheme or port |
| `port` | Defaults to `587` with `starttls`, `465` with `tls`, and `25` with `none` |
| `tls` | `"starttls"` (default), `"tls"`, or `"none"` for a relay on a trusted network |
| `username`, `password` | The account Ricochet signs in with, when the mail server needs one |
| `from` | The sender on every email |
| `reply_to` | Where replies go. Defaults to `from`. |

- Set the password with `RICOCHET_SMTP__PASSWORD` to keep it out of the file.
- To check the settings, restart Ricochet, open **Server Settings**, then **Email**, and select **Send me a test**. The email goes to your own address, and if the mail server refuses it, the page shows the reason.
- Ricochet retries a failed email four more times over half an hour.
- Without `[smtp]`, the web UI hides every email setting.
- Users choose which email they get in their profile and in each item's settings.

## Package repositories

```toml
[repositories]
allow_overrides = true
r = { CRAN = "https://cran.rpkgs.com", INTERNAL = "https://cran.internal.example.com" }
python = ["https://pypi.internal.example.com/simple", "https://pypi.org/simple"]
```

| Server `[repositories]` | `allow_overrides` | Result |
| --- | --- | --- |
| Not set | | Each lockfile's own repositories, and items may set their own |
| Set | `true`, the default | Server and item repositories merged, and the item wins on a name conflict |
| Set | `false` | Server repositories for every item, and item settings ignored |

R repository names are uppercase letters and underscores.
Python indexes are searched in order.
Ricochet has no setting for extra Julia package sources.

## License

Add a license with `[license]`, as the `ricochet-licensing` skill describes.

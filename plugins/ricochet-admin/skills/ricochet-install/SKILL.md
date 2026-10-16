---
name: ricochet-install
description: Use for questions about installing, upgrading, or uninstalling a self-hosted Ricochet server, such as installing on Ubuntu, Debian, RHEL, macOS, or Windows, running it in Docker or Docker Compose, deploying it to Kubernetes with Helm, putting it behind Nginx, Caddy, HAProxy, or Traefik for HTTPS, or installing R, Python, and Julia on the server.
---

# Install Ricochet

Ricochet runs as one server process that serves the web UI, the API, and deployed content on port `6188`.
Choose the install method by where it will run, then read its reference:

| Where | Method | Reference |
| --- | --- | --- |
| One Linux server | `.deb` or `.rpm` package with a systemd service | [references/host.md](references/host.md) |
| One server with Docker | The `ricochet-server` image | [references/container.md](references/container.md) |
| A Kubernetes cluster | The Helm chart | [references/kubernetes.md](references/kubernetes.md) |
| A Mac or Windows machine | The standalone binary | [references/host.md](references/host.md) |

Prefer the `.deb` or `.rpm` package for a single Linux server, because it includes the service, the AppArmor profile, and the language tools.
Use Kubernetes when content must run across several machines.
Managed hosting is also available at [cloud.ricochet.rs](https://cloud.ricochet.rs) for users who would rather not run a server.

## Every install needs

1. **Sign-in**: register Ricochet with an OIDC or Security Assertion Markup Language (SAML) identity provider, as the `ricochet-sign-in` skill describes, or nobody can sign in.
2. **The public URL**: set `url` in `ricochet-config.toml` to the address users open, such as `url = "https://ricochet.example.com"`.
3. **HTTPS**: Ricochet does not terminate TLS, so put a reverse proxy in front of it, as [references/reverse-proxy.md](references/reverse-proxy.md) shows, or use the Kubernetes ingress.
4. **Persistent storage**: for the Ricochet data directory, `home`, which stores the database, deployed bundles, and encryption keys.

The first person to sign in becomes an Admin.
Have the person who will run the server sign in first.

## Check the install

```sh
curl -fsS http://127.0.0.1:6188/health
curl -fsS http://127.0.0.1:6188/ready
```

`/health` answers while the process runs, and `/ready` answers once the database is reachable, which suits load balancer and Kubernetes probes.
Then open the public URL, sign in, and deploy a test app with the `ricochet` CLI.

## Languages on the server

Container and Kubernetes installs run content in images that already include R, Python, or Julia.
A host install runs content with the interpreters installed on that machine:

```sh
# R, any number of versions side by side
rig add 4.5

# Python
uv python install 3.12

# Julia, which must be installed with juliaup
juliaup add 1.11
```

Ricochet matches each deployment to the closest installed version of the one its lockfile requests.
Install every version your users' lockfiles need.
Packages that compile from source need system libraries, listed in [references/host.md](references/host.md).

## Upgrade

| Method | Upgrade |
| --- | --- |
| `.deb` or `.rpm` | Install the new package over the old one, then `sudo systemctl restart ricochet-server` |
| Container | Pull the new version tag and recreate the container with the same volume |
| Kubernetes | `helm upgrade` with the same values file |

Ricochet migrates its database on start.
Back up the `home` directory, or the database and home volume, before upgrading.

## After installing

Use the `ricochet-server-config` skill for `ricochet-config.toml`, the `ricochet-execution` skill for where content runs, the `ricochet-monitoring` skill for logs and metrics, and the `ricochet-licensing` skill to add a license.

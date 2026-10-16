---
name: ricochet-server-troubleshooting
description: Use when a self-hosted Ricochet server misbehaves, such as the server not starting, users unable to sign in or stuck in a redirect loop, groups missing after sign-in, every deployment failing while installing packages, apps disconnecting behind a reverse proxy, memory limits not applied, or metrics not reachable.
---

# Troubleshoot the server

Start with the server's own logs: `journalctl -u ricochet-server` for the packaged service, `docker logs ricochet-server` for a container, or `kubectl logs deployment/ricochet` on Kubernetes.
Then check `/health` and `/ready` on port `6188`.

## The server does not start

| Log or symptom | Fix |
| --- | --- |
| It refuses to start because the encryption keypair is missing | The server stores encrypted values and cannot find `.ricochet.json`. Restore it from backup, or point `secrets` at where it is. Never generate a new one. |
| A config parse error | Check the TOML syntax and key names in `ricochet-config.toml` and in any `RICOCHET_` environment variables. |
| It cannot reach the identity provider | Check `issuer_url` and that the server can reach the provider over HTTPS. For Entra, use the v2.0 issuer. |
| An error about `metrics` | Use a full address such as `127.0.0.1:6189`, not a bare port. |
| The data seems to vanish after a restart | `home` is relative or the volume is not persistent. Use an absolute `home` on persistent storage. |

## Users cannot sign in

| Symptom | Fix |
| --- | --- |
| The provider reports a redirect URI mismatch | Register exactly `https://<your Ricochet address>/oauth/callback`, and use the same value for `redirect_url`. |
| Sign-in loops back, or links point at `http://` | Set `url` to the public HTTPS address, and have the reverse proxy send `X-Forwarded-Proto`. |
| The provider rejects the request over PKCE | Turn on PKCE with `S256` in the provider's client settings. |
| A user cannot sign in at all | They may be locked. Run `ricochet user --config <path> list` and `unlock` them. |
| Names show as IDs or blank | Set `display_name_claim` to a claim the provider sends, such as `name` or `email`. |

## Groups are missing

- Set `groups_claim` or `groups_attribute`, and make the provider include groups in the token.
- Users see group changes when they next sign in.
- Group names in Ricochet must match the provider's values exactly, including case.
- Entra sends group IDs, and omits all groups for users in more than about 200.
- With Entra, set `provider = "entra"` and grant `Group.Read.All` to resolve group names.

## Every deployment fails while installing packages

| Cause | Fix |
| --- | --- |
| Rootless containers are not allowed on a host install | Run `sudo ricochet check-security` and fix what it reports, which is usually subordinate IDs or AppArmor. |
| AppArmor blocks user namespaces on Ubuntu 23.10 and newer | Run `sudo ricochet setup-apparmor`, or for a container load the profile from the `ricochet-install` skill. |
| The interpreter is missing | Install the R, Python, or Julia version the lockfile asks for, or add an image that includes it. |
| A system library is missing | Install the library on the host, or add it to the execution environment image. |
| Installs time out | Raise `[restore] timeout`, or the item's own `restore_timeout`. |
| A package repository is unreachable | Check the server can reach the repositories in `[repositories]` and in the lockfiles. |

## Apps behind the reverse proxy

| Symptom | Fix |
| --- | --- |
| Shiny or Streamlit apps disconnect or never load | Forward WebSocket upgrades in the reverse proxy. |
| Apps disconnect after a fixed time | Raise the reverse proxy's read timeout, and the app's `inactive_timeout` if needed. |
| Uploads fail with a size error | Raise `[retention] max_bundle_size` for deploys, and the reverse proxy's body size limit. |

## Limits and metrics

| Symptom | Fix |
| --- | --- |
| The log says `per-item memory limits are not enforced` | Run the container with `--user 0`, as the `ricochet-install` skill describes. |
| Items use too much memory by default | Set `[resources] default_memory_limit`. |
| Prometheus cannot reach `/metrics` | Set `metrics = "0.0.0.0:6189"` and open the port to the Prometheus host only. |

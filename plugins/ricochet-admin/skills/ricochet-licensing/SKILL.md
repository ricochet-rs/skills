---
name: ricochet-licensing
description: Use for questions about Ricochet editions, pricing, and licenses, such as what the free Community Edition includes and limits, how to buy or renew an Enterprise license, adding a license key to a self-hosted server, licensing an offline or air-gapped server, or why private apps, more developers, or the audit log are unavailable.
---

# License a server

Ricochet runs as the free Community Edition until a license is added.
An Enterprise license removes the Community Edition limits on one server.

## Community Edition

Free for personal use and small teams.
It includes deploying apps and tasks, sign-in with your identity provider, scheduling, and the CLI.
It limits:

- **Access**: public content only, because private content needs a license.
- **Developers**: 2 users with the Admin or Developer role, and any number of Consumers.
- **Audit log**: not available.
- **Git deployments**: 3 items deployed from Git.
- **Connectivity**: the server checks its license online, so it needs internet access.

## Buy a license

See plans at [ricochet.rs/pricing](https://ricochet.rs/pricing).
Purchases go through Paddle, which handles invoices and tax in your currency.

Manage licenses, usage, and renewals at [licensing.ricochet.rs](https://licensing.ricochet.rs), where an account is created after purchase.
Email contact@ricochet.rs with licensing questions.

## Add the license

```toml
[license]
key = "your-license-key"
```

Restart Ricochet after adding it.
Prefer the environment variable `RICOCHET_LICENSE__KEY` for the key.

An offline or air-gapped server uses a license file instead of a key:

```toml
[license]
file = "/etc/ricochet/license"
```

A relative path resolves under `home`.

## Managed hosting

[Ricochet Cloud](https://cloud.ricochet.rs) runs the server for you, with a free 14-day trial and billing by usage, so it needs no license.

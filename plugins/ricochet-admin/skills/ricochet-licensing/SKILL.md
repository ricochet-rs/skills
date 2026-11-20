---
name: ricochet-licensing
description: Use for questions about Ricochet editions, pricing, and licenses, such as what the free Community Edition includes and limits, how to buy or renew an Enterprise license, adding a license key to a self-hosted server, licensing an offline or air-gapped server, or why private apps, more developers, or the audit log are unavailable.
---

# License a server

Ricochet runs as the free Community Edition until a license is added.
An Enterprise license removes the Community Edition limits on one server.

## Community Edition

The Community Edition is free for personal use and small teams.
It includes deploying apps and tasks, sign-in through your identity provider, scheduling, and the CLI, with these limits:

- Content must be public. Private content needs a license.
- At most 2 users can have the Admin or Developer role. Consumers are unlimited.
- The audit log is not available.
- At most 3 items can be deployed from Git.
- The server checks its license online, so it needs internet access.

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
Set the key with the environment variable `RICOCHET_LICENSE__KEY` to keep it out of the file.

An offline or air-gapped server uses a license file instead of a key:

```toml
[license]
file = "/etc/ricochet/license"
```

A relative path resolves under `home`.

## When the license expires

For the last six weeks before the license expires, admins see a renewal reminder above every page.

If the license expires, is suspended, or fails validation, the server switches to the Community Edition at once.
Enterprise features stop, the Community Edition limits apply, and every signed-in user sees a notice they cannot dismiss.

The same happens when the license fails validation at startup.
Ricochet starts as the Community Edition, checks the license every hour, and applies it once it validates.

## Managed hosting

[Ricochet Cloud](https://cloud.ricochet.rs) runs the server for you, with a free 14-day trial and billing by usage, so it needs no license.

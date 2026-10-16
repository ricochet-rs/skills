---
name: ricochet-sign-in
description: Use for questions about how users sign in to a self-hosted Ricochet server and what they can do, such as setting up SSO with OIDC or SAML, connecting Microsoft Entra ID, Okta, Auth0, Keycloak, or Google, syncing groups, requiring sign-in for every page, setting the default role for new users, making someone an admin, or locking and deleting users.
---

# Configure sign-in and users

Ricochet signs users in through your identity provider with OIDC or Security Assertion Markup Language (SAML), and never stores passwords.
Configure exactly one of `[auth.oidc]` or `[auth.saml]` in `ricochet-config.toml`, then restart Ricochet.
A server with neither lets nobody sign in.

## OIDC

```toml
[auth.oidc]
issuer_url = "https://idp.example.com/"
client_id = "your-client-id"
client_secret = "your-client-secret"
redirect_url = "https://ricochet.example.com/oauth/callback"
```

Register Ricochet with the provider as a web application:

- **Redirect URI**: `https://<your Ricochet address>/oauth/callback`, the exact path the CLI's browser sign-in needs.
- **Grant type**: authorization code with PKCE using `S256`, which Ricochet always sends.
- **Scopes**: `openid`, `email`, and `profile`.

| Key | Required | Meaning |
| --- | --- | --- |
| `issuer_url` | Yes | The provider's issuer, starting with `https://` |
| `client_id` | Yes | The client ID from the provider |
| `client_secret` | No | Leave it out to register Ricochet as a public client. Entra group sync needs it. |
| `redirect_url` | No | Defaults to `url` plus `/oauth/callback` when `url` is set |
| `display_name_claim` | No | Claim used as the user's name. Default `preferred_username`. |
| `groups_claim` | No | Claim that lists the user's groups. Leave it out to skip group sync. |
| `provider` | No | `"entra"` for Microsoft Entra ID, otherwise leave it out |
| `sync_interval` | No | Minutes between background group syncs. Entra only. |

Ricochet identifies each user by the token's `sub` claim.
Read [references/providers.md](references/providers.md) for Microsoft Entra ID, Auth0, Okta, Keycloak, and Google.

## SAML

```toml
[auth.saml]
entity_id = "https://ricochet.example.com/saml/metadata"
acs_url = "https://ricochet.example.com/saml/acs"
idp_metadata_xml = """
<EntityDescriptor ...>...</EntityDescriptor>
"""
email_attribute = "email"
display_name_attribute = "displayName"
groups_attribute = "groups"
```

- `acs_url` must be HTTPS and end in `/saml/acs`.
- `idp_metadata_xml` is the provider's metadata XML itself, up to 32 KiB, pasted in rather than linked.
- Give the provider Ricochet's metadata from `https://<your Ricochet address>/saml/metadata`.
- The three `*_attribute` keys name the assertion attributes that hold each value.

## Groups

With `groups_claim` or `groups_attribute` set, Ricochet reads the user's groups at every sign-in.
Content owners can then share an item with a group in its collaborators dialog.

- A user sees group changes at their next sign-in, unless Entra background sync is on.
- The group name typed in Ricochet must match the provider's value exactly, including case.
- Some providers send group IDs rather than names, so check one user's token before sharing with a group.

## Require sign-in everywhere

By default, visitors who are not signed in can browse the Explore page and open public content.

```toml
[auth]
require_authentication = true
```

This sends every visitor to the sign-in page first.

## Roles

| Role | Can |
| --- | --- |
| Admin | Everything, including managing users and every item |
| Developer | Deploy content and manage their own items |
| Consumer | Open content shared with them |

New users get the Developer role unless `default_role` says otherwise:

```toml
[auth]
default_role = "consumer"
```

The first person to sign in becomes an Admin.
Admins change roles on the **Users** page, or from the server:

```sh
ricochet user --config /var/lib/ricochet/ricochet-config.toml list
ricochet user --config /var/lib/ricochet/ricochet-config.toml set-role <USER_ID> admin
ricochet user --config /var/lib/ricochet/ricochet-config.toml lock <USER_ID>
ricochet user --config /var/lib/ricochet/ricochet-config.toml unlock <USER_ID>
ricochet user --config /var/lib/ricochet/ricochet-config.toml delete <USER_ID>
```

Put `--config` before the subcommand.

- `user list` takes `--role` to filter and `--format csv` or `--format json`.
- A locked user cannot sign in, deploy, or use their API keys.
- `user delete` refuses a user who owns items, unless `--content delete` removes their items too.

Roles are managed in Ricochet, not read from the identity provider.

## Other settings

```toml
[auth]
allow_avatar_upload = false
```

Stops users uploading their own profile pictures.
Ricochet sets only the cookies it needs for sign-in, sessions, sending each user to the same app instance, and the theme setting.

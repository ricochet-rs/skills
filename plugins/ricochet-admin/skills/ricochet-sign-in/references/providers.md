# Identity provider setup

Every provider needs the redirect URI `https://<your Ricochet address>/oauth/callback`, the authorization code flow, PKCE with `S256`, and the `openid`, `email`, and `profile` scopes.

## Microsoft Entra

```toml
[auth.oidc]
provider = "entra"
issuer_url = "https://login.microsoftonline.com/<tenant-id>/v2.0"
client_id = "your-client-id"
client_secret = "your-client-secret"
redirect_url = "https://ricochet.example.com/oauth/callback"
```

- Use the v2.0 issuer, because the v1 issuer, `https://sts.windows.net/<tenant-id>/`, does not work.
- At every sign-in, Ricochet reads the user's groups, including nested groups, and their photo from Microsoft Graph with the user's own token.
- Leave `groups_claim` out. Setting it makes Ricochet read the token's claim instead, which holds group IDs and drops every group for users in more than about 200.
- Ricochet needs only the delegated `User.Read` permission, which every new app registration already lists. If the tenant blocks user consent, an administrator grants consent for it once.
- `Group.Read.All`, `User.Read.All`, or `Directory.Read.All` granted for an earlier Ricochet version can be removed.
- The collaborators dialog lists a group by name once one of its members has signed in.
- A missing photo never blocks sign-in.

## Auth0

Create a **Regular Web Application**, add the redirect URI to **Allowed Callback URLs**, and copy the domain, client ID, and secret.

```toml
[auth.oidc]
issuer_url = "https://<tenant>.auth0.com/"
client_id = "your-client-id"
client_secret = "your-client-secret"
redirect_url = "https://ricochet.example.com/oauth/callback"
display_name_claim = "name"
groups_claim = "https://ricochet.example.com/groups"
```

Auth0 sends no `preferred_username` for most connections, so set `display_name_claim` to `name` or `email`.
Auth0 sends no groups either.
Add a post-login Action that copies the user's roles into a claim, and set `groups_claim` to its full name:

```js
exports.onExecutePostLogin = async (event, api) => {
  api.idToken.setCustomClaim("https://ricochet.example.com/groups", event.authorization?.roles ?? []);
};
```

## Okta

Create an **OIDC Web Application** with the authorization code grant and the redirect URI.
Use `https://<your-domain>.okta.com/oauth2/default` as `issuer_url` for the default authorization server.
To send groups, add a `groups` claim to the ID token in the authorization server with a filter that matches the groups to include, and set `groups_claim = "groups"`.

## Keycloak

Create an OpenID Connect client with client authentication on, the standard flow, and the redirect URI.
Use `https://<keycloak-host>/realms/<realm>` as `issuer_url`.
To send groups, add a **Group Membership** mapper to the client's dedicated scope with the claim name `groups`, turn **Full group path** off for plain names, and set `groups_claim = "groups"`.

## Google

Create an OAuth client of type **Web application** in Google Cloud with the redirect URI.
Use `https://accounts.google.com` as `issuer_url`, and set `display_name_claim = "name"`.
Google sends no groups, so share content with users rather than groups.

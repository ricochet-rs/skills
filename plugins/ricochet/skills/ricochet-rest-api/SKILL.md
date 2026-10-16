---
name: ricochet-rest-api
description: Use when calling the Ricochet REST API from code or curl, including finding an endpoint in the API docs, creating an API key, running a task and waiting for it to finish, reading deployments and their logs, changing a schedule or settings, and listing content, from R, Python, Julia, shell, or CI.
---

# Call Ricochet from code

Everything the CLI does goes through the Ricochet API, so code can do it too.
Prefer the `ricochet` CLI when a shell is available, because it handles authentication, encryption, and polling.

Use the API from code that runs without the CLI: another app, a scheduled job, a webhook receiver, or a CI step.

## Read the API docs first

Before calling an endpoint, read the API reference on the server the code targets:

```text
https://<server>/api/docs
```

It lists every endpoint, request body, response, status code, and required scope for that server's version, and needs no sign-in.
The page embeds the full OpenAPI specification in its HTML, so fetching it gives the complete reference.

When no server is known yet, use [try.ricochet.rs/api/docs](https://try.ricochet.rs/api/docs).
Another server can run a different version, so check its own docs before relying on an endpoint.

Never guess a path, field, or request body.
If the docs do not list it, the server does not support it.

This skill covers what the reference does not make obvious: how to authenticate, which scope a job needs, and the patterns that take several calls.

## Authenticate

Send an API key in the `Authorization` header with the `Key` scheme, not `Bearer`:

```sh
curl https://ricochet.example.com/api/v0/check_key -H "Authorization: Key $RICOCHET_API_KEY"
```

Create a key on the server's **Credentials** page at `https://<server>/credentials`.
Each key has scopes that limit what it can do:

| Scope | Grants |
| --- | --- |
| `content.read` | Listing content, reading deployments, logs, and run status |
| `content.invoke` | Running and stopping tasks |
| `content.publish` | Deploying |
| `content.settings` | Changing settings, schedules, and environment variables |
| `content.delete` | Deleting content |

Give a key only the scopes its job needs, and an expiry.
A key acts as the user who created it, so it can only reach content that user can reach.

Keys made by `ricochet login` expire after 8 hours and are not suitable for automation.
Store the key as an environment variable or a CI secret, never in code.

`GET /api/v0/check_key` returns the key's scopes, which is a quick way to test a key.

## Run a task and wait for it

```sh
curl -X POST "$RICOCHET_SERVER/api/v0/content/$ID/invoke" -H "Authorization: Key $RICOCHET_API_KEY"
```

The request takes no body and returns the run's ID at once:

```json
{"id": "01J...", "content_id": "01H..."}
```

Poll the run until `status` is no longer `pending`:

```sh
curl "$RICOCHET_SERVER/api/v0/content/$ID/invocations/$RUN_ID" -H "Authorization: Key $RICOCHET_API_KEY"
```

`status` is `pending` while queued or running, then `success`, `failure`, or `cancelled`.
`started` and `ended` are Unix seconds, and each is absent until the run starts or ends.

Poll every few seconds, not in a tight loop.
A run cannot take parameters.

R with httr2:

```r
library(httr2)

ricochet <- function(path) {
  request(Sys.getenv("RICOCHET_SERVER")) |>
    req_url_path(path) |>
    req_headers(Authorization = paste("Key", Sys.getenv("RICOCHET_API_KEY")))
}

run <- ricochet(sprintf("/api/v0/content/%s/invoke", id)) |>
  req_method("POST") |>
  req_perform() |>
  resp_body_json()

repeat {
  status <- ricochet(sprintf("/api/v0/content/%s/invocations/%s", id, run$id)) |>
    req_perform() |>
    resp_body_json()
  if (status$status != "pending") break
  Sys.sleep(5)
}
```

Python with `httpx`:

```python
import os, time
import httpx

client = httpx.Client(
    base_url=os.environ["RICOCHET_SERVER"],
    headers={"Authorization": f"Key {os.environ['RICOCHET_API_KEY']}"},
)

run = client.post(f"/api/v0/content/{item_id}/invoke").raise_for_status().json()
while (status := client.get(f"/api/v0/content/{item_id}/invocations/{run['id']}").json())["status"] == "pending":
    time.sleep(5)
```

Julia with HTTP.jl and JSON3:

```julia
using HTTP, JSON3

server = ENV["RICOCHET_SERVER"]
headers = ["Authorization" => "Key $(ENV["RICOCHET_API_KEY"])"]

run = JSON3.read(HTTP.post("$server/api/v0/content/$id/invoke", headers).body)

status = "pending"
while status == "pending"
    sleep(5)
    status = JSON3.read(HTTP.get("$server/api/v0/content/$id/invocations/$(run.id)", headers).body).status
end
```

## Read a deployment's install log

List the deployment's logs, then stream one:

```sh
curl "$RICOCHET_SERVER/api/v0/content/deployments/$DEPLOYMENT_ID/logs" -H "Authorization: Key $RICOCHET_API_KEY"
curl -N "$RICOCHET_SERVER/api/v0/content/logs/$LOG_ID" -H "Authorization: Key $RICOCHET_API_KEY"
```

The first returns `{"log_ids": [...]}`, with one log for each architecture the install runs on.
The second returns plain text.
While the install is still running, it stays open and sends each new line, then closes when the install ends.

A deployment that never started has no logs and returns `410`.

## Common endpoints

A map for orientation.
Check the API docs for request bodies, responses, and anything not listed here.

| Method and path | Does | Scope |
| --- | --- | --- |
| `GET /api/v0/user/items` | Lists content the key's user can access | `content.read` |
| `GET /api/v0/content/{id}/toml` | Returns the item's settings as `_ricochet.toml` | `content.read` |
| `GET /api/v0/content/{id}/deployments` | Lists deployments | `content.read` |
| `GET /api/v0/content/{id}/instances` | Lists running app instances | `content.read` |
| `POST /api/v0/content/{id}/invoke` | Starts a run | `content.invoke` |
| `POST /api/v0/content/{id}/invocations/{run_id}/stop` | Stops a run | `content.invoke` |
| `PATCH /api/v0/content/{id}/schedule` | Sets a task's cron schedule | `content.settings` |
| `PATCH /api/v0/content/{id}/settings` | Changes settings | `content.settings` |
| `DELETE /api/v0/content/{id}` | Deletes the item | `content.delete` |

## Environment variables

Setting environment variables through the API requires encrypting each name and value with the server's public key first.
Use `ricochet app env-vars set` or `ricochet task env-vars set` instead, which encrypt for you.

When code must do it, follow the encryption steps on the Environment Variables page of the Ricochet docs.

## Errors

| Status | Meaning |
| --- | --- |
| `401` | Missing, malformed, expired, or deleted key |
| `403` | The key lacks the scope, its user has no access to the item, or no item has that ID on this server |

The error body is JSON with an `error` message.
Other status codes are listed per endpoint in the API docs.

---
name: ricochet-automation
description: Use for questions about triggering an R, Python, or Julia script, a Quarto or R Markdown report, or a Jupyter notebook to run on demand or in response to an event, such as running it now, from code, from CI, from a webhook or GitHub push, or after another job finishes, including `ricochet task invoke`, the invoke API, webhook receivers in FastAPI, Plumber, or HTTP.jl, and redeploying from CI.
---

# Trigger Ricochet from other systems

A task runs when someone presses **Run now**, on a cron schedule, or when code calls the invoke endpoint.
Everything here builds on that endpoint, described in the `ricochet-rest-api` skill.

For time-based runs, use the `ricochet-scheduling` skill instead.

Every pattern needs an API key stored as a secret, never in code.
Create one on the server's **Credentials** page with only the scopes the job needs: `content.invoke` to run tasks, `content.publish` to deploy.

## Receive a webhook

Services such as GitHub, Stripe, and Slack send webhooks they sign with a shared secret, and they cannot add Ricochet's `Authorization: Key` header.
So deploy a small receiver app on Ricochet that checks the signature and then starts the task:

1. Write a FastAPI, Plumber, or HTTP.jl app with one `POST` route.
2. Deploy it with `access_type = "external"`, so the sender can reach it without signing in.
3. Store the webhook secret and an API key with the `content.invoke` scope on the receiver: `ricochet app env-vars set WEBHOOK_SECRET=... RICOCHET_API_KEY=...`.
4. Give the sender the receiver's URL, `https://<server>/app/<slug>/webhook`.

The receiver must reject any request whose signature does not match, because anyone can reach an external app.
Answer quickly and let the task do the work, because most senders time out after a few seconds.

FastAPI receiver for GitHub:

```python
import hashlib, hmac, os
import httpx
from fastapi import FastAPI, HTTPException, Request

content_id = os.environ.get("RICOCHET_CONTENT_ID")
app = FastAPI(root_path=f"/app/{content_id}" if content_id else "")
TASK_ID = "01H..."  # the task to run


@app.post("/webhook")
async def webhook(request: Request):
    body = await request.body()
    expected = "sha256=" + hmac.new(os.environ["WEBHOOK_SECRET"].encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("X-Hub-Signature-256", "")):
        raise HTTPException(status_code=401)

    run = httpx.post(
        f"{os.environ['RICOCHET_URL']}/api/v0/content/{TASK_ID}/invoke",
        headers={"Authorization": f"Key {os.environ['RICOCHET_API_KEY']}"},
    ).raise_for_status().json()
    return {"run_id": run["id"]}
```

Ricochet sets `RICOCHET_URL` in every app, so the receiver needs no server address of its own.

Plumber receiver for GitHub:

```r
#* @post /webhook
function(req, res) {
  sig <- openssl::sha256(req$postBody, key = Sys.getenv("WEBHOOK_SECRET"))
  if (!identical(paste0("sha256=", sig), req$HTTP_X_HUB_SIGNATURE_256)) {
    res$status <- 401
    return(list(error = "bad signature"))
  }
  httr2::request(Sys.getenv("RICOCHET_URL")) |>
    httr2::req_url_path(sprintf("/api/v0/content/%s/invoke", "01H...")) |>
    httr2::req_headers(Authorization = paste("Key", Sys.getenv("RICOCHET_API_KEY"))) |>
    httr2::req_method("POST") |>
    httr2::req_perform() |>
    httr2::resp_body_json()
}
```

Julia receiver for GitHub, deployed as `julia-service`:

```julia
using HTTP, SHA

const TASK_ID = "01H..."

function handle(req::HTTP.Request)
    (req.method == "POST" && req.target == "/webhook") || return HTTP.Response(404)
    sig = "sha256=" * bytes2hex(hmac_sha256(Vector{UInt8}(ENV["WEBHOOK_SECRET"]), req.body))
    HTTP.header(req, "X-Hub-Signature-256", "") == sig || return HTTP.Response(401)

    run = HTTP.post(
        "$(ENV["RICOCHET_URL"])/api/v0/content/$TASK_ID/invoke",
        ["Authorization" => "Key $(ENV["RICOCHET_API_KEY"])"],
    )
    HTTP.Response(200, ["Content-Type" => "application/json"], run.body)
end

HTTP.serve(handle, "0.0.0.0", parse(Int, ENV["PORT"]))
```

Each sender documents its own signature header and algorithm, so check them before adapting the example.
For a sender that cannot sign, put a long random token in the URL and compare it with `hmac.compare_digest`.

## Run or redeploy from a build pipeline

The CLI reads the server and key from the environment, so a CI step needs no login:

```yaml
# GitHub Actions
- name: Refresh the report
  env:
    RICOCHET_SERVER: https://ricochet.example.com
    RICOCHET_API_KEY: ${{ secrets.RICOCHET_API_KEY }}
  run: |
    curl -fsSL https://raw.githubusercontent.com/ricochet-rs/cli/main/install.sh | sh
    ~/.local/bin/ricochet task invoke 01H... --wait
```

`--wait` exits non-zero when the run fails, which fails the CI job.

To redeploy on every push, run `ricochet deploy . --follow` in the same way, with a key that has `content.publish`.
The committed `_ricochet.toml` must include the item's `id`, or each run creates a new item.

## Chain tasks

To run task B after task A succeeds, end task A's script with a call that invokes task B.
Store an API key with the `content.invoke` scope on task A as an environment variable.

A failed script stops before the last line, so B runs only after A succeeds.

## Run only when something changed

Schedule a light task that checks a condition, such as a new file in a bucket or a changed row count.
It invokes the heavy task only when it finds one.

Keep what it last saw in `persistent/` so the next run can compare.

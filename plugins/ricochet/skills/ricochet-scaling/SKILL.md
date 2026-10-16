---
name: ricochet-scaling
description: Use for questions about scaling a deployed app to handle more users, such as setting the minimum and maximum number of instances, keeping an app warm to avoid slow first loads, how many connections one instance takes, when a new instance starts, or why a Shiny app disconnects after a while, for Shiny, Plumber, FastAPI, Flask, Dash, Streamlit, Shiny for Python, Genie, and other apps.
---

# Scale an app

Ricochet runs each app as one or more instances and starts more as connections grow.
The `[serve]` table in `_ricochet.toml` controls this.

It applies to apps only, and declaring it on a task fails the deploy.
For CPU and memory, use the `ricochet-resources` skill.

## Instance counts

```toml
[serve]
min_instances = 0
max_instances = 5
max_connections = 10
spawn_threshold = 80
```

All four keys are required once the table exists.

| Key | Meaning |
| --- | --- |
| `min_instances` | Instances always kept running. `0` stops every instance when the app is idle. |
| `max_instances` | The most instances that run at once. |
| `max_connections` | Connections one instance takes. |
| `spawn_threshold` | Percentage of `max_connections` at which a new instance starts. |

With these values, a new instance starts once an instance has 8 connections, up to 5 instances.
Once `max_instances` are running, new connections go to the instance with the fewest.

A Shiny or Genie app counts one connection per open browser session.
Other apps count one per request in progress.

## Choose values

| Situation | Settings |
| --- | --- |
| The first visit after a quiet period is slow | `min_instances = 1` keeps one instance running, so nobody waits for a cold start. |
| A Shiny app does heavy work per session | Lower `max_connections`, such as `3` to `5`, so sessions spread across instances sooner. |
| A light API answers quickly | Raise `max_connections`, such as `50`, because each request holds a connection only briefly. |
| Traffic comes in bursts | Lower `spawn_threshold`, such as `50`, so new instances start before existing ones fill up. |
| The app holds state in memory per instance | Keep `max_instances = 1`, or move the state to a database under `persistent/`. |

Every running instance uses memory, so raise `min_instances` and `max_instances` only as far as the traffic needs.

## Connections that drop or linger

These optional keys take seconds:

| Key | Meaning |
| --- | --- |
| `inactive_timeout` | How long a connection may sit idle before it is closed. Raise it when a Shiny app disconnects while users read the page. |
| `max_connection_age` | How long an instance may live. Unset, an instance ends when its last connection closes. |
| `connection_timeout` | How long Ricochet waits to reach an instance. Raise it for an app that is slow to accept connections. |

```toml
[serve]
min_instances = 1
max_instances = 3
max_connections = 5
spawn_threshold = 80
inactive_timeout = 3600
```

## Apply changes

Ricochet reads `[serve]` on the first deploy.
After that, edit the table and run `ricochet app settings update`, or change the values on the app's scaling page in the web UI.

Run `ricochet app instances` to see how many instances are running and how many connections each holds.

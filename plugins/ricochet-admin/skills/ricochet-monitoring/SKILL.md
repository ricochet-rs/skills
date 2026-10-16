---
name: ricochet-monitoring
description: Use for questions about monitoring a self-hosted Ricochet server, such as scraping Prometheus metrics, building Grafana dashboards, sending OpenTelemetry traces to Jaeger or another OTLP collector, configuring server log files and rotation, health and readiness checks, or reading, retaining, and exporting the audit log.
---

# Monitor the server

## Health checks

```sh
curl -fsS http://127.0.0.1:6188/health
curl -fsS http://127.0.0.1:6188/ready
```

`/health` answers while the process runs.
`/ready` answers once the database responds, so use it for readiness probes and load balancer checks.
Neither needs a sign-in.

## Prometheus metrics

Metrics are served at `/metrics` on `127.0.0.1:6189`, apart from user traffic.
To scrape from another machine, listen on every interface:

```toml
[network]
metrics = "0.0.0.0:6189"
```

```yaml
scrape_configs:
  - job_name: ricochet
    static_configs:
      - targets: ["ricochet.internal:6189"]
```

Keep the port off the public network, because metric labels include content IDs.

| Metric | Type | Labels | Meaning |
| --- | --- | --- | --- |
| `ricochet_requests_total` | Counter | `type`, `content_id`, `status`, `method` | Requests served |
| `ricochet_request_duration_seconds` | Histogram | `type`, `content_id` | Time to serve a request, not counting WebSockets |
| `ricochet_connections_total` | Counter | `type`, `content_id` | Connections opened |
| `ricochet_connections` | Gauge | `type`, `content_id` | Connections open now |
| `ricochet_invocations_started_total` | Counter | `content_id` | Task runs started |
| `ricochet_invocations_completed_total` | Counter | `content_id`, `status` | Task runs finished |
| `ricochet_invocation_duration_seconds` | Histogram | `content_id` | Task run duration |
| `ricochet_last_invocation_timestamp_seconds` | Gauge | `content_id` | Unix time of the latest run |
| `ricochet_app_instances_started_total` | Counter | `content_id` | App instances started |
| `ricochet_app_instances_stopped_total` | Counter | `content_id` | App instances stopped |
| `ricochet_active_processes` | Gauge | `type`, `content_id` | Processes running now |
| `ricochet_memory_bytes` | Gauge | `type`, `content_id` | Memory in use |
| `ricochet_peak_memory_bytes` | Gauge | `type`, `content_id` | Highest memory seen |
| `ricochet_cpu_cores` | Gauge | `type`, `content_id` | CPU in use, in cores |
| `ricochet_longest_active_seconds` | Gauge | `type`, `content_id` | Age of the oldest running process |
| `ricochet_build_info` | Gauge | `version`, `commit` | Always `1`. The labels name the running version. |

Useful queries:

```promql
# Requests per second by item
sum by (content_id) (rate(ricochet_requests_total[5m]))

# Share of task runs that failed in the last day
sum(increase(ricochet_invocations_completed_total{status="failure"}[1d]))
  / sum(increase(ricochet_invocations_completed_total[1d]))

# 95th percentile request time by item
histogram_quantile(0.95, sum by (le, content_id) (rate(ricochet_request_duration_seconds_bucket[5m])))
```

## Traces

Ricochet sends traces over the OpenTelemetry Protocol (OTLP) to any OpenTelemetry collector, as the service `ricochet-server`:

```toml
[otel]
endpoint = "http://otel-collector:4317"
```

To try it locally with Jaeger, run the Jaeger container with ports `4317` and `16686`, set `endpoint = "http://localhost:4317"`, and open `http://localhost:16686`.

## Server logs

Ricochet writes its own logs to stdout.
Host and container installs also write log files to `logs/` under `home`, which rotate daily and are compressed.
Kubernetes installs log to stdout only, for the cluster to collect.

```toml
[logs]
level = "info"
file_logging = true
rotation = "daily"
compress = true
max_files = 30
max_age_days = 30
```

| Key | Values |
| --- | --- |
| `level` | `trace`, `debug`, `info` (default), `warn`, or `error` |
| `file_logging` | Write files to `logs/` |
| `rotation` | `hourly`, `daily` (default), or `never` |
| `compress` | Compress rotated files. Default `true`. |
| `max_files`, `max_age_days` | Delete rotated files past either limit. No limit by default. |

Logs of deployed apps and task runs are separate and appear on each item's pages in the web UI.

## Audit log

Ricochet records every security and administrative action: sign-ins, role and access changes, API keys, deployments, task runs, environment variable and schedule changes, and instance starts.
It cannot be turned off.
Admins read it on the **Audit Log** page and download it there as CSV or JSON.

```toml
[audit]
retention_days = 365
file_logging = false
```

- Records are kept 365 days by default, or forever with `retention_days = "forever"`.
- `file_logging = true` also writes them as JSON lines to `logs/audit/`, rotated daily.
- Each record names the actor, the event, and whether an admin acted without a role on the item.

Reading and exporting the audit log needs an Enterprise license.

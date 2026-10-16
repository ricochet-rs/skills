---
name: ricochet-resources
description: Use for questions about how much CPU or memory a deployed app, script, report, or notebook gets, such as an app or task running out of memory, giving a script more CPU, setting memory or CPU limits and requests, or a package install that times out during a deploy, for R, Python, and Julia apps and tasks.
---

# Set processor and memory limits

The `[resources]` table in `_ricochet.toml` sets the CPU and memory an item gets.
It applies to apps and tasks alike.

Unset keys fall back to the server's defaults, so set only what the item needs.

```toml
[resources]
cpu_request = "500m"
cpu_limit = "2"
memory_request = "512Mi"
memory_limit = "2Gi"
```

| Key | Meaning |
| --- | --- |
| `cpu_request` | CPU reserved for the item |
| `cpu_limit` | The most CPU the item may use. Work slows down at the limit. |
| `memory_request` | Memory reserved for the item |
| `memory_limit` | The most memory the item may use. A process that goes over is stopped. |
| `restore_timeout` | Seconds allowed for installing packages during a deploy. The default is `1800`, and `0` removes the limit. |

CPU takes thousandths of a core, such as `"500m"` for half a core, or whole cores, such as `"2"`.
Memory takes a `Ki`, `Mi`, or `Gi` suffix, such as `"512Mi"` or `"4Gi"`.

Both are strings, so keep the quotes.

For an app, the values apply to each instance.
An app with `memory_limit = "2Gi"` and 3 running instances can use up to 6 GiB in total.

## Choose values

| Symptom | Change |
| --- | --- |
| The app or task stops and its log reports it ran out of memory | Raise `memory_limit` past the peak the code needs. Load less data at once if the peak keeps growing. |
| A task takes much longer on Ricochet than locally | Raise `cpu_limit`, especially for code that runs in parallel. |
| An app is slow under load | Add instances with the `ricochet-scaling` skill before raising `cpu_limit`. |
| A deploy fails while packages are still installing | Raise `restore_timeout`, for example to `3600`, for projects that compile many packages from source. |

Measure first where possible.
The **Processes** page in the web UI shows each running instance and task with its memory, peak memory, and CPU.

## Apply changes

Ricochet reads `[resources]` on the first deploy.
After that, edit the table and run `ricochet app settings update` or `ricochet task settings update`.

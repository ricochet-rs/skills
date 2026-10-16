---
name: ricochet-scheduling
description: Use for any question about how to schedule a Python, R, or Julia script, set up a cron job, or make a script, Quarto or R Markdown report, or Jupyter notebook run automatically, such as nightly, every weekday morning, hourly, or monthly, by deploying it to Ricochet as a scheduled task, including writing the cron expression, converting local times to UTC, and changing or removing the schedule later.
---

# Schedule a task

Any task can run on a cron schedule: an `r`, `python`, or `julia` script, an `rmd` or Quarto render, or a Jupyter notebook.
Apps cannot be scheduled, and a `[schedule]` table on an app fails the deploy.

## Schedules run in UTC

Every schedule runs in UTC, and there is no time zone setting.
Convert the user's local time before writing the expression, and say which UTC time you chose.

`0 9 * * 1-5` runs at 09:00 UTC, which is 05:00 in New York during daylight saving time and 04:00 outside it.
A schedule cannot follow local daylight saving time exactly.

Choose the UTC time that suits the user best, and tell them it shifts by an hour twice a year.

## Schedule it on the first deploy

Declare it in `_ricochet.toml` before the first `ricochet deploy`:

```toml
[schedule]
cron = "0 6 * * *"
```

Ricochet reads `[schedule]` only when it creates the item.
Editing it later and redeploying does not change the schedule.

## Change the schedule after the first deploy

Use any one of these:

```sh
ricochet task schedule <ID> "30 6 * * 1-5"
ricochet task settings update
```

`ricochet task schedule` checks the expression locally and prints the next run time in UTC.
`ricochet task settings update` applies the `[schedule]` from the local `_ricochet.toml`, so update the file first.

After changing it with `ricochet task schedule`, also update `[schedule]` in the local file so it matches the server.

From code, `PATCH /api/v0/content/<ID>/schedule` with `{"schedule": "30 6 * * 1-5"}` does the same, as described in the `ricochet-rest-api` skill.

To remove a schedule, open the task in the web UI and remove it on the schedule page.

## Cron syntax

Five fields, or six with a leading seconds field:

```text
┌ minute (0-59)
│ ┌ hour (0-23)
│ │ ┌ day of month (1-31)
│ │ │ ┌ month (1-12 or JAN-DEC)
│ │ │ │ ┌ day of week (0-6, Sunday is 0 or 7, or SUN-SAT)
* * * * *
```

| Expression | Runs |
| --- | --- |
| `0 6 * * *` | Every day at 06:00 UTC |
| `0 9 * * 1-5` | Weekdays at 09:00 UTC |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 1 * *` | Midnight on the first of each month |
| `0 0 L * *` | Midnight on the last day of each month |
| `0 0 * * FRI#2` | Midnight on the second Friday of each month |
| `@daily`, `@hourly`, `@weekly`, `@monthly` | Shorthands |

## Patterns

- **A report that refreshes itself**: add `[static]` to a scheduled R Markdown, Quarto, or Jupyter task, and each run republishes the HTML at the same URL.
- **A script that accumulates data**: write results under `persistent/`, which survives redeploys, and append to a SQLite database rather than a shared text file.
- **Credentials for the job**: set them with `ricochet task env-vars set`, never in the script.

## Things to know

- A run cannot take parameters.
- A script that needs settings reads them from environment variables or a file in the bundle.
- Stopping a run does not remove its schedule.
- Run the task once with `ricochet task invoke <ID> --wait` to check it succeeds before relying on the schedule.

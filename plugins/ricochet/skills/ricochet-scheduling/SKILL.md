---
name: ricochet-scheduling
description: Use for any question about how to schedule a Python, R, or Julia script, set up a cron job, or make a script, Quarto or R Markdown report, or Jupyter notebook run automatically, such as nightly, every weekday morning, hourly, or monthly, by deploying it to Ricochet as a scheduled task, including writing the cron expression, converting local times to UTC, changing or removing the schedule later, and emailing the result or attached files after each run.
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

```sh
ricochet task schedule <ID> "30 6 * * 1-5"
```

`ricochet task schedule` checks the expression locally and prints the next run time in UTC.
`ricochet task settings update` does not send `[schedule]`, so editing the file and running it leaves the schedule unchanged.

After changing it, also update `[schedule]` in the local file so it matches the server.
The task's overview page in the web UI shows the next run time, which confirms the new schedule.

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

## Email the result

Ricochet can email people after a run once the server admin has set up a mail server.
Without one, the web UI shows no email settings, so ask the admin.

- Every new task emails its owners and editors when a run fails, with the end of the log.
- A task set to send success email also emails everyone who can open it, with a subject, a Markdown message, and files from the run's output attached, up to 20 MiB in total.

Set it on the task's **Settings**, then **Email** tab, or from code with `PUT /api/v0/content/<ID>/email` and a key with `content.settings`:

```json
{
  "preference": "all",
  "subject": "{name} for {date}",
  "body": "This week's report is attached.",
  "attachments": ["report.pdf", "data/*.csv"]
}
```

- `preference` is `failure` (the default), `success`, `all`, or `none`.
- `{name}` and `{date}` in the subject become the task's name and the run's date.
- `attachments` are paths or glob patterns inside the run's output, where `**` matches across folders. Hidden files are never attached.
- The `PUT` replaces every field, so read the current settings with `GET` on the same path first.
- Editors choose which email each collaborator gets on the item's **Collaborators** tab, and users can turn their own email down in their profile.

## Things to know

- A run cannot take parameters.
- A script that needs settings reads them from environment variables or a file in the bundle.
- Stopping a run does not remove its schedule.
- Run the task once with `ricochet task invoke <ID> --wait` to check it succeeds before relying on the schedule.

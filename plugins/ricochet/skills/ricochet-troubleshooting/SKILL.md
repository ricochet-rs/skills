---
name: ricochet-troubleshooting
description: Use for questions about why a deployed Shiny app, API, report, notebook, or R, Python, or Julia script fails to deploy, start, or run, such as a failed or out-of-sync deployment, package install errors, an app stuck loading or never binding its port, missing styles or broken links, data lost after a redeploy, a failing task run, a different R or Python version, or finding the logs that explain it.
---

# Troubleshoot Ricochet content

Find out which stage failed before changing anything: the deploy, the app starting, or the code running.
For CLI error messages, see the error table in the `ricochet-cli` skill.

## Read the logs

| Stage | Where |
| --- | --- |
| Package install during a deploy | `ricochet deploy --follow` streams it. For an earlier deployment, open its page in the web UI. |
| App startup and runtime output | The app's **Logs** page in the web UI |
| A task run's output | The run on the task's page in the web UI |

`ricochet app deployment list <ID>` and `ricochet task deployment list <ID>` show each deployment's status.
Logs show times in the time zone set on the user's profile page, while cron schedules always use UTC.

## The deploy fails

A deployment ends in one of these states:

- **Success**: packages installed and match the lockfile.
- **Out of sync**: packages installed, but the restore reported differences from the lockfile, or the lockfile no longer matches the code.
- **Failure**: the install stopped, most often from a network error, a missing system library, or a package that cannot be found.

Common causes:

| Symptom | Fix |
| --- | --- |
| Out of sync in R | Run `renv::status()` locally, fix what it reports with `renv::snapshot()`, and redeploy. A different R version on the server alone is not a problem. |
| A package is not found | The repository holding it is missing. Add it to `[repositories]`, as the `ricochet-package-repos` skill describes, or snapshot it from a repository the server can reach. |
| A package fails to compile | It needs a system library the server lacks. Ask the Ricochet admin to install it, or use a binary repository. |
| Python install fails | Check that `uv.lock` and `.python-version` are committed, that `uv lock --check` passes locally, and that the pinned version fits `requires-python`. |
| Needs a different R, Python, or Julia version | The version comes from the lockfile (`renv.lock`, `.python-version`, or `Manifest.toml`), matched to the versions installed on the server. Change it locally, update the lockfile, and redeploy. |
| Julia install fails | Run `Pkg.instantiate()` locally and commit the updated `Manifest.toml`. |
| `403` on redeploy | The `content.id` in `_ricochet.toml` belongs to another server, or the user cannot edit the item. |

## The app does not start

An app that never opens its port is retried 5 times, then marked failed, and the visitor sees an error page.

- Apps that run as scripts must listen on `PORT` and `0.0.0.0`, as the `ricochet-apps` skill lists.
- Code that stops with an error before the server starts looks the same, so read the app's logs for the error.
- A missing environment variable is a common cause, so list names with `ricochet app env-vars get`.
- With `min_instances = 0`, the first request after an idle period waits for a cold start, and `min_instances = 1` keeps one instance warm.

## The app starts but pages break

- Missing styles, scripts, or images, or links that open the Ricochet dashboard, mean a path starts with `/`.
- Make such paths relative, or use the base path, as the `ricochet-apps` skill describes.
- Data written inside the bundle disappears after a redeploy, so write it to `persistent/`.
- On an external item, visitors who are not signed in have no user, as the `ricochet-user-auth` skill describes.

## A task run fails

- Run it again with `ricochet task invoke <ID> --wait` and read its output on the task's page.
- A run that works locally but fails on Ricochet usually depends on a file that was not deployed, a local path, or a variable set only locally.
- Check what was bundled with `ricochet deploy --dry-run`.
- A scheduled run that seems to happen at the wrong time is running in UTC, as the `ricochet-scheduling` skill explains.

## Settings seem ignored

`_ricochet.toml` edits reach the server only through `ricochet app settings update` or `ricochet task settings update`, and `[schedule]` is read only on the first deploy.
Compare the local file with the server using `ricochet app settings` or `ricochet app toml <ID>`, as the `ricochet-cli` skill describes.

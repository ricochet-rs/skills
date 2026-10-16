# Ricochet Skills

Agent skills that deploy and run your R, Julia, and Python work on [ricochet](https://ricochet.rs), for Claude Code and Codex.

Use natural langauge to connect to a `ricochet` server, deploy an application, trigger a script via REST API, and more.

## Install

In Claude Code:

```bash
/plugin marketplace add ricochet-rs/skills
/plugin install ricochet@ricochet-rs
/plugin install ricochet-admin@ricochet-rs
```

In Codex:

```bash
codex plugin marketplace add ricochet-rs/skills
```

Then install **Ricochet** or **Ricochet Admin** from the Codex plugins directory.

## Plugins

| Plugin           | Persona                        | Skills                                                                                              |
| ---------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `ricochet`       | Data scientists and developers | Deploying apps, reports, notebooks, and scripts, then running, scheduling, scaling, and fixing them |
| `ricochet-admin` | Server administrators          | Installing, configuring, securing, and monitoring a self-hosted Ricochet server                     |

Use `ricochet` if you are a user of a ricochet server and `ricochet-admin` if you want to install or maintain a ricochet server.

## Create an instance

You need a ricochet instance to deploy to:

- [Ricochet Cloud](https://cloud.ricochet.rs) can host one for you, with a free 14-day trial.
- To host your own, the `ricochet-admin` plugin walks you through it, or follow [docs.ricochet.rs](https://docs.ricochet.rs).
- A self-hosted server runs as the free Community Edition until you add a license from [ricochet.rs/pricing](https://ricochet.rs/pricing).

## What you can ask

**Deploy and run**

- "Deploy this Shiny app to Ricochet."
- "Schedule this Python script to run every weekday at 9 AM."
- "Run my Jupyter notebook whenever we push to GitHub."
- "Why did my last deployment fail?"

**Build for Ricochet**

- "Show the signed-in user's name in this app."
- "Keep my DuckDB database across deployments."
- "My app is slow to load the first time."
- "Give this task 8 GB of memory."

**Run a server**

- "Install Ricochet on this Ubuntu server behind Nginx."
- "Connect Ricochet to Microsoft Entra ID."
- "Move Ricochet from SQLite to Postgres."
- "Scrape Ricochet with Prometheus."

## Skills

### `ricochet`

| Skill                      | Use it to                                                                     |
| -------------------------- | ----------------------------------------------------------------------------- |
| `ricochet-cli`             | Install the CLI, sign in, write `_ricochet.toml`, deploy, and manage content  |
| `ricochet-apps`            | Choose the content type and make an app, report, or script work once deployed |
| `ricochet-user-auth`       | Identify the signed-in user and restrict access by group or role              |
| `ricochet-scheduling`      | Run scripts, reports, and notebooks on a schedule                             |
| `ricochet-automation`      | Run tasks from webhooks, CI, or other tasks                                   |
| `ricochet-rest-api`        | Call Ricochet from code with an API key                                       |
| `ricochet-scaling`         | Set instance counts and connection limits for apps                            |
| `ricochet-resources`       | Set CPU and memory for apps and tasks                                         |
| `ricochet-package-repos`   | Choose where R and Python packages install from                               |
| `ricochet-troubleshooting` | Find out why a deployment, app, or task failed                                |

### `ricochet-admin`

| Skill                             | Use it to                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `ricochet-install`                | Install and upgrade on Linux, macOS, Windows, Docker, or Kubernetes, behind a reverse proxy |
| `ricochet-sign-in`                | Set up OIDC or SAML sign-in, groups, roles, and users                                       |
| `ricochet-server-config`          | Configure `ricochet-config.toml`, Postgres, encryption keys, and retention                  |
| `ricochet-execution`              | Run content on the host, in containers, or on Kubernetes                                    |
| `ricochet-monitoring`             | Set up metrics, traces, logs, and the audit log                                             |
| `ricochet-licensing`              | Compare editions and add a license                                                          |
| `ricochet-server-troubleshooting` | Fix startup, sign-in, and deployment problems                                               |

## Repository layout

```text
.claude-plugin/marketplace.json     Claude Code marketplace
.agents/plugins/marketplace.json    Codex marketplace
plugins/
├── ricochet/
│   ├── plugin.json                 Codex manifest
│   ├── .claude-plugin/plugin.json  Claude Code manifest
│   ├── skills/
│   └── evals/
└── ricochet-admin/
    ├── plugin.json
    ├── .claude-plugin/plugin.json
    ├── skills/
    └── evals/
```

Each skill is a folder with a `SKILL.md`, optional `references/`, and `agents/openai.yaml` for Codex.

---

## Support

Ask questions in [GitHub Discussions](https://github.com/orgs/ricochet-rs/discussions), on [Discord](https://discord.gg/ctWt3du7aw), or on [Matrix](https://matrix.ricochet.rs), or email contact@ricochet.rs.

---

## Development

Validate the Claude Code manifests:

```sh
claude plugin validate .
claude plugin validate plugins/ricochet
claude plugin validate plugins/ricochet-admin
```

Check that each skill loads for the prompts it should answer:

```sh
claude plugin eval plugins/ricochet
claude plugin eval plugins/ricochet-admin
```

When a CLI command, flag, or error message changes, update `ricochet-cli` in the same release.
Bump `version` in both manifests of a plugin when its skills change.

---

## Agent discovery package

`discovery/` is `@ricochet-rs/agent-discovery`, an Astro integration that docs.ricochet.rs and ricochet.rs both install with `bun add github:ricochet-rs/skills`.
On every build it publishes the same agent files on both sites:

- `robots.txt` with Content Signals and named AI crawlers
- a markdown twin of every page, `llms.txt`, and `llms-full.txt`
- `/.well-known/agent-skills/`, with every skill in this repository downloaded fresh from `main`
- `/.well-known/api-catalog`, `/openapi.json`, and `/.well-known/ai-catalog.json`

Each eval prompt becomes an example query for the skill its grader loads, so a new eval also improves `ai-catalog.json`.
Change the shared crawler list, Content Signals, and link relations in `discovery/policy.ts` and `discovery/artifacts.ts`.

```sh
bun install
bun test discovery
bunx tsc --noEmit
```

## License

[MIT](LICENSE)

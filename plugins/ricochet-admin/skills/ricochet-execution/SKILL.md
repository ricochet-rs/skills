---
name: ricochet-execution
description: Use for questions about where a self-hosted Ricochet server runs apps and tasks, such as choosing between running content on the host, in Docker or Podman containers, or as Kubernetes pods, defining execution environment images with specific R, Python, or Julia versions and system libraries, setting a default image, or running more than one Ricochet replica.
---

# Choose where content runs

Ricochet runs every app and task in an isolated environment, chosen by the `[backend]` section of `ricochet-config.toml`:

| Setting | Content runs | Use when |
| --- | --- | --- |
| No `[backend]` | In a rootless container on the same machine, with the machine's own R, Python, and Julia | One server that has the interpreters installed. This is the default. |
| `engine = "container"` | As a Docker or Podman container on the same machine | Each app and task should be a container visible to `docker ps` and container tooling |
| `engine = "k8s"` | As Kubernetes pods, a Deployment per app and a Job per task run | Content must spread across several machines |

The Helm chart sets up the Kubernetes option itself, as the `ricochet-install` skill describes.

## Execution environments

The container and Kubernetes options run content in images listed in an execution environment file.
Each entry names an image and the interpreter versions inside it:

```toml
[image.r-default]
image = "docker.io/ricochetrs/r-alpine:4.5"
os = "alpine-3.23"
arch = ["linux/amd64", "linux/arm64"]
description = "R 4.5 on Alpine"
r = [{ version = "4.5.3", bin = "/usr/bin/R" }]

[image.python-default]
image = "docker.io/ricochetrs/python-ubuntu:3.13"
os = "ubuntu-26.04"
arch = ["linux/amd64", "linux/arm64"]
description = "Python 3.13 on Ubuntu"
python = [{ version = "3.13", bin = "/usr/local/bin/python3" }]
```

- `r`, `python`, and `julia` list each interpreter's version and path, and Ricochet matches each item's lockfile to them.
- An item names an image with `exec_env` in its `_ricochet.toml`, and otherwise gets `default_image`.
- An `exec_env` value that matches no entry is used as a full image reference.
- The `ricochet-rs/exec-envs` images on GitHub are rebuilt weekly and suit most servers.
- Build your own images from them to add system libraries or other versions.

## Containers on the same machine

```toml
[backend]
engine = "container"
exec_env_config_path = "ricochet-exec-env.toml"
default_image = "r-default"
content_path = "/var/lib/ricochet/data/content"
cache_path = "/var/lib/ricochet/data/.cache"
```

| Key | Required | Meaning |
| --- | --- | --- |
| `exec_env_config_path` | Yes | The execution environment file, absolute or relative to `home` |
| `content_path` | Yes | Directory of deployed bundles, mounted into every container |
| `cache_path` | Yes | Directory of package caches, mounted into every container |
| `default_image` | No | Image name used when an item sets no `exec_env` |
| `proxy_host` | No | Host name Ricochet uses to reach content containers. Defaults to `localhost`. |

The account that runs Ricochet needs access to the daemon's socket, usually through the `docker` group.
Ricochet talks only to a daemon on its own machine.
When Ricochet itself runs in a container, set `proxy_host` to `host.docker.internal` or the host's bridge address, or run it with `--network host`.

## Kubernetes

```toml
[backend]
engine = "k8s"
namespace = "ricochet"
exec_env_config_path = "/etc/ricochet/exec-env.toml"
default_image = "r-default"
pvc_content_name = "ricochet-content"
pvc_cache_name = "ricochet-cache"
image_pull_policy = "IfNotPresent"
```

| Key | Meaning |
| --- | --- |
| `namespace` | Namespace for app and task pods |
| `pvc_content_name`, `pvc_cache_name` | Persistent volume claims for bundles and package caches |
| `image_pull_policy` | `Always`, `IfNotPresent`, or `Never` |
| `instance_name` | A stable name that keeps several Ricochet servers in one namespace apart |
| `allow_custom_deployment_config` | Lets content owners extend their app's Deployment specification. Off by default. |
| `leader_election` | `"lease"` when more than one Ricochet replica runs |
| `restore_priority_class_name`, `validation_priority_class_name` | Priority classes for package install jobs and image checks |

## More than one replica

Running several Ricochet replicas needs:

- Postgres instead of SQLite, as the `ricochet-server-config` skill describes.
- One shared encryption keypair, through `secrets`.
- On Kubernetes, `leader_election = "lease"` with a Role that grants `coordination.k8s.io` leases, so one replica runs the scheduler and cleanup jobs.

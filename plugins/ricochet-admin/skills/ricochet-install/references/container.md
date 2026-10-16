# Run in a container

The image is `reg.ricochet.rs/ricochet/ricochet-server`, in Ubuntu (`-ubuntu`) and Alpine (`-alpine`) variants.
Each release has full, minor, and major tags, such as `1.4.2-ubuntu`, `1.4-ubuntu`, and `1-ubuntu`.
There is no `latest` tag, so pin a full version in production.

This runs Ricochet itself in a container.
To run Ricochet on the host and each app in its own container, use the container option in the `ricochet-execution` skill instead.

## Docker

```sh
VERSION=$(curl -s https://ricochet.rs/releases.json | grep -o '"latest": *"[^"]*"' | grep -o 'v[0-9.]*')
docker volume create ricochet-data
docker run -d \
  --name ricochet-server \
  --user 0 \
  -p 6188:6188 \
  -v ricochet-data:/var/lib/ricochet/data \
  -v $(pwd)/ricochet-config.toml:/var/lib/ricochet/data/ricochet-config.toml \
  --cap-drop=ALL \
  --cap-add=SYS_ADMIN --cap-add=SETUID --cap-add=SETGID --cap-add=DAC_OVERRIDE \
  --security-opt seccomp=unconfined \
  --security-opt systempaths=unconfined \
  reg.ricochet.rs/ricochet/ricochet-server:${VERSION#v}-ubuntu
```

## Docker Compose

```yaml
services:
  ricochet-server:
    image: reg.ricochet.rs/ricochet/ricochet-server:<version>-ubuntu
    user: "0"
    ports:
      - "6188:6188"
    cap_drop: [ALL]
    cap_add: [SYS_ADMIN, SETUID, SETGID, DAC_OVERRIDE]
    security_opt:
      - seccomp=unconfined
      - systempaths=unconfined
    volumes:
      - ricochet-data:/var/lib/ricochet/data
      - ./ricochet-config.toml:/var/lib/ricochet/data/ricochet-config.toml
    restart: unless-stopped

volumes:
  ricochet-data:
```

## Why these options

Ricochet runs each app and task in its own rootless container, which needs more than Docker grants by default.

| Option | Reason |
| --- | --- |
| `--cap-drop=ALL` | Drops every default capability before adding back only these |
| `SYS_ADMIN`, `SETUID`, `SETGID`, `DAC_OVERRIDE` | Create user namespaces and set mount ownership for content containers |
| `seccomp=unconfined`, `systempaths=unconfined` | Permit the namespace and `/proc` mounts content containers need |
| `--user 0` | Lets Ricochet enforce each item's memory limit. Ricochet still runs as its own non-root user. |

`--privileged` also works but gives the container full access to the host, so avoid it.
Without `--user 0`, items run without a memory limit and the server logs `per-item memory limits are not enforced`.
Cap the whole container with `--memory` in that case.

## Storage

Mount a named volume at `/var/lib/ricochet/data`.
It stores the database, bundles, encryption keys, logs, and package caches.
Docker fills an empty named volume from the image, which copies in the bundled `uv` and `juliaup`.
To use a host directory instead, copy the image's data into it first:

```sh
docker create --name ricochet-init reg.ricochet.rs/ricochet/ricochet-server:${VERSION#v}-ubuntu
docker cp ricochet-init:/var/lib/ricochet/data/. /srv/ricochet/
docker rm ricochet-init
```

## AppArmor on Ubuntu 23.10 and newer

When deploys fail while installing packages on an AppArmor host, test with `--security-opt apparmor=unconfined`.
If that fixes it, save this profile as `/etc/apparmor.d/ricochet`, load it, and pass `--security-opt apparmor=ricochet`:

```text
abi <abi/4.0>,
include <tunables/global>

profile ricochet /usr/bin/ricochet flags=(unconfined) {
  userns,
  include if exists <local/ricochet>
}
```

```sh
sudo apparmor_parser -r /etc/apparmor.d/ricochet
```

## Not supported

Deploying content does not work on OpenShift.

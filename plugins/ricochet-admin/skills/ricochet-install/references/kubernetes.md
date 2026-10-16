# Install on Kubernetes

The Helm chart runs the Ricochet server and gives it permission to start apps and tasks in its namespace.
Each app runs as a Deployment and each task run as a Job.

## Prerequisites

- Kubernetes 1.27 or newer, amd64, arm64, or both
- Helm 3.8 or newer
- An OIDC client for the public URL
- A `ReadWriteOnce` storage class for the server's home volume
- A `ReadWriteMany` storage class for content and package caches, on clusters with more than one node
- An ingress controller and certificate issuer, or another gateway that terminates TLS

## Install

```sh
kubectl create namespace ricochet
kubectl --namespace ricochet create secret generic ricochet-oidc \
  --from-literal=RICOCHET_AUTH__OIDC__CLIENT_ID='your-client-id' \
  --from-literal=RICOCHET_AUTH__OIDC__CLIENT_SECRET='your-client-secret'
```

Save `values.yaml`:

```yaml
envFrom:
  - secretRef:
      name: ricochet-oidc

config:
  "auth.oidc":
    issuer_url: "https://idp.example.com/"
    redirect_url: "https://ricochet.example.com/oauth/callback"

persistence:
  home:
    enabled: true
    size: 25Gi

apps:
  deployment:
    persistence:
      content:
        enabled: true
        storageClass: "rwx-storage"
        accessMode: ReadWriteMany
        size: 20Gi
      cache:
        enabled: true
        storageClass: "rwx-storage"
        accessMode: ReadWriteMany
        size: 20Gi

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: ricochet.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: ricochet-tls
      hosts:
        - ricochet.example.com

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    memory: 2Gi
```

```sh
helm install ricochet oci://ghcr.io/ricochet-rs/ricochet-helm --namespace ricochet --values values.yaml
kubectl --namespace ricochet rollout status deployment/ricochet
```

Replace the host names, ingress class, issuer, and storage class with the cluster's own.
The chart turns persistence off by default, so an install without these values loses everything on restart.

Each key under `config` becomes a section of `ricochet-config.toml`, so `config.retention.max_deployments: 10` sets `[retention] max_deployments = 10`.
Keys under `config.backend` go into `[backend]`.

## Volumes

| Volume | Mount path | Access | Contents |
| --- | --- | --- | --- |
| Home | `/var/lib/ricochet/data` | `ReadWriteOnce` | Database, keys, config, logs |
| Content | `/var/lib/ricochet/data/content` | `ReadWriteMany` | Deployed bundles, shared with app and task pods |
| Cache | `/var/lib/ricochet/data/.cache` | `ReadWriteMany` | R, Python, and Julia package caches |

Back up home and content together.
The cache can be recreated, at the cost of reinstalling packages on the next deploys.
Use Postgres instead of the default SQLite file once more than one replica runs, as the `ricochet-server-config` skill describes.

## Encryption keys

Ricochet encrypts environment variables and Git credentials with a keypair it creates on first start.
Store the keypair in a Secret so every replica uses the same one:

```sh
keydir=$(mktemp -d)
ricochet secrets-init --dir "$keydir"
kubectl --namespace ricochet create secret generic ricochet-keys \
  --from-file=.ricochet.json="$keydir/.ricochet.json"
rm -rf "$keydir"
```

```yaml
extraVolumes:
  - name: ricochet-keys
    secret:
      secretName: ricochet-keys
extraVolumeMounts:
  - name: ricochet-keys
    mountPath: /etc/ricochet/secrets
    readOnly: true
env:
  - name: RICOCHET_SECRETS
    value: /etc/ricochet/secrets
```

Never run `ricochet secrets-init` for a server that already has data.
A new keypair cannot read the environment variables and Git credentials encrypted with the old one.
To move an existing server's keys into a Secret, copy its own `.ricochet.json` from the home volume.

## Mixed amd64 and arm64 nodes

Let Ricochet list nodes so it installs packages for every architecture:

```yaml
rbac:
  clusterRole:
    enabled: true
```

Leave it off on a single-architecture cluster.

## Custom pod settings per app

Content owners can extend an app's Deployment specification only when an admin turns it on, because arbitrary pod settings can weaken cluster security:

```yaml
config:
  backend:
    allow_custom_deployment_config: true
```

Turn it on only when content owners are trusted.

## Upgrade

The chart version differs from the Ricochet version, so check `appVersion` first:

```sh
helm show chart oci://ghcr.io/ricochet-rs/ricochet-helm
helm upgrade ricochet oci://ghcr.io/ricochet-rs/ricochet-helm --namespace ricochet --values values.yaml
```

Back up the home and content volumes before upgrading.

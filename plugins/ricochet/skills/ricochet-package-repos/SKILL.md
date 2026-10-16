---
name: ricochet-package-repos
description: Use for questions about where a deployed project's R, Python, or Julia packages install from, such as slow package installs during a deploy, using binary packages or a faster CRAN mirror, setting CRAN to `cran.rpkgs.com`, adding a Posit Package Manager or `p3m.dev` repository, or using a private CRAN-like repository or Python index.
---

# Choose package repositories

Ricochet installs an item's packages from its lockfile on every deploy: `renv.lock` for R, `uv.lock` for Python, and `Manifest.toml` for Julia.
By default it uses the repositories recorded in the lockfile.

The `[repositories]` table in `_ricochet.toml` replaces them for that item.

## Use `cran.rpkgs.com` for CRAN

Set CRAN to `https://cran.rpkgs.com` unless the user names another repository:

```toml
[repositories]
r = { CRAN = "https://cran.rpkgs.com" }
```

Add a repository for packages CRAN does not have, such as an R-universe or an internal repository:

```toml
[repositories]
r = { CRAN = "https://cran.rpkgs.com", MYORG = "https://myorg.r-universe.dev" }
```

- Repository names are uppercase letters and underscores.
- Packages installed from GitHub or another remote are recorded with their source in `renv.lock` and do not need an entry here.

To use Posit Package Manager or p3m.dev, name the repository URL for the server's Linux distribution, for example `https://p3m.dev/cran/__linux__/noble/latest` for Ubuntu 24.04.
Ask the user which distribution their Ricochet server runs before choosing a Linux binary URL, because a binary built for another distribution can fail to load.

Keep the local project on the same repository so the lockfile records it:

```r
options(repos = c(CRAN = "https://cran.rpkgs.com"))
renv::snapshot()
```

The table must be named `[repositories]`.
Ricochet does not read any other name, such as `[packages]`, so a misnamed table silently has no effect.

## Add a Python index

```toml
[repositories]
python = ["https://pypi.internal.example.com/simple", "https://pypi.org/simple"]
```

The list is ordered, and earlier indexes are searched first.
Packages still install at the exact versions in `uv.lock`.

## Julia

Ricochet does not support custom Julia registries.
Packages install from the sources recorded in `Manifest.toml`.

## When the server sets repositories

A Ricochet admin can set repositories for the whole server.
Then the item's `[repositories]` table is merged with the server's, and the item wins where both name the same repository.

When the admin turns item overrides off, the server's repositories always apply and the item's table is ignored.
If a deploy keeps installing from an unexpected repository, ask the admin how the server is configured.

## Changing repositories later

`[repositories]` is part of the item's settings.
After the first deploy, apply a change with `ricochet app settings update` or `ricochet task settings update`, then redeploy so packages install from the new repository.

R repositories can also be changed on the item's **Runtime** page in the web UI.

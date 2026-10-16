# Install on a host

## Supported platforms

| System | Architecture | Format |
| --- | --- | --- |
| Debian, Ubuntu | amd64, arm64 | `.deb` |
| RHEL, AlmaLinux | x86_64, aarch64 | `.rpm` |
| Other Linux | x86_64, aarch64 | `.tar.gz` standalone binary |
| macOS | Apple Silicon | `.tar.gz` standalone binary |
| Windows | x86_64, arm64 | `.zip` standalone binary |

## Debian and Ubuntu

```sh
VERSION=$(curl -s https://ricochet.rs/releases.json | grep -o '"latest": *"[^"]*"' | grep -o 'v[0-9.]*')
ARCH=$(dpkg --print-architecture)
curl -fLO https://s3.eu-central-003.backblazeb2.com/ricochet-server/${VERSION#v}/ricochet-server_${VERSION#v}-1_${ARCH}.deb
sudo apt install ./ricochet-server_${VERSION#v}-1_${ARCH}.deb
```

## RHEL and AlmaLinux

```sh
VERSION=$(curl -s https://ricochet.rs/releases.json | grep -o '"latest": *"[^"]*"' | grep -o 'v[0-9.]*')
ARCH=$(uname -m)
curl -fLO https://s3.eu-central-003.backblazeb2.com/ricochet-server/${VERSION#v}/ricochet-server-${VERSION#v}-1.el10.${ARCH}.rpm
sudo dnf install ./ricochet-server-${VERSION#v}-1.el10.${ARCH}.rpm
```

Use `dnf install` for upgrades and downgrades too, not `dnf upgrade`.

## Configure and start

The packages install the `ricochet` binary, a `ricochet-server` systemd service, and an AppArmor profile.
The service reads `/var/lib/ricochet/ricochet-config.toml` and keeps its data in `/var/lib/ricochet/data`.

```toml
url = "https://ricochet.example.com"

[auth.oidc]
issuer_url = "https://idp.example.com/"
client_id = "your-client-id"
client_secret = "your-client-secret"
redirect_url = "https://ricochet.example.com/oauth/callback"
```

The file contains the client secret, so restrict it:

```sh
sudo chmod 0600 /var/lib/ricochet/ricochet-config.toml
sudo chown root:root /var/lib/ricochet/ricochet-config.toml
sudo systemctl daemon-reload
sudo systemctl enable --now ricochet-server
sudo systemctl status ricochet-server
```

## Standalone binary on Linux

Use it only on a Linux system without a package, because it has no service, AppArmor profile, or language tools.

```sh
VERSION=$(curl -s https://ricochet.rs/releases.json | grep -o '"latest": *"[^"]*"' | grep -o 'v[0-9.]*')
curl -fLO https://s3.eu-central-003.backblazeb2.com/ricochet-server/${VERSION#v}/ricochet-${VERSION#v}-x86_64.tar.gz
tar -xzf ricochet-${VERSION#v}-x86_64.tar.gz
chmod +x ricochet-server
sudo mv ricochet-server /usr/local/bin/ricochet
```

Replace `x86_64` with `aarch64` on an `arm64` machine.
Ricochet runs content in rootless containers, so the account that runs it needs subordinate IDs, and Ubuntu 23.10 and newer need an AppArmor profile:

```sh
# Debian and Ubuntu: sudo apt install uidmap
# RHEL and AlmaLinux: sudo dnf install shadow-utils-subid
sudo usermod --add-subuids 100000-165535 root
sudo usermod --add-subgids 100000-165535 root
sudo ricochet setup-apparmor
sudo ricochet check-security
```

Use an unused range if `/etc/subuid` or `/etc/subgid` already assigns `100000-165535`, and use the account that runs Ricochet instead of `root`.
Set `home` to an absolute path in the config, then start it:

```sh
ricochet start --config /etc/ricochet/ricochet-config.toml
ricochet start --config /etc/ricochet/ricochet-config.toml --daemon
ricochet stop --config /etc/ricochet/ricochet-config.toml
```

`--daemon` keeps it running after the terminal closes and writes `ricochet.pid`, `ricochet.stdout`, and `ricochet.err` to `home`.
Pass `ricochet stop` the same `--config`.

## macOS

Apple Silicon only.
Keep the name `ricochet-server` so it does not replace the `ricochet` CLI on the same machine.

```sh
VERSION=$(curl -s https://ricochet.rs/releases.json | grep -o '"latest": *"[^"]*"' | grep -o 'v[0-9.]*')
curl -fLO https://s3.eu-central-003.backblazeb2.com/ricochet-server/${VERSION#v}/ricochet-${VERSION#v}-aarch64-macos.tar.gz
tar -xzf ricochet-${VERSION#v}-aarch64-macos.tar.gz
chmod +x ricochet-server
sudo mv ricochet-server /usr/local/bin/ricochet-server
ricochet-server start --config /path/to/ricochet-config.toml
```

Install `uv`, `juliaup`, and `renv` yourself, because the macOS binary does not include them.

## Windows

```powershell
$Version = (Invoke-RestMethod https://ricochet.rs/releases.json).latest.TrimStart("v")
Invoke-WebRequest "https://s3.eu-central-003.backblazeb2.com/ricochet-server/$Version/ricochet-$Version-x86_64-windows.zip" -OutFile "ricochet-$Version-x86_64-windows.zip"
Expand-Archive "ricochet-$Version-x86_64-windows.zip" -DestinationPath . -Force
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\Programs\Ricochet" | Out-Null
Move-Item .\ricochet-server.exe "$env:LOCALAPPDATA\Programs\Ricochet\ricochet-server.exe" -Force
ricochet-server start --config C:\path\to\ricochet-config.toml
```

Replace `x86_64` with `aarch64` on an `arm64` machine, and add `%LOCALAPPDATA%\Programs\Ricochet` to `PATH`.
Windows has no `--daemon` or `stop`, so stop it with Ctrl+C or run it under a service manager.

## System libraries for package builds

R and Python packages that compile from source need these on Debian and Ubuntu:

```sh
sudo apt install \
  libgit2-dev libxml2-dev libharfbuzz-dev libfreetype-dev libfontconfig-dev \
  libgdal-dev libproj-dev libgeos-dev libjq-dev libmagick++-dev \
  libnetcdf-dev libfribidi-dev jags libglpk-dev libpng-dev \
  libsecret-1-dev poppler-utils libreadline-dev unixodbc-dev \
  default-jdk-headless libicu-dev libudunits2-dev libsodium-dev \
  zlib1g-dev libglu1-mesa-dev libcairo2-dev git freetds-common \
  libv8-dev librsvg2-dev libsqlite3-dev libpq-dev libgmp3-dev libmpfr-dev
```

On RHEL and AlmaLinux:

```sh
sudo dnf install \
  libgit2-devel libxml2-devel harfbuzz-devel freetype-devel fontconfig-devel \
  gdal-devel proj-devel geos-devel jq-devel ImageMagick-c++-devel \
  netcdf-devel fribidi-devel glpk-devel libpng-devel \
  libsecret-devel poppler-utils readline-devel unixODBC-devel \
  java-21-openjdk-headless libicu-devel udunits2-devel libsodium-devel \
  zlib-devel mesa-libGLU-devel cairo-devel git freetds \
  librsvg2-devel sqlite-devel libpq-devel gmp-devel mpfr-devel
```

The `devxy.data_science_core` Ansible collection has roles that install R, Python, and these libraries.

## Uninstall

```sh
sudo systemctl disable --now ricochet-server
sudo apt purge ricochet-server   # or: sudo dnf remove ricochet-server
```

The config file at `/var/lib/ricochet/ricochet-config.toml` stays behind.

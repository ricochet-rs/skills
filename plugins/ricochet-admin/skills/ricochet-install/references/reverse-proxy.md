# Put Ricochet behind a reverse proxy

Ricochet serves plain HTTP on port `6188`.
A reverse proxy in front of it terminates HTTPS and forwards to `127.0.0.1:6188`.

The proxy must:

- Forward WebSocket upgrades, which Shiny and Streamlit need.
- Set `X-Forwarded-Proto`, because Ricochet treats a request without it as plain HTTP.
- Replace any `X-Forwarded-For` and `X-Real-IP` the client sent, so clients cannot fake their address.

Also set `url` in `ricochet-config.toml` to the public HTTPS address.

## Nginx

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    server_name ricochet.example.com;
    ssl_certificate     /etc/ssl/certs/ricochet.pem;
    ssl_certificate_key /etc/ssl/private/ricochet.key;

    location / {
        proxy_pass http://127.0.0.1:6188;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

## Caddy

Caddy obtains and renews certificates, forwards WebSockets, and sets `X-Forwarded-Proto` by itself.

```caddy
ricochet.example.com {
    reverse_proxy 127.0.0.1:6188 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
    }
}
```

## HAProxy

```haproxy
frontend https
    mode http
    bind :443 ssl crt /etc/haproxy/certs/ricochet.pem
    http-request set-header X-Forwarded-Proto https
    default_backend ricochet

backend ricochet
    http-request del-header X-Forwarded-For
    http-request del-header X-Real-IP
    option forwardfor
    mode http
    server ricochet 127.0.0.1:6188 check
```

## Traefik

```yaml
http:
  routers:
    ricochet:
      rule: "Host(`ricochet.example.com`)"
      entryPoints: [websecure]
      tls:
        certResolver: letsencrypt
      service: ricochet
  services:
    ricochet:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:6188"
```

Traefik forwards WebSockets and sets `X-Forwarded-Proto` by default.

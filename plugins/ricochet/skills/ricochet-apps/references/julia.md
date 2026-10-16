# Julia content

Every Julia item needs `Project.toml` and a current `Manifest.toml`.
Run `Pkg.instantiate()` locally after changing dependencies so the manifest matches.

## Genie and other servers (`genie`, `julia-service`)

Ricochet runs the entrypoint, so it must start the server on `PORT` and stay running.
Ricochet also sets `BASEPATH` to `/app/<content-id>` for frameworks that build absolute URLs.

Genie:

```julia
using GenieFramework
port = parse(Int, get(ENV, "PORT", "8000"))
up(port, async = false)
```

Ricochet sets the host Genie listens on, so pass only the port.

Dash.jl needs the base path:

```julia
base_path = rstrip(get(ENV, "BASEPATH", "/"), '/') * "/"
app = dash(requests_pathname_prefix = base_path)
run_server(app, "0.0.0.0", parse(Int, ENV["PORT"]))
```

HTTP.jl:

```julia
HTTP.listen("0.0.0.0", parse(Int, get(ENV, "PORT", "8080"))) do http::HTTP.Stream
    # handle the request
end
```

## Tasks (`julia`, `quarto-jl`)

A `julia` task runs the entrypoint script and exits, and its output is the run log.

`quarto-jl` renders a `.qmd` with the Julia engine.
Add `[static]` to serve the result.

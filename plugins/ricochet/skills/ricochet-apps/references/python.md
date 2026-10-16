# Python content

Every Python item needs `uv.lock` and `.python-version`, either beside `_ricochet.toml` or in a parent directory, as in a uv workspace.
Create them with `uv lock` and `uv python pin 3.12`, and keep the pinned version inside `requires-python`.

Projects managed with `pip`, Poetry, or Conda are not supported.

## FastAPI (`fast-api`)

Ricochet runs `uvicorn <entrypoint module>:app`, so the entrypoint must define an object named `app`.
Set `root_path` so the generated docs and redirects include the base path:

```python
import os
from fastapi import FastAPI

content_id = os.environ.get("RICOCHET_CONTENT_ID")
app = FastAPI(root_path=f"/app/{content_id}" if content_id else "")
```

## Streamlit and Shiny for Python (`streamlit`, `shiny-py`)

Ricochet starts the app and passes the port and host, so the entrypoint needs no server code.
Shiny Express and Shiny Core both work.

## Flask, Dash, and any other server (`flask`, `dash`, `python-service`)

Ricochet runs `python <entrypoint>`, so the script must start the server on `PORT`:

```python
import os

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8050")))
```

For `python-service`, start any Python web server the same way, for example `uvicorn.run(app, host="0.0.0.0", port=int(os.environ["PORT"]))`.

## Tasks (`python`, `quarto-py`, `jupyter`)

A `python` task runs the entrypoint script and exits, and its output is the run log.

`quarto-py` renders a `.qmd` with the Jupyter engine.
`jupyter` executes the `.ipynb` and serves the HTML, and needs `uv add --dev nbconvert ipykernel`.

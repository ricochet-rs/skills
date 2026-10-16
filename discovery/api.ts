import { API_DOCS_URL } from './policy.ts';

export interface OpenApiSpec {
  info: { title: string; description?: string; version: string };
  [key: string]: unknown;
}

/** The OpenAPI spec embedded in the `api-reference` script tag of the API docs page. */
export function specFromDocsPage(html: string): OpenApiSpec {
  const match = html.match(
    /<script[^>]*id="api-reference"[^>]*>\s*([\s\S]*?)\s*<\/script>/,
  );
  if (!match) throw new Error(`No OpenAPI spec found in ${API_DOCS_URL}`);
  return JSON.parse(match[1]);
}

let cached: Promise<OpenApiSpec> | undefined;

export function fetchOpenApiSpec(url = API_DOCS_URL): Promise<OpenApiSpec> {
  cached ??= fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return specFromDocsPage(await res.text());
  });
  return cached;
}

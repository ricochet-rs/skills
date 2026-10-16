import type { OpenApiSpec } from './api.ts';
import {
  AI_CATALOG_PATH,
  AI_CRAWLERS,
  API_CATALOG_PATH,
  API_DOCS_URL,
  API_ORIGIN,
  API_QUERIES,
  CONTENT_SIGNAL,
  CONTENT_SIGNALS_PREAMBLE,
  DOCS_URL,
  HOST,
  LLMS_FULL_PATH,
  LLMS_PATH,
  OPENAPI_PATH,
  SITEMAP_PATH,
  SKILLS_DIR,
} from './policy.ts';
import type { Skill } from './skills.ts';

/** `sibling` publishes `/pricing` as `/pricing.md`, `index` as `/pricing/index.md`. */
export type TwinPath = 'sibling' | 'index';

const NO_MARKDOWN = new Set(['/404']);

/** Where the markdown twin of a page lives, or null for a route that has none. */
export function markdownPathFor(
  pathname: string,
  twinPath: TwinPath = 'sibling',
): string | null {
  const trimmed = pathname.replace(/\/+$/, '');
  if (NO_MARKDOWN.has(trimmed)) return null;
  if (trimmed === '') return '/index.md';
  return twinPath === 'sibling' ? `${trimmed}.md` : `${trimmed}/index.md`;
}

export interface AgentLink {
  href: string;
  rel: string;
  type: string | undefined;
}

/** The RFC 8288 relations every page on both sites advertises. */
export function agentLinks(markdownPath: string | null): AgentLink[] {
  return [
    { href: DOCS_URL, rel: 'service-doc', type: undefined },
    { href: OPENAPI_PATH, rel: 'service-desc', type: 'application/openapi+json' },
    { href: API_CATALOG_PATH, rel: 'api-catalog', type: 'application/linkset+json' },
    { href: LLMS_PATH, rel: 'describedby', type: 'text/plain' },
    ...(markdownPath
      ? [{ href: markdownPath, rel: 'alternate', type: 'text/markdown' }]
      : []),
    { href: SITEMAP_PATH, rel: 'sitemap', type: 'application/xml' },
  ];
}

export function agentLinkHeader(markdownPath: string | null): string {
  return agentLinks(markdownPath)
    .map(({ href, rel, type }) => {
      const params = type ? `; rel="${rel}"; type="${type}"` : `; rel="${rel}"`;
      return `<${href}>${params}`;
    })
    .join(', ');
}

export interface RobotsOptions {
  site: URL;
  preview?: boolean;
  twinPath?: TwinPath;
  /** Rules added to every group after `Allow: /`, such as `Disallow: /pagefind/`. */
  extraRules?: string[];
}

export function robotsTxt({
  site,
  preview = false,
  twinPath = 'sibling',
  extraRules = [],
}: RobotsOptions): string {
  if (preview) return ['User-agent: *', 'Disallow: /', ''].join('\n');

  const absolute = (path: string) => new URL(path, site).href;
  const group = (agent: string) => [
    `User-agent: ${agent}`,
    CONTENT_SIGNAL,
    'Allow: /',
    ...extraRules,
    '',
  ];
  const twins =
    twinPath === 'sibling'
      ? [
          '# Every page is also published as markdown at the same path with a .md',
          '# suffix. These two index it.',
        ]
      : [
          '# Every page is also published as markdown at its path plus index.md.',
          '# These two index it.',
        ];

  return [
    CONTENT_SIGNALS_PREAMBLE,
    '',
    ...group('*'),
    ...AI_CRAWLERS.flatMap(group),
    `Sitemap: ${absolute(SITEMAP_PATH)}`,
    '',
    ...twins,
    `# ${absolute(LLMS_PATH)}`,
    `# ${absolute(LLMS_FULL_PATH)}`,
    '',
  ].join('\n');
}

export function skillPath(skill: Skill, file = 'SKILL.md'): string {
  return `${SKILLS_DIR}/${skill.name}/${file}`;
}

/** Agent Skills Discovery index, v0.2.0. */
export function agentSkillsIndex(skills: Skill[]): string {
  const index = {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: skills.map((skill) => ({
      name: skill.name,
      type: 'skill-md',
      description: skill.description,
      url: skillPath(skill),
      digest: skill.digest,
    })),
  };
  return `${JSON.stringify(index, null, 2)}\n`;
}

/** RFC 9727 API catalog. */
export function apiCatalog(spec: OpenApiSpec): string {
  const linkset = {
    linkset: [
      {
        anchor: `${API_ORIGIN}/api/`,
        'service-desc': [
          {
            href: OPENAPI_PATH,
            type: 'application/openapi+json',
            title: `${spec.info.title} ${spec.info.version}`,
          },
        ],
        'service-doc': [{ href: API_DOCS_URL, type: 'text/html' }],
      },
    ],
  };
  return `${JSON.stringify(linkset, null, 2)}\n`;
}

export interface AiCatalogEntry {
  identifier: string;
  displayName: string;
  description?: string;
  type: string;
  url: string;
  representativeQueries?: string[];
}

/** An entry identifier under the shared `urn:air` namespace. */
export function entryIdentifier(namespace: string, name: string): string {
  return `urn:air:${HOST.domain}:${namespace}:${name}`;
}

/** ARD manifest: every skill, the REST API, then the site's own entries. */
export function aiCatalog(
  skills: Skill[],
  spec: OpenApiSpec,
  extraEntries: AiCatalogEntry[] = [],
): string {
  const entries: AiCatalogEntry[] = [
    ...skills.map((skill) => ({
      identifier: entryIdentifier('skill', skill.name),
      displayName: skill.name,
      description: skill.description,
      type: 'text/markdown',
      url: skillPath(skill),
      ...(skill.queries.length ? { representativeQueries: skill.queries } : {}),
    })),
    {
      identifier: entryIdentifier('api', 'rest'),
      displayName: spec.info.title,
      ...(spec.info.description ? { description: spec.info.description } : {}),
      type: 'application/openapi+json',
      url: OPENAPI_PATH,
      representativeQueries: API_QUERIES,
    },
    ...extraEntries,
  ];
  const catalog = {
    specVersion: '1.0',
    host: { displayName: HOST.displayName, identifier: HOST.identifier },
    entries,
  };
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export interface PathHeaders {
  path: string;
  headers: Record<string, string>;
}

/** Response headers the discovery files need, which a static host cannot infer. */
export function discoveryHeaders(): PathHeaders[] {
  return [
    { path: LLMS_PATH, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    { path: LLMS_FULL_PATH, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    { path: API_CATALOG_PATH, headers: { 'Content-Type': 'application/linkset+json' } },
    {
      path: AI_CATALOG_PATH,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  ];
}

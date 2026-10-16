import { expect, test } from 'bun:test';
import {
  agentLinkHeader,
  agentSkillsIndex,
  aiCatalog,
  apiCatalog,
  markdownPathFor,
  robotsTxt,
} from './artifacts.ts';
import { AI_CRAWLERS } from './policy.ts';
import type { Skill } from './skills.ts';

const skill: Skill = {
  name: 'ricochet-cli',
  plugin: 'ricochet',
  description: 'Use for deploying.',
  digest: 'sha256:abc',
  files: [],
  queries: ['Deploy my app.'],
};
const spec = { info: { title: 'ricochet REST API', version: '0.24.0', description: 'Endpoints.' } };

test('twin paths', () => {
  expect(markdownPathFor('/', 'sibling')).toBe('/index.md');
  expect(markdownPathFor('/pricing/', 'sibling')).toBe('/pricing.md');
  expect(markdownPathFor('/v0-24/', 'index')).toBe('/v0-24/index.md');
  expect(markdownPathFor('/', 'index')).toBe('/index.md');
  expect(markdownPathFor('/404', 'index')).toBeNull();
});

test('link header lists every relation', () => {
  const header = agentLinkHeader('/pricing.md');
  for (const rel of ['service-doc', 'service-desc', 'api-catalog', 'describedby', 'alternate', 'sitemap']) {
    expect(header).toContain(`rel="${rel}"`);
  }
  expect(agentLinkHeader(null)).not.toContain('alternate');
});

test('robots names every crawler and repeats extra rules per group', () => {
  const robots = robotsTxt({
    site: new URL('https://docs.ricochet.rs'),
    twinPath: 'index',
    extraRules: ['Disallow: /pagefind/'],
  });
  for (const crawler of AI_CRAWLERS) expect(robots).toContain(`User-agent: ${crawler}\n`);
  expect(robots.match(/Disallow: \/pagefind\//g)).toHaveLength(AI_CRAWLERS.length + 1);
  expect(robots).toContain('Sitemap: https://docs.ricochet.rs/sitemap-index.xml');
});

test('preview robots disallows everything', () => {
  expect(robotsTxt({ site: new URL('https://ricochet.rs'), preview: true })).toBe(
    'User-agent: *\nDisallow: /\n',
  );
});

test('skills index', () => {
  const index = JSON.parse(agentSkillsIndex([skill]));
  expect(index.skills[0]).toEqual({
    name: 'ricochet-cli',
    type: 'skill-md',
    description: 'Use for deploying.',
    url: '/.well-known/agent-skills/ricochet-cli/SKILL.md',
    digest: 'sha256:abc',
  });
});

test('api catalog is an RFC 9727 linkset', () => {
  const [entry] = JSON.parse(apiCatalog(spec)).linkset;
  expect(entry.anchor).toBe('https://try.ricochet.rs/api/');
  expect(entry['service-desc'][0].href).toBe('/openapi.json');
  expect(entry['service-doc'][0].href).toBe('https://try.ricochet.rs/api/docs');
});

test('ai catalog lists skills, the API and site extras', () => {
  const extra = {
    identifier: 'urn:air:ricochet.rs:page:demo',
    displayName: 'Book a demo',
    type: 'text/html',
    url: '/contact?reason=demo',
  };
  const catalog = JSON.parse(aiCatalog([skill], spec, [extra]));
  expect(catalog.host.identifier).toBe('did:web:ricochet.rs');
  expect(catalog.entries.map((e: { identifier: string }) => e.identifier)).toEqual([
    'urn:air:ricochet.rs:skill:ricochet-cli',
    'urn:air:ricochet.rs:api:rest',
    'urn:air:ricochet.rs:page:demo',
  ]);
  expect(catalog.entries[0].representativeQueries).toEqual(['Deploy my app.']);
  for (const entry of catalog.entries) {
    expect('url' in entry !== 'data' in entry).toBe(true);
  }
});

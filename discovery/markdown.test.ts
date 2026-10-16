import { expect, test } from 'bun:test';
import { extract, llmsIndex, refreshTarget, turndown, type Page } from './markdown.ts';

const site = new URL('https://docs.ricochet.rs');

const starlightPage = `<html><head><title>Quickstart | ricochet</title>
<meta name="description" content="Deploy your first app."></head><body>
<nav>Sidebar</nav>
<main><h1>Quickstart</h1><div class="sl-markdown-content">
<p>Read the <a href="/v0-24/user/cli/">CLI guide</a>.</p>
<div class="expressive-code"><figure><pre data-language="bash"><code><div class="ec-line"><div class="code"><span>curl</span><span> -fsSL x</span></div></div><div class="ec-line"><div class="code">sh install.sh</div></div></code></pre><div class="copy"><button>Copy</button></div></figure></div>
</div><footer><a href="/v0-24/next/">Next page</a></footer></main></body></html>`;

test('converts Starlight content with Expressive Code blocks', () => {
  const { title, description, markdown } = extract(starlightPage, site, turndown(), {
    siteTitle: 'ricochet',
    strip: ['footer', '.expressive-code .copy'],
  });
  expect(title).toBe('Quickstart');
  expect(description).toBe('Deploy your first app.');
  expect(markdown).toContain('# Quickstart');
  expect(markdown).toContain('[CLI guide](https://docs.ricochet.rs/v0-24/user/cli/)');
  expect(markdown).toContain('```bash\ncurl -fsSL x\nsh install.sh\n```');
  expect(markdown).not.toContain('Sidebar');
  expect(markdown).not.toContain('Next page');
  expect(markdown).not.toContain('Copy');
});

test('gives a page without an h1 a heading', () => {
  const html = '<html><head><title>Pricing | ricochet</title></head><body><main><p>Plans.</p></main></body></html>';
  const { markdown } = extract(html, site, turndown(), { siteTitle: 'ricochet' });
  expect(markdown).toBe('# Pricing\n\nPlans.');
});

test('reads a meta refresh target', () => {
  expect(refreshTarget('<meta http-equiv="refresh" content="0; url=/v0-24/">')).toBe('/v0-24/');
  expect(refreshTarget('<p>no</p>')).toBeUndefined();
});

test('llms.txt groups pages and lists optional links', () => {
  const page = (htmlPath: string, title: string): Page => ({
    htmlPath,
    markdownPath: `${htmlPath.replace(/\/$/, '')}/index.md`,
    title,
    description: '',
    markdown: '',
  });
  const index = llmsIndex(
    [page('/v0-24/', 'Home'), page('/releases/', 'Releases')],
    site,
    'index',
    {
      title: 'ricochet',
      summary: 'Docs.',
      sections: [{ heading: 'Releases', prefix: '/releases' }],
      restHeading: 'Docs',
      optional: [{ title: 'Website', href: 'https://ricochet.rs', description: 'the product site' }],
    },
  );
  expect(index).toContain('## Docs\n\n- [Home](https://docs.ricochet.rs/v0-24/index.md)');
  expect(index).toContain('## Releases\n\n- [Releases](https://docs.ricochet.rs/releases/index.md)');
  expect(index).toContain('- [Website](https://ricochet.rs): the product site');
});

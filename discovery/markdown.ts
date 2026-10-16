/// <reference path="./turndown-plugin-gfm.d.ts" />
import { parse, type HTMLElement as ParsedElement } from 'node-html-parser';
import TurndownService from 'turndown';
import { strikethrough, tables, taskListItems } from 'turndown-plugin-gfm';
import { agentLinkHeader, discoveryHeaders, type TwinPath } from './artifacts.ts';
import { LLMS_FULL_PATH } from './policy.ts';

export { NodeType, type HTMLElement as ParsedElement } from 'node-html-parser';

/** Decorative markup that carries no meaning once the styling is gone. */
export const STRIP = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  '[aria-hidden="true"]',
];

export interface Page {
  /** The route's markdown URL, e.g. `/pricing.md`. */
  markdownPath: string;
  /** The route's HTML URL, e.g. `/pricing`. */
  htmlPath: string;
  title: string;
  description: string;
  markdown: string;
}

export interface ExtractOptions {
  siteTitle: string;
  contentSelector?: string;
  strip?: string[];
}

export interface Extracted extends Pick<Page, 'title' | 'description' | 'markdown'> {
  /** The stripped content element, or null when the page has none. */
  main: ParsedElement | null;
}

/** Turndown with GitHub tables, plus rules for Shiki and Expressive Code blocks, headings and icon links. */
export function turndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
  });

  service.use([tables, strikethrough, taskListItems]);

  service.addRule('shiki', {
    filter: (node) => node.nodeName === 'PRE',
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      const language = element.getAttribute('data-language') ?? '';
      const lines = element.querySelectorAll('.ec-line');
      const text = lines.length
        ? Array.from(lines, (line) => line.textContent ?? '').join('\n')
        : (element.textContent ?? '');
      const code = text.replace(/\n+$/, '');
      return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    },
  });

  service.addRule('lineBreak', {
    filter: 'br',
    replacement: (_content, node) => {
      const parent = (node as Node).parentNode as HTMLElement | null;
      return parent && /^H[1-6]$/.test(parent.nodeName) ? ' ' : '  \n';
    },
  });

  service.addRule('link', {
    filter: (node) => node.nodeName === 'A' && node.hasAttribute('href'),
    replacement: (content, node) => {
      const text = content.trim();
      if (!text) return '';

      const element = node as HTMLElement;
      const href = element.getAttribute('href') ?? '';
      const classes = element.getAttribute('class') ?? '';
      const link = `[${text}](${href})`;

      if (classes.includes('btn')) return `\n\n${link}\n\n`;
      if (classes.includes('badge')) return `${link} `;
      return link;
    },
  });

  return service;
}

/** Rewrites every in-site href and src to an absolute URL. */
export function absolutise(root: ParsedElement, site: URL): void {
  for (const element of root.querySelectorAll('[href], [src]')) {
    for (const attribute of ['href', 'src']) {
      const value = element.getAttribute(attribute);
      if (value?.startsWith('/')) {
        element.setAttribute(attribute, new URL(value, site).href);
      }
    }
  }
}

/** The target of a `<meta http-equiv="refresh">` redirect page, if this is one. */
export function refreshTarget(html: string): string | undefined {
  const root = parse(html);
  const content = root
    .querySelector('meta[http-equiv="refresh"]')
    ?.getAttribute('content');
  return content?.match(/url=(.+)$/i)?.[1]?.trim();
}

export function extract(
  html: string,
  site: URL,
  service: TurndownService,
  { siteTitle, contentSelector = 'main', strip = [] }: ExtractOptions,
): Extracted {
  const root = parse(html);

  const rawTitle = root.querySelector('title')?.textContent?.trim() ?? '';
  const title = rawTitle.replace(new RegExp(`\\s*\\|\\s*${siteTitle}$`), '');
  const description =
    root
      .querySelector('meta[name="description"]')
      ?.getAttribute('content')
      ?.trim() ?? '';

  const main = root.querySelector(contentSelector);
  if (!main) return { title, description, markdown: '', main: null };

  for (const selector of [...STRIP, ...strip]) {
    for (const element of main.querySelectorAll(selector)) element.remove();
  }

  absolutise(main, site);

  const body = service
    .turndown(main.innerHTML)
    .replace(/\n{3,}/g, '\n\n')
    // Trailing whitespace, except the two spaces that mean a hard line break.
    .replace(/[^\S\n]+$/gm, (run) => (run === '  ' ? run : ''))
    .trim();

  const heading = main.querySelector('h1') ? '' : `# ${title || siteTitle}\n\n`;

  return { title, description, markdown: `${heading}${body}`, main };
}

export interface LlmsOptions {
  title: string;
  summary: string;
  /** Pages under each prefix are listed under their own heading, in order. */
  sections?: { heading: string; prefix: string }[];
  restHeading?: string;
  optional?: { title: string; href: string; description: string }[];
}

/** The llms.txt index. */
export function llmsIndex(
  pages: Page[],
  site: URL,
  twinPath: TwinPath,
  { title, summary, sections = [], restHeading = 'Pages', optional = [] }: LlmsOptions,
): string {
  const group = (prefix: string) =>
    pages
      .filter((page) => page.htmlPath.startsWith(prefix))
      .sort((a, b) => a.htmlPath.localeCompare(b.htmlPath));

  const grouped = sections.map(({ heading, prefix }) => ({
    heading,
    items: group(prefix),
  }));
  const rest = pages
    .filter((page) => !grouped.some(({ items }) => items.includes(page)))
    .sort((a, b) => a.htmlPath.length - b.htmlPath.length);

  const entry = (page: Page) =>
    `- [${page.title || page.htmlPath}](${new URL(page.markdownPath, site).href})${
      page.description ? `: ${page.description}` : ''
    }`;

  const section = (heading: string, items: Page[]) =>
    items.length ? `## ${heading}\n\n${items.map(entry).join('\n')}\n` : '';

  const full = new URL(LLMS_FULL_PATH, site).href;
  const note =
    twinPath === 'sibling'
      ? [
          'Every page on this site is also published as markdown at the same path with',
          'a `.md` suffix, and the whole site is concatenated into',
          `${full}.`,
        ]
      : [
          'Every page on this site is also published as markdown at its path plus',
          '`index.md`, and the pages below are concatenated into',
          `${full}.`,
        ];

  return [
    `# ${title}`,
    '',
    `> ${summary}`,
    '',
    ...note,
    '',
    section(restHeading, rest),
    ...grouped.map(({ heading, items }) => section(heading, items)),
    ...(optional.length
      ? [
          '## Optional',
          '',
          ...optional.map(
            (link) => `- [${link.title}](${link.href}): ${link.description}`,
          ),
        ]
      : []),
    '',
  ].join('\n');
}

/** A Cloudflare-style `_headers` file with the discovery headers and every page's `Link`. */
export function headersFile(pages: Page[]): string {
  const fixed = discoveryHeaders().map(({ path, headers }) =>
    [path, ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)].join(
      '\n',
    ),
  );

  const blocks = [...pages]
    .sort((a, b) => a.htmlPath.localeCompare(b.htmlPath))
    .map((page) => {
      const link = `  Link: ${agentLinkHeader(page.markdownPath)}`;
      const route = page.htmlPath.replace(/\/$/, '');
      const routes = route === '' ? ['/'] : [route, `${route}/`];

      return [
        ...routes.flatMap((path) => [path, link, '']),
        page.markdownPath,
        '  Content-Type: text/markdown; charset=utf-8',
        link,
      ].join('\n');
    });

  return [
    '# Generated by @ricochet-rs/agent-discovery.',
    '',
    fixed.join('\n\n'),
    '',
    blocks.join('\n\n'),
    '',
  ].join('\n');
}

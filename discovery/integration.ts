import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HTMLElement as ParsedElement } from 'node-html-parser';
import { fetchOpenApiSpec } from './api.ts';
import {
  agentSkillsIndex,
  aiCatalog,
  apiCatalog,
  markdownPathFor,
  robotsTxt,
  skillPath,
  type AiCatalogEntry,
  type TwinPath,
} from './artifacts.ts';
import {
  extract,
  headersFile,
  llmsIndex,
  refreshTarget,
  turndown,
  type LlmsOptions,
  type Page,
} from './markdown.ts';
import {
  AI_CATALOG_PATH,
  API_CATALOG_PATH,
  LLMS_FULL_PATH,
  LLMS_PATH,
  OPENAPI_PATH,
  SKILLS_DIR,
} from './policy.ts';
import { fetchSkills } from './skills.ts';

export interface BuiltPage {
  htmlPath: string;
  title: string;
  description: string;
  main: ParsedElement | null;
  outDir: string;
  site: URL;
}

export interface AgentDiscoveryOptions {
  siteTitle: string;
  twinPath?: TwinPath;
  contentSelector?: string;
  /** Selectors removed from the content before conversion, on top of the shared list. */
  strip?: string[];
  llms: LlmsOptions;
  /** Which pages llms.txt and llms-full.txt list. Every page still gets a twin. */
  llmsInclude?: (htmlPath: string) => boolean;
  robots?: { preview?: boolean; extraRules?: string[] };
  /** Write a Cloudflare-style `_headers` file. */
  headersFile?: boolean;
  aiCatalogEntries?: AiCatalogEntry[];
  /** Called for each converted page, for site-specific artefacts such as Open Graph cards. */
  onPage?: (page: BuiltPage) => void | Promise<void>;
}

interface Logger {
  info(message: string): void;
  warn(message: string): void;
}

interface BuildDone {
  dir: URL;
  pages: { pathname: string }[];
  logger: Logger;
}

async function write(outDir: string, path: string, content: string | Uint8Array) {
  const target = join(outDir, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

function htmlPathFor(pathname: string, markdownPath: string, twinPath: TwinPath) {
  if (twinPath === 'sibling') {
    return markdownPath.replace(/(\/index)?\.md$/, '') || '/';
  }
  return `/${pathname}`.replace(/\/*$/, '/');
}

const trimSlash = (path: string) => path.replace(/\/+$/, '') || '/';

export function agentDiscovery(options: AgentDiscoveryOptions) {
  const {
    siteTitle,
    twinPath = 'sibling',
    contentSelector,
    strip,
    llmsInclude = () => true,
    onPage,
  } = options;
  let site: URL | undefined;

  return {
    name: '@ricochet-rs/agent-discovery',
    hooks: {
      'astro:config:done': ({ config }: { config: { site?: string } }) => {
        site = config.site ? new URL(config.site) : undefined;
      },

      'astro:build:done': async ({ dir, pages, logger }: BuildDone) => {
        if (!site) {
          logger.warn('no `site` configured; skipping the agent artefacts');
          return;
        }

        const outDir = fileURLToPath(dir);
        const service = turndown();
        const built: Page[] = [];
        const redirects: { markdownPath: string; target: string }[] = [];

        for (const { pathname } of pages) {
          const markdownPath = markdownPathFor(`/${pathname}`, twinPath);
          if (!markdownPath) continue;

          let html: string;
          try {
            html = await readFile(join(outDir, pathname, 'index.html'), 'utf8');
          } catch {
            continue;
          }

          const target = refreshTarget(html);
          if (target) {
            redirects.push({ markdownPath, target: new URL(target, site).pathname });
            continue;
          }

          const { title, description, markdown, main } = extract(html, site, service, {
            siteTitle,
            contentSelector,
            strip,
          });
          const htmlPath = htmlPathFor(pathname, markdownPath, twinPath);
          const document = `${markdown}\n\n---\n\nSource: ${new URL(htmlPath, site).href}\n`;
          await write(outDir, markdownPath, document);
          await onPage?.({ htmlPath, title, description, main, outDir, site });

          built.push({ markdownPath, htmlPath, title, description, markdown: document });
        }

        for (const { markdownPath, target } of redirects) {
          const page = built.find((p) => trimSlash(p.htmlPath) === trimSlash(target));
          if (page) await write(outDir, markdownPath, page.markdown);
        }

        const listed = built.filter((page) => llmsInclude(page.htmlPath));
        await write(outDir, LLMS_PATH, llmsIndex(listed, site, twinPath, options.llms));
        await write(outDir, LLMS_FULL_PATH, listed.map((page) => page.markdown).join('\n'));

        await write(
          outDir,
          'robots.txt',
          robotsTxt({ site, twinPath, ...options.robots }),
        );

        const [skills, spec] = await Promise.all([fetchSkills(), fetchOpenApiSpec()]);
        await write(outDir, `${SKILLS_DIR}/index.json`, agentSkillsIndex(skills));
        for (const skill of skills) {
          for (const file of skill.files) {
            await write(outDir, skillPath(skill, file.path), file.content);
          }
        }
        await write(outDir, OPENAPI_PATH, JSON.stringify(spec));
        await write(outDir, API_CATALOG_PATH, apiCatalog(spec));
        await write(
          outDir,
          AI_CATALOG_PATH,
          aiCatalog(skills, spec, options.aiCatalogEntries),
        );

        if (options.headersFile) {
          await write(outDir, '_headers', headersFile(built));
        }

        logger.info(
          `wrote ${built.length} markdown twin(s), llms.txt, robots.txt, ${skills.length} skill(s), the API and AI catalogs${
            options.headersFile ? ' and _headers' : ''
          }`,
        );
      },
    },
  };
}

/** The Content Signals preamble, as Cloudflare publishes it: https://contentsignals.org */
export const CONTENT_SIGNALS_PREAMBLE = `# As a condition of accessing this website, you agree to abide by the
# following content signals:
#
# (a) If a content-signal = yes, you may collect content for the
#     corresponding use.
# (b) If a content-signal = no, you may not collect content for the
#     corresponding use.
# (c) If the website operator does not include a content signal for a
#     corresponding use, the website operator neither grants nor restricts
#     permission via content signal with respect to the corresponding use.
#
# The content signals and their meanings are:
#
# search:   building a search index and providing search results (e.g.,
#           returning hyperlinks and short excerpts from your website's
#           contents). Search does not include providing AI-generated search
#           summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of
#           content for generative AI search answers).
# ai-train: training or fine-tuning AI models.
#
# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.`;

export const CONTENT_SIGNAL = 'Content-Signal: search=yes,ai-input=yes,ai-train=yes';

/** A crawler that matches its own group never reads `User-agent: *`, so each is named. */
export const AI_CRAWLERS = [
  // OpenAI
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'Claude-Web',
  'anthropic-ai',
  // Google
  'Google-Extended',
  'GoogleOther',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Apple
  'Applebot',
  'Applebot-Extended',
  // Meta
  'meta-externalagent',
  'FacebookBot',
  // Microsoft
  'MSN-Bot',
  // the rest
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'cohere-ai',
  'Diffbot',
  'DuckAssistBot',
  'MistralAI-User',
  'omgilibot',
  'Timpibot',
  'YouBot',
];

export const HOST = {
  displayName: 'ricochet',
  identifier: 'did:web:ricochet.rs',
  domain: 'ricochet.rs',
};

export const DOCS_URL = 'https://docs.ricochet.rs';
export const API_ORIGIN = 'https://try.ricochet.rs';
export const API_DOCS_URL = `${API_ORIGIN}/api/docs`;

export const SKILLS_TARBALL =
  'https://codeload.github.com/ricochet-rs/skills/tar.gz/main';

export const LLMS_PATH = '/llms.txt';
export const LLMS_FULL_PATH = '/llms-full.txt';
export const SITEMAP_PATH = '/sitemap-index.xml';
export const OPENAPI_PATH = '/openapi.json';
export const API_CATALOG_PATH = '/.well-known/api-catalog';
export const AI_CATALOG_PATH = '/.well-known/ai-catalog.json';
export const SKILLS_DIR = '/.well-known/agent-skills';

export const API_QUERIES = [
  'run a ricochet task from code and wait for it to finish',
  'list the content deployed on a ricochet server',
  'read the logs of a ricochet deployment',
  'change the schedule of a ricochet task',
];

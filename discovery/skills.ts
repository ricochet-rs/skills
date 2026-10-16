import { createHash } from 'node:crypto';
import { SKILLS_TARBALL } from './policy.ts';
import { untarGz } from './tar.ts';

const SKILL_FILE =
  /^plugins\/([^/]+)\/skills\/([^/]+)\/((?:references\/)?[^/]+\.md)$/;
const GRADER = /^plugins\/([^/]+)\/evals\/([^/]+)\/graders\/loads-([^/]+)\.md$/;
const MAX_QUERIES = 5;

const decoder = new TextDecoder();

export interface SkillFile {
  path: string;
  content: Uint8Array;
}

export interface Skill {
  name: string;
  plugin: string;
  description: string;
  digest: string;
  files: SkillFile[];
  queries: string[];
}

export function frontmatterField(content: string, field: string): string {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  if (!match) throw new Error(`frontmatter is missing \`${field}\``);
  return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
}

export function frontmatterBody(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

export function sha256Digest(content: Uint8Array): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/** Skills from the repository's files, with eval prompts as example queries. */
export function skillsFromFiles(files: Map<string, Uint8Array>): Skill[] {
  const skills = new Map<string, Skill>();
  const folders = new Map<string, string>();

  for (const [path, content] of files) {
    const match = path.match(SKILL_FILE);
    if (!match) continue;
    const [, plugin, folder, file] = match;
    const key = `${plugin}/${folder}`;

    if (!skills.has(key)) {
      skills.set(key, {
        name: folder,
        plugin,
        description: '',
        digest: '',
        files: [],
        queries: [],
      });
    }
    const skill = skills.get(key)!;
    skill.files.push({ path: file, content });

    if (file === 'SKILL.md') {
      const text = decoder.decode(content);
      skill.name = frontmatterField(text, 'name');
      skill.description = frontmatterField(text, 'description');
      skill.digest = sha256Digest(content);
    }
  }

  for (const [key, skill] of skills) {
    if (!skill.digest) throw new Error(`${key} has no SKILL.md`);
    const other = folders.get(skill.name);
    if (other) {
      throw new Error(`skill \`${skill.name}\` is defined in ${other} and ${key}`);
    }
    folders.set(skill.name, key);
  }

  const byName = new Map([...skills.values()].map((skill) => [skill.name, skill]));
  for (const path of [...files.keys()].sort()) {
    const match = path.match(GRADER);
    if (!match) continue;
    const [, plugin, evalCase, name] = match;
    const skill = byName.get(name);
    const prompt = files.get(`plugins/${plugin}/evals/${evalCase}/prompt.md`);
    if (!skill || !prompt || skill.queries.length >= MAX_QUERIES) continue;
    const query = frontmatterBody(decoder.decode(prompt));
    if (query) skill.queries.push(query);
  }

  return [...skills.values()]
    .map((skill) => ({
      ...skill,
      files: skill.files.sort((a, b) => (a.path < b.path ? -1 : 1)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

let cached: Promise<Skill[]> | undefined;

/** Every skill on the main branch of ricochet-rs/skills, downloaded once per build. */
export function fetchSkills(url = SKILLS_TARBALL): Promise<Skill[]> {
  cached ??= download(url).then((archive) => skillsFromFiles(untarGz(archive)));
  return cached;
}

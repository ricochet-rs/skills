import { expect, test } from 'bun:test';
import { frontmatterBody, sha256Digest, skillsFromFiles } from './skills.ts';

const encode = (text: string) => new TextEncoder().encode(text);

const skillMd = (name: string) =>
  encode(`---\nname: ${name}\ndescription: Use for ${name}.\n---\n\n# ${name}\n`);

const prompt = (text: string) =>
  encode(`---\nname: case\nruns: 1\n---\n\n${text}\n`);

test('collects skills, references and eval prompts as queries', () => {
  const files = new Map([
    ['plugins/ricochet/skills/ricochet-cli/SKILL.md', skillMd('ricochet-cli')],
    ['plugins/ricochet/skills/ricochet-cli/references/toml.md', encode('# toml')],
    ['plugins/ricochet/skills/ricochet-cli/agents/openai.yaml', encode('x: 1')],
    ['plugins/ricochet/evals/deploy/prompt.md', prompt('Deploy my app.')],
    ['plugins/ricochet/evals/deploy/graders/loads-ricochet-cli.md', encode('')],
    ['plugins/ricochet/evals/other/prompt.md', prompt('Reverse a string.')],
    ['plugins/ricochet/evals/other/graders/no-ricochet-skill.md', encode('')],
    ['plugins/admin/skills/ricochet-install/SKILL.md', skillMd('ricochet-install')],
  ]);

  const skills = skillsFromFiles(files);

  expect(skills.map((skill) => skill.name)).toEqual(['ricochet-cli', 'ricochet-install']);
  const [cli] = skills;
  expect(cli.plugin).toBe('ricochet');
  expect(cli.description).toBe('Use for ricochet-cli.');
  expect(cli.files.map((file) => file.path)).toEqual(['SKILL.md', 'references/toml.md']);
  expect(cli.digest).toBe(sha256Digest(skillMd('ricochet-cli')));
  expect(cli.queries).toEqual(['Deploy my app.']);
  expect(skills[1].queries).toEqual([]);
});

test('rejects the same skill name in two plugins', () => {
  const files = new Map([
    ['plugins/a/skills/dup/SKILL.md', skillMd('dup')],
    ['plugins/b/skills/dup/SKILL.md', skillMd('dup')],
  ]);
  expect(() => skillsFromFiles(files)).toThrow('defined in');
});

test('strips frontmatter from a prompt', () => {
  expect(frontmatterBody('---\na: 1\n---\n\nHello.\n')).toBe('Hello.');
});

import { expect, test } from 'bun:test';
import { gzipSync } from 'node:zlib';
import { untarGz } from './tar.ts';

function header(name: string, size: number, type: string, prefix = ''): Uint8Array {
  const block = new Uint8Array(512);
  const put = (text: string, offset: number) => block.set(new TextEncoder().encode(text), offset);
  put(name, 0);
  put(size.toString(8).padStart(11, '0'), 124);
  put(type, 156);
  put(prefix, 345);
  return block;
}

function entry(name: string, body: string, type = '0', prefix = ''): Uint8Array[] {
  const data = new TextEncoder().encode(body);
  const padded = new Uint8Array(Math.ceil(data.length / 512) * 512);
  padded.set(data);
  return [header(name, data.length, type, prefix), padded];
}

function paxRecord(key: string, value: string): string {
  const rest = ` ${key}=${value}\n`;
  let length = rest.length + 1;
  while (String(length).length + rest.length !== length) length += 1;
  return `${length}${rest}`;
}

test('reads files, ustar prefixes and pax paths', () => {
  const longPath = 'skills-main/plugins/p/skills/s/references/long.md';
  const blocks = [
    ...entry('pax_global_header', paxRecord('comment', 'abc'), 'g'),
    ...entry('README.md', 'readme', '0', 'skills-main'),
    ...entry('PaxHeader', paxRecord('path', longPath), 'x'),
    ...entry('ignored-name', 'long', '0'),
    ...entry('skills-main/dir/', '', '5'),
    new Uint8Array(1024),
  ];
  const tar = new Uint8Array(blocks.reduce((n, b) => n + b.length, 0));
  let offset = 0;
  for (const block of blocks) {
    tar.set(block, offset);
    offset += block.length;
  }

  const files = untarGz(gzipSync(tar));
  const text = (path: string) => new TextDecoder().decode(files.get(path));

  expect(text('README.md')).toBe('readme');
  expect(text('plugins/p/skills/s/references/long.md')).toBe('long');
  expect(files.has('dir/')).toBe(false);
});

import { gunzipSync } from 'node:zlib';

const BLOCK = 512;
const decoder = new TextDecoder();

function field(header: Uint8Array, start: number, length: number): string {
  const bytes = header.subarray(start, start + length);
  const end = bytes.indexOf(0);
  return decoder.decode(end === -1 ? bytes : bytes.subarray(0, end));
}

function paxPath(data: Uint8Array): string | undefined {
  for (const record of decoder.decode(data).split('\n')) {
    const match = record.match(/^\d+ path=(.*)$/);
    if (match) return match[1];
  }
  return undefined;
}

/** Regular files in a gzipped ustar archive, keyed by path without the top-level folder. */
export function untarGz(archive: Uint8Array): Map<string, Uint8Array> {
  const tar = gunzipSync(archive);
  const files = new Map<string, Uint8Array>();
  let nextPath: string | undefined;

  for (let offset = 0; offset + BLOCK <= tar.length; ) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) break;

    const size = parseInt(field(header, 124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156]);
    const data = tar.subarray(offset + BLOCK, offset + BLOCK + size);
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;

    if (type === 'x') {
      nextPath = paxPath(data);
      continue;
    }
    if (type === 'g') continue;

    const prefix = field(header, 345, 155);
    const name = field(header, 0, 100);
    const path = nextPath ?? (prefix ? `${prefix}/${name}` : name);
    nextPath = undefined;

    if (type === '0' || type === '\0') {
      files.set(path.replace(/^[^/]+\//, ''), data);
    }
  }

  return files;
}

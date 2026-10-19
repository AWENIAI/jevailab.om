import path from 'node:path';

export function buildD1MigrationArgs(
  databaseName: string,
  target: '--local' | '--remote'
): string[] {
  return ['d1', 'migrations', 'apply', databaseName, target];
}

export function getWranglerEntrypoint(packageJsonPath: string): string {
  return path.join(path.dirname(packageJsonPath), 'bin', 'wrangler.js');
}

export function stripJsonComments(source: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (
        index < source.length &&
        source[index] !== '\n' &&
        source[index] !== '\r'
      ) {
        index += 1;
      }
      result += source[index] ?? '';
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === '*' && source[index + 1] === '/')
      ) {
        if (source[index] === '\n' || source[index] === '\r') {
          result += source[index];
        }
        index += 1;
      }
      index += 1;
      continue;
    }

    result += char;
  }

  return result;
}

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

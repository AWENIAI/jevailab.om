import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { buildD1MigrationArgs, getWranglerEntrypoint } from './d1-migration';
import { parseWranglerConfig } from './parse-wrangler';

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const target = process.argv[2];

  if (target !== '--local' && target !== '--remote') {
    console.error('Usage: tsx scripts/migrate-d1.ts --local|--remote');
    process.exitCode = 1;
  } else {
    const databaseName = parseWranglerConfig().d1_databases?.[0]?.database_name;

    if (!databaseName) {
      console.error('Database name not found in wrangler.jsonc');
      process.exitCode = 1;
    } else {
      const require = createRequire(import.meta.url);
      const wranglerEntrypoint = getWranglerEntrypoint(
        require.resolve('wrangler/package.json')
      );
      const child = spawn(
        process.execPath,
        [wranglerEntrypoint, ...buildD1MigrationArgs(databaseName, target)],
        { stdio: 'inherit' }
      );

      child.once('exit', (code) => {
        process.exitCode = code ?? 1;
      });
    }
  }
}

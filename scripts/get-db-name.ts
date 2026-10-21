import { parseWranglerConfig } from './parse-wrangler';

export function getDatabaseName(): string {
  const config = parseWranglerConfig();
  const dbName = config.d1_databases?.[0]?.database_name;

  if (!dbName) {
    throw new Error('Database name not found in wrangler.jsonc');
  }

  return dbName;
}

try {
  const dbName = getDatabaseName();
  console.log(dbName);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(errorMessage);
  process.exit(1);
}

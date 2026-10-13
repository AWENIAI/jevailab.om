import { describe, expect, test } from 'vitest';

import {
  buildD1MigrationArgs,
  getWranglerEntrypoint,
} from '../../scripts/d1-migration';

describe('D1 migration command arguments', () => {
  test('uses the configured database name for a remote migration', () => {
    expect(buildD1MigrationArgs('ai-image', '--remote')).toEqual([
      'd1',
      'migrations',
      'apply',
      'ai-image',
      '--remote',
    ]);
  });

  test('derives the Wrangler executable from its exported package file', () => {
    expect(
      getWranglerEntrypoint('D:/project/node_modules/wrangler/package.json')
    ).toBe('D:\\project\\node_modules\\wrangler\\bin\\wrangler.js');
  });
});

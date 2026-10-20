import * as authSchema from './auth.schema';
import * as appSchema from './app.schema';
import * as imageCreatorSchema from './image-creator.schema';
import * as miniprogramSchema from './miniprogram.schema';
import * as videoCreatorSchema from './video-creator.schema';

/**
 * Re-export all tables so drizzle-kit can discover them when reading this file.
 * https://orm.drizzle.team/docs/drizzle-kit-generate
 */
export * from './auth.schema';
export * from './app.schema';
export * from './image-creator.schema';
export * from './miniprogram.schema';
export * from './video-creator.schema';

export const schema = {
  ...authSchema,
  ...appSchema,
  ...imageCreatorSchema,
  ...miniprogramSchema,
  ...videoCreatorSchema,
} as const;

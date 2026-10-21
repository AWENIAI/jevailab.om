import { readdir, readFile } from 'node:fs/promises';

const PUBLIC_LOCALES = ['en', 'zh'] as const;
const JSON_MESSAGE_KEYS = [
  'auth_error_codes',
  'pricing_plans_free_features',
  'pricing_plans_free_limits',
  'pricing_plans_lifetime_features',
  'pricing_plans_lifetime_limits',
  'pricing_plans_pro_features',
  'pricing_plans_pro_limits',
] as const;

async function readMessages(locale: string) {
  const raw = await readFile(`project.inlang/messages/${locale}.json`, 'utf8');
  return JSON.parse(raw) as Record<string, string>;
}

const localeFiles = (await readdir('project.inlang/messages'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -5))
  .sort();
const locales = PUBLIC_LOCALES.filter((locale) => localeFiles.includes(locale));
const missingLocaleFiles = PUBLIC_LOCALES.filter(
  (locale) => !localeFiles.includes(locale)
);

if (missingLocaleFiles.length > 0) {
  throw new Error(
    `Missing public locale files: ${missingLocaleFiles.join(', ')}`
  );
}
const messagesByLocale = Object.fromEntries(
  await Promise.all(
    locales.map(async (locale) => [locale, await readMessages(locale)] as const)
  )
) as Record<string, Record<string, string>>;
const base = messagesByLocale.en;
const baseKeys = Object.keys(base).sort();
const missingKeys = Object.fromEntries(
  locales
    .filter((locale) => locale !== 'en')
    .map((locale) => [
      locale,
      baseKeys.filter((key) => !(key in messagesByLocale[locale])),
    ])
    .filter(([, keys]) => (keys as string[]).length > 0)
);
const extraKeys = Object.fromEntries(
  locales
    .filter((locale) => locale !== 'en')
    .map((locale) => [
      locale,
      Object.keys(messagesByLocale[locale]).filter((key) => !(key in base)),
    ])
    .filter(([, keys]) => (keys as string[]).length > 0)
);
const emptyValues = Object.entries(messagesByLocale).flatMap(
  ([locale, messages]) =>
    baseKeys
      .filter((key) => messages[key] === '')
      .map((key) => `${locale}.${key}`)
);

for (const key of JSON_MESSAGE_KEYS) {
  for (const [locale, messages] of Object.entries(messagesByLocale)) {
    try {
      JSON.parse(messages[key] ?? '');
    } catch {
      throw new Error(`${locale}.${key} is not valid JSON`);
    }
  }
}

if (
  Object.keys(missingKeys).length ||
  Object.keys(extraKeys).length ||
  emptyValues.length
) {
  console.error(
    JSON.stringify({ missingKeys, extraKeys, emptyValues }, null, 2)
  );
  process.exit(1);
}

console.log(
  `Locale keys OK (${locales.length} locales, ${baseKeys.length} keys)`
);

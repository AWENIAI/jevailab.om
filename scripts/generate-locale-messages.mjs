import { readFile, writeFile } from 'node:fs/promises';
import { request } from 'node:https';

const TARGET_LOCALES = ['hi', 'es', 'ar', 'fr', 'de', 'ja', 'ko'];
const MESSAGE_DIR = 'project.inlang/messages';
const JSON_MESSAGE_KEYS = new Set([
  'auth_error_codes',
  'pricing_plans_free_features',
  'pricing_plans_free_limits',
  'pricing_plans_lifetime_features',
  'pricing_plans_lifetime_limits',
  'pricing_plans_pro_features',
  'pricing_plans_pro_limits',
]);

const source = JSON.parse(await readFile(`${MESSAGE_DIR}/en.json`, 'utf8'));

function protectPlaceholders(value) {
  const placeholders = [];
  const protectedValue = value.replace(/\{[A-Za-z0-9_]+\}/g, (placeholder) => {
    const token = `ZXQPH${placeholders.length}QXZ`;
    placeholders.push([token, placeholder]);
    return token;
  });
  return { protectedValue, placeholders };
}

function restorePlaceholders(value, placeholders) {
  let restored = value;
  for (const [token, placeholder] of placeholders) {
    restored = restored.replaceAll(token, placeholder);
  }
  return restored;
}

function requestTranslation(values, locale) {
  const params = new URLSearchParams({
    client: 'dict-chrome-ex',
    sl: 'en',
    tl: locale,
  });
  for (const value of values) params.append('q', value);

  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: 'clients5.google.com',
        path: `/translate_a/t?${params.toString()}`,
        method: 'GET',
        timeout: 60_000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            const translated = JSON.parse(body);
            if (
              !Array.isArray(translated) ||
              translated.length !== values.length ||
              translated.some((value) => typeof value !== 'string')
            ) {
              throw new Error(`Unexpected response: ${body.slice(0, 200)}`);
            }
            resolve(translated);
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('Translation timed out')));
    req.on('error', reject);
    req.end();
  });
}

async function withRetry(task, attempts = 8) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

async function translateTexts(values, locale) {
  const translations = [];
  for (let index = 0; index < values.length; index += 20) {
    const chunk = values.slice(index, index + 20);
    const translated = await withRetry(() => requestTranslation(chunk, locale));
    translations.push(...translated);
    process.stdout.write(
      `\r${locale}: ${Math.min(index + chunk.length, values.length)}/${values.length}`
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  process.stdout.write('\n');
  return translations;
}

async function translateJsonValue(value, locale) {
  const parsed = JSON.parse(value);
  if (Array.isArray(parsed) && parsed.every(Array.isArray)) {
    const keys = parsed.map(([key]) => key);
    const translated = await translateTexts(
      parsed.map(([, text]) => text),
      locale
    );
    return JSON.stringify(translated.map((text, index) => [keys[index], text]));
  }
  if (
    Array.isArray(parsed) &&
    parsed.every((item) => typeof item === 'string')
  ) {
    return JSON.stringify(await translateTexts(parsed, locale));
  }
  throw new Error('Unsupported JSON message shape');
}

async function translateLocale(locale) {
  const entries = Object.entries(source);
  const output = {};
  const pending = [];

  for (const [key, value] of entries) {
    if (JSON_MESSAGE_KEYS.has(key)) {
      output[key] = await translateJsonValue(value, locale);
    } else {
      const { protectedValue, placeholders } = protectPlaceholders(value);
      pending.push({ key, protectedValue, placeholders });
    }
  }

  const translations = await translateTexts(
    pending.map(({ protectedValue }) => protectedValue),
    locale
  );
  pending.forEach(({ key, placeholders }, index) => {
    output[key] = restorePlaceholders(translations[index], placeholders);
  });

  const sorted = Object.fromEntries(
    Object.entries(output).sort(([a], [b]) => a.localeCompare(b, 'en'))
  );
  await writeFile(
    `${MESSAGE_DIR}/${locale}.json`,
    `${JSON.stringify(sorted, null, 2)}\n`
  );
}

for (const locale of TARGET_LOCALES) {
  await translateLocale(locale);
}

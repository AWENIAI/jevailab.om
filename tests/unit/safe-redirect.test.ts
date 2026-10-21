import { describe, expect, it } from 'vitest';
import { getSafeInternalRedirect } from '@/lib/safe-redirect';

describe('getSafeInternalRedirect', () => {
  it.each([
    '/',
    '/launch-pricing',
    '/en/launch-pricing?plan=pro#plans',
    '/auth/login?callbackUrl=%2Flaunch-pricing',
  ])('keeps same-origin absolute path %s', (value) => {
    expect(getSafeInternalRedirect(value)).toBe(value);
  });

  it.each([
    undefined,
    null,
    '',
    'launch-pricing',
    '//evil.example',
    '///evil.example',
    'https://evil.example',
    'javascript:alert(1)',
  ])('rejects unsafe redirect %s', (value) => {
    expect(getSafeInternalRedirect(value)).toBeUndefined();
  });
});

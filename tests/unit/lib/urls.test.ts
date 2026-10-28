import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientEnv } from '@/env/client';
import { getBaseUrl } from '@/lib/urls';

const originalBaseUrl = clientEnv.VITE_BASE_URL;

afterEach(() => {
  clientEnv.VITE_BASE_URL = originalBaseUrl;
  vi.unstubAllEnvs();
});

describe('getBaseUrl', () => {
  it('uses the verified public origin for production SEO when the build falls back to localhost', () => {
    clientEnv.VITE_BASE_URL = 'http://localhost:3000';
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);

    expect(getBaseUrl()).toBe('https://jevailab.com');
  });

  it('keeps localhost for local development', () => {
    clientEnv.VITE_BASE_URL = 'http://localhost:3000';
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);

    expect(getBaseUrl()).toBe('http://localhost:3000');
  });
});

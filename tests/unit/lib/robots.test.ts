import { describe, expect, it } from 'vitest';
import { buildRobotsTxt, getRobotsBaseUrl } from '@/lib/robots';

describe('robots.txt', () => {
  it('explicitly allows AI search crawlers before the catch-all rule', () => {
    const robots = buildRobotsTxt('https://example.com', ['/auth']);

    expect(robots.indexOf('User-agent: GPTBot')).toBeLessThan(
      robots.indexOf('User-agent: *')
    );
    for (const crawler of [
      'GPTBot',
      'OAI-SearchBot',
      'ChatGPT-User',
      'PerplexityBot',
      'ClaudeBot',
      'Google-Extended',
    ]) {
      expect(robots).toContain(`User-agent: ${crawler}\nAllow: /`);
    }
    expect(robots).toContain('Disallow: /auth');
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('uses the request origin instead of a build-time localhost URL', () => {
    expect(
      getRobotsBaseUrl(
        'https://jevailab.com/robots.txt',
        'http://localhost:3000'
      )
    ).toBe('https://jevailab.com');
  });

  it('keeps the configured public origin for local requests', () => {
    expect(
      getRobotsBaseUrl('http://localhost:3000/robots.txt', 'https://jevailab.com')
    ).toBe('https://jevailab.com');
  });
});

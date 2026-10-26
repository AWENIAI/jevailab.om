import { describe, expect, it } from 'vitest';
import { buildRobotsTxt } from '@/lib/robots';

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
});

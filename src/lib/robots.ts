const AI_SEARCH_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'Google-Extended',
] as const;

export function getRobotsBaseUrl(requestUrl: string, configuredBaseUrl: string) {
  const configured = configuredBaseUrl.replace(/\/$/, '');

  try {
    const requestOrigin = new URL(requestUrl).origin;
    const isLoopback = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
      requestOrigin
    );

    return isLoopback ? configured : requestOrigin;
  } catch {
    return configured;
  }
}

export function buildRobotsTxt(
  baseUrl: string,
  disallowPaths: readonly string[]
) {
  const aiCrawlerRules = AI_SEARCH_CRAWLERS.map(
    (crawler) => `User-agent: ${crawler}\nAllow: /`
  ).join('\n');
  const disallowRules = disallowPaths
    .map((path) => `Disallow: ${path}`)
    .join('\n');

  return `${aiCrawlerRules}\n\nUser-agent: *\nAllow: /${
    disallowRules ? `\n${disallowRules}` : ''
  }\n\nSitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml`;
}

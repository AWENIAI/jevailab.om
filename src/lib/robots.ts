const AI_SEARCH_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'Google-Extended',
] as const;

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

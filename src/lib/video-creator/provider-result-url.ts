function isIpv4Literal(host: string) {
  const segments = host.split('.');
  return (
    segments.length === 4 &&
    segments.every((segment) => {
      const value = Number(segment);
      return /^\d+$/.test(segment) && value >= 0 && value <= 255;
    })
  );
}

/**
 * Provider output is fetched by our Worker before it reaches private storage.
 * Only allow domain-based public HTTPS URLs; IP literals are deliberately
 * rejected to avoid link-local and private-network fetches.
 */
export function isSafeVideoProviderResultUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      host.length > 0 &&
      !isIpv4Literal(host) &&
      !host.includes(':') &&
      host !== 'localhost' &&
      !host.endsWith('.localhost') &&
      !host.endsWith('.local')
    );
  } catch {
    return false;
  }
}

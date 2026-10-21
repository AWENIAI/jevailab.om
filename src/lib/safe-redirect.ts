/**
 * Only same-origin absolute paths are valid post-login redirects.
 * Reject protocol-relative URLs (`//example.com`) and any absolute URL.
 */
export function getSafeInternalRedirect(
  value: string | null | undefined
): string | undefined {
  if (!value?.startsWith('/') || value.startsWith('//')) {
    return undefined;
  }

  try {
    const url = new URL(value, 'https://internal.invalid');
    return url.origin === 'https://internal.invalid'
      ? `${url.pathname}${url.search}${url.hash}`
      : undefined;
  } catch {
    return undefined;
  }
}

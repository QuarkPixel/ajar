/**
 * Intention rules and URL matching.
 *
 * A rule is a site pattern plus the phrase the user has to type before the
 * site opens. Patterns are deliberately simple: a hostname, optionally with a
 * path prefix. Sub-domains are included, `www.` and the scheme are ignored.
 */

export interface Rule {
  id: string;
  url: string;
  phrase: string;
}

export interface Pattern {
  host: string;
  path: string;
}

const HOST_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const stripHash = (value: string): string => {
  const at = value.indexOf('#');
  return at === -1 ? value : value.slice(0, at);
};

const stripQuery = (value: string): string => {
  const at = value.indexOf('?');
  return at === -1 ? value : value.slice(0, at);
};

const trimSlashes = (value: string): string => value.replace(/\/+$/, '');

/** Parses a user-entered site pattern such as `x.com` or `reddit.com/r/all`. */
export function parsePattern(raw: string): Pattern | null {
  let value = stripQuery(stripHash(raw.trim().toLowerCase()));
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.replace(/^www\./, '');

  const slash = value.indexOf('/');
  let host = slash === -1 ? value : value.slice(0, slash);
  const path = slash === -1 ? '' : trimSlashes(value.slice(slash));

  host = host.replace(/:\d+$/, '');
  if (!host) return null;
  if (host !== 'localhost' && !HOST_RE.test(host)) return null;

  return { host, path };
}

export function isValidPattern(raw: string): boolean {
  return parsePattern(raw) !== null;
}

/** Parses a live navigation URL into the same shape. */
export function parseTarget(url: string): Pattern | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!host) return null;

  return { host, path: trimSlashes(parsed.pathname.toLowerCase()) };
}

function matches(target: Pattern, pattern: Pattern): boolean {
  const hostOk =
    target.host === pattern.host || target.host.endsWith(`.${pattern.host}`);
  if (!hostOk) return false;
  if (!pattern.path) return true;

  return (
    target.path === pattern.path || target.path.startsWith(`${pattern.path}/`)
  );
}

/**
 * Returns the id of the most specific rule matching this URL, or null.
 * Longer path prefixes win, so `x.com/messages` can sit next to `x.com`.
 */
export function matchRuleId(url: string, rules: readonly Rule[]): string | null {
  const target = parseTarget(url);
  if (!target) return null;

  let bestId: string | null = null;
  let bestLength = -1;

  for (const rule of rules) {
    if (!rule.phrase.trim()) continue;
    const pattern = parsePattern(rule.url);
    if (!pattern) continue;
    if (!matches(target, pattern)) continue;
    if (pattern.path.length > bestLength) {
      bestLength = pattern.path.length;
      bestId = rule.id;
    }
  }

  return bestId;
}

/**
 * Background service worker.
 *
 * Watches top level navigations. When a URL matches a rule and the tab has not
 * already been granted access to that rule, the navigation is swapped for the
 * intention page. The page asks for a grant once the phrase has been typed.
 */

import { matchRuleId } from './lib/rules';
import { getRules } from './lib/store';

const INTENTION_PAGE = 'intention/index.html';
const GRANTS_KEY = 'grants';
const REDIRECT_WINDOW_MS = 3000;
const MAX_REDIRECT_ATTEMPTS = 2;

type Grants = Record<string, string>;

/**
 * `tabId -> ruleId` for tabs that are currently allowed inside a rule's scope.
 * Survives service worker restarts by living in session storage.
 */
let memoryGrants: Grants = {};

const sessionArea = (): chrome.storage.StorageArea | undefined => {
  try {
    return chrome.storage.session;
  } catch {
    return undefined;
  }
};

async function readGrants(): Promise<Grants> {
  const area = sessionArea();
  if (!area) return { ...memoryGrants };
  try {
    const stored = await area.get(GRANTS_KEY);
    const value = stored[GRANTS_KEY];
    return value && typeof value === 'object' ? (value as Grants) : {};
  } catch {
    return { ...memoryGrants };
  }
}

async function writeGrants(grants: Grants): Promise<void> {
  memoryGrants = grants;
  const area = sessionArea();
  if (!area) return;
  try {
    await area.set({ [GRANTS_KEY]: grants });
  } catch {
    /* session storage is best effort */
  }
}

async function grant(tabId: number, ruleId: string): Promise<void> {
  const grants = await readGrants();
  grants[String(tabId)] = ruleId;
  await writeGrants(grants);
}

async function revoke(tabId: number): Promise<void> {
  const grants = await readGrants();
  const key = String(tabId);
  if (!(key in grants)) return;
  delete grants[key];
  await writeGrants(grants);
}

/** Stops a single URL from being redirected over and over by a stubborn page. */
const redirectAttempts = new Map<
  number,
  { url: string; at: number; attempts: number }
>();

function claimRedirect(tabId: number, url: string): boolean {
  const now = Date.now();
  const previous = redirectAttempts.get(tabId);

  if (previous && previous.url === url && now - previous.at < REDIRECT_WINDOW_MS) {
    if (previous.attempts >= MAX_REDIRECT_ATTEMPTS) return false;
    previous.attempts += 1;
    previous.at = now;
    return true;
  }

  redirectAttempts.set(tabId, { url, at: now, attempts: 1 });
  return true;
}

const isWebUrl = (url: string): boolean => /^https?:\/\//i.test(url);

async function redirectToPrompt(
  tabId: number,
  ruleId: string,
  targetUrl: string
): Promise<void> {
  if (!claimRedirect(tabId, targetUrl)) return;
  await revoke(tabId);

  const url = new URL(chrome.runtime.getURL(INTENTION_PAGE));
  url.searchParams.set('rule', ruleId);
  url.searchParams.set('target', targetUrl);

  try {
    await chrome.tabs.update(tabId, { url: url.toString() });
  } catch {
    /* tab is gone, nothing to do */
  }
}

async function inspect(tabId: number, url: string): Promise<void> {
  if (!isWebUrl(url)) return;

  const rules = await getRules();
  if (!rules.length) return;

  const ruleId = matchRuleId(url, rules);
  const grants = await readGrants();
  const granted = grants[String(tabId)];

  if (!ruleId) {
    if (granted) await revoke(tabId);
    return;
  }

  // Already inside this scope — no need to ask again for the same visit.
  if (granted === ruleId) return;

  await redirectToPrompt(tabId, ruleId, url);
}

chrome.webNavigation.onBeforeNavigate.addListener(details => {
  if (details.frameId !== 0) return;
  void inspect(details.tabId, details.url);
});

// Catches client side redirects and history changes that never produce a
// before-navigate event.
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
  if (details.frameId !== 0) return;
  void inspect(details.tabId, details.url);
});

chrome.webNavigation.onCommitted.addListener(details => {
  if (details.frameId !== 0) return;
  void inspect(details.tabId, details.url);
});

chrome.tabs.onRemoved.addListener(tabId => {
  redirectAttempts.delete(tabId);
  void revoke(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const data = message as { type?: string; ruleId?: string } | undefined;

  if (data?.type === 'grant' && typeof data.ruleId === 'string') {
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      sendResponse({ ok: false });
      return false;
    }
    grant(tabId, data.ruleId).then(
      () => sendResponse({ ok: true }),
      () => sendResponse({ ok: false })
    );
    return true;
  }

  return false;
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') void chrome.runtime.openOptionsPage();
});

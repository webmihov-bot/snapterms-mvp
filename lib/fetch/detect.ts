export type BlockReason = "http_status" | "interstitial" | "too_short" | "js_shell" | "not_html" | "network" | "timeout" | "too_large" | "unsafe_host";

const INTERSTITIAL = [
  /just a moment\.\.\./i,
  /attention required!? \| cloudflare/i,
  /cf-browser-verification|cf-challenge|\/cdn-cgi\/challenge-platform/i,
  /checking (if the site connection is secure|your browser)/i,
  /verify (you are|that you are) (a )?human/i,
  /enable javascript and cookies to continue/i,
  /access denied|request blocked|you have been blocked/i,
  /ddos protection by|incapsula incident|perimeterx|px-captcha|datadome/i,
  /are you a robot|captcha/i,
];

export const MIN_VISIBLE_CHARS = 400;
export const JS_SHELL_MAX_CHARS = 900;

export function blockedStatus(status: number): boolean {
  return status === 403 || status === 429 || status === 503 || status === 401 || status === 451;
}

/** Decides whether a fetched page is usable. Order matters: shell before short. */
export function classify(html: string, visibleText: string, scriptCount: number): BlockReason | null {
  const head = html.slice(0, 20_000);
  if (visibleText.length < 2_000 && INTERSTITIAL.some((re) => re.test(head))) return "interstitial";
  if (visibleText.length < JS_SHELL_MAX_CHARS && scriptCount > 0) return "js_shell";
  if (visibleText.length < MIN_VISIBLE_CHARS) return "too_short";
  return null;
}

export function classifyText(text: string): BlockReason | null {
  return text.length < MIN_VISIBLE_CHARS ? "too_short" : null;
}

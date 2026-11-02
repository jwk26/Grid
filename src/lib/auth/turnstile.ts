// Cloudflare Turnstile (SPEC §Account entry, step 2). The widget is invisible unless Cloudflare
// needs an interactive check; one widget lives for the page and every guest-entry attempt asks it
// for a fresh token. The script is loaded only when a guest must be created.

export type TurnstileRenderOptions = {
  sitekey: string;
  appearance: "interaction-only";
  callback: (token: string) => void;
  "error-callback"?: (code?: string) => boolean | void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  "before-interactive-callback"?: () => void;
  "after-interactive-callback"?: () => void;
};

export type TurnstileApi = {
  render: (host: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

export type SolveHandlers = {
  /** Cloudflare needs the visitor: the widget must be visible. */
  onInteractive: () => void;
  /** The interactive check is over. */
  onInteractiveEnd: () => void;
};

export type CaptchaProvider = { solve: (handlers: SolveHandlers) => Promise<string> };

/** `load`: the script did not load; `widget`: the widget errored or timed out. */
export class CaptchaError extends Error {
  constructor(readonly kind: "load" | "widget", message: string) {
    super(message);
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

export function loadTurnstileApi(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    script.onerror = () => {
      script.remove();
      reject(new Error("turnstile script failed"));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    // A later attempt (Retry) loads the script again.
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

export type TurnstileOptions = {
  siteKey: string;
  getHost: () => HTMLElement;
  loadApi?: () => Promise<TurnstileApi>;
};

export function createTurnstile({ siteKey, getHost, loadApi = loadTurnstileApi }: TurnstileOptions): CaptchaProvider {
  let widgetId: string | null = null;
  // The attempt the widget's callbacks currently answer.
  let current: { resolve: (token: string) => void; reject: (error: CaptchaError) => void; handlers: SolveHandlers } | null =
    null;

  const fail = (message: string) => {
    const attempt = current;
    current = null;
    attempt?.reject(new CaptchaError("widget", message));
  };

  return {
    async solve(handlers) {
      let api: TurnstileApi;
      try {
        api = await loadApi();
      } catch (error) {
        throw new CaptchaError("load", error instanceof Error ? error.message : "load failed");
      }
      return new Promise<string>((resolve, reject) => {
        current = { resolve, reject, handlers };
        if (widgetId !== null) {
          api.reset(widgetId);
          return;
        }
        widgetId = api.render(getHost(), {
          sitekey: siteKey,
          appearance: "interaction-only",
          callback: (token) => {
            const attempt = current;
            current = null;
            attempt?.resolve(token);
          },
          "error-callback": (code) => {
            fail(`turnstile error ${code ?? ""}`.trim());
            // Handled here: Cloudflare need not log it to the console.
            return true;
          },
          "timeout-callback": () => fail("turnstile timeout"),
          "before-interactive-callback": () => current?.handlers.onInteractive(),
          "after-interactive-callback": () => current?.handlers.onInteractiveEnd(),
        });
      });
    },
  };
}

// The widget's one host element, mounted by the app-level frame and never moved: moving an iframe
// reloads it and would drop a challenge in progress.
let host: HTMLElement | null = null;

export function setTurnstileHost(element: HTMLElement | null): void {
  host = element;
}

export function getTurnstileHost(): HTMLElement {
  if (!host) {
    host = document.createElement("div");
    document.body.appendChild(host);
  }
  return host;
}

export function getAppTurnstile(): CaptchaProvider | null {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return siteKey ? createTurnstile({ siteKey, getHost: getTurnstileHost }) : null;
}

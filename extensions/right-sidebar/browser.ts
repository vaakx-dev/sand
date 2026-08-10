import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Webview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { derive, div, effect, form, input, onRaf, onResize, resizeObserver, show, sig, button } from "@vaakx-dev/vrui";

import type { BrowserTab } from "./models.ts";
import type { RightState } from "./state.ts";

const DEFAULT_URL = "https://example.com";

interface BrowserNavigation {
  label: string;
  url: string;
}

export function browserView(state: RightState): HTMLElement {
  const tab: BrowserTab = {
    input: sig(DEFAULT_URL),
    request: sig({ id: 0, url: DEFAULT_URL }),
  };
  return div(
    { class: "browser-view" },
    form(
      {
        class: "browser-bar",
        onSubmit: (event) => {
          event.preventDefault();
          const url = normalizeUrl(tab.input.get());
          if (!url) return;
          tab.input.set(url);
          tab.request.update((request) => ({ id: request.id + 1, url }));
        },
      },
      input({ class: "browser-address", bindValue: tab.input, "aria-label": "Browser address", spellcheck: false }),
      button({ class: "secondary-button", type: "submit" }, "Go"),
    ),
    nativeBrowser(state, tab),
  );
}

function nativeBrowser(state: RightState, tab: BrowserTab): HTMLElement {
  const status = sig("Loading browser...");
  const obscured = derive(() => !state.open.get() || state.addOpen.get());
  return div(
    { class: "browser-native-host", onMount: (element) => mountBrowser(element, tab, status, obscured) },
    show(status.map(Boolean), () => div({ class: "browser-status" }, status)),
  );
}

function mountBrowser(
  element: HTMLElement,
  tab: BrowserTab,
  status: ReturnType<typeof sig<string>>,
  obscured: ReturnType<typeof derive<boolean>>,
): () => void {
  let browser: Webview | null = null;
  let stopNavigationEvents: UnlistenFn | null = null;
  let disposed = false;
  let generation = 0;
  const syncBounds = async (target = browser) => {
    if (!target || target !== browser || disposed) return;
    const bounds = browserBounds(element);
    await Promise.all([
      target.setPosition(new LogicalPosition(bounds.x, bounds.y)),
      target.setSize(new LogicalSize(bounds.width, bounds.height)),
    ]).catch(() => undefined);
  };
  const setVisibility = async (target = browser) => {
    if (!target || target !== browser || disposed) return;
    await (obscured.get() ? target.hide() : target.show()).catch(() => undefined);
  };
  const navigate = async (url: string) => {
    const currentGeneration = ++generation;
    const previous = browser;
    browser = null;
    if (previous) await previous.close().catch(() => undefined);
    if (disposed || currentGeneration !== generation) return;
    const next = new Webview(getCurrentWindow(), `sand-browser-${crypto.randomUUID()}`, {
      url,
      ...browserBounds(element),
      focus: false,
    });
    browser = next;
    status.set("Loading browser...");
    void next.once("tauri://created", () => {
      if (next !== browser || disposed) return;
      status.set("");
      void syncBounds(next);
      void setVisibility(next);
    });
    void next.once<string>("tauri://error", (event) => {
      if (next !== browser || disposed) return;
      browser = null;
      status.set(`Browser could not open: ${String(event.payload)}`);
    });
  };
  void listen<BrowserNavigation>("sand://browser-navigated", ({ payload }) => {
    if (payload.label === browser?.label && !disposed) tab.input.set(payload.url);
  }).then((unlisten) => {
    if (disposed) unlisten();
    else stopNavigationEvents = unlisten;
  });
  const stopNavigation = effect(() => {
    const request = tab.request.get();
    return onRaf(() => void navigate(request.url));
  });
  const stopVisibility = effect(() => {
    obscured.get();
    void setVisibility();
  });
  const observer = resizeObserver(element, () => void syncBounds());
  const stopResize = onResize(element, () => void syncBounds());
  return () => {
    disposed = true;
    generation += 1;
    stopNavigation();
    stopVisibility();
    stopResize();
    stopNavigationEvents?.();
    observer.disconnect();
    const current = browser;
    browser = null;
    if (current) void current.close().catch(() => undefined);
  };
}

function browserBounds(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
  };
}

function normalizeUrl(value: string): string {
  const url = value.trim();
  if (!url) return "";
  return /^https?:\/\//iu.test(url) ? url : `https://${url}`;
}

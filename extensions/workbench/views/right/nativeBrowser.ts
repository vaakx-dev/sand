import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Webview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  derive,
  div,
  effect,
  onRaf,
  onResize,
  resizeObserver,
  show,
  sig,
} from "@vaakx-dev/vrui";

import type { WorkbenchState } from "../../state.ts";
import type { BrowserTab } from "../../models.ts";
import { updateBrowserLocation } from "../../panel.ts";

interface BrowserNavigation {
  label: string;
  url: string;
}

export function nativeBrowser(state: WorkbenchState, tab: BrowserTab): HTMLElement {
  const status = sig("Loading browser…");
  const obscured = derive(() =>
    !state.rightOpen.get()
    || state.rightAddOpen.get()
    || state.modelPickerOpen.get()
    || state.traitsOpen.get()
    || state.openMenuOpen.get()
    || state.projectMenuOpen.get()
    || state.projectPickerOpen.get()
    || state.projectSourceOpen.get()
    || Boolean(state.threadMenu.get())
    || Boolean(state.threadRename.get())
  );

  return div(
    {
      class: "browser-native-host",
      onMount: (element) => mountBrowser(element, tab, status, obscured),
    },
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

    const bounds = browserBounds(element);
    status.set("Loading browser…");
    const next = new Webview(
      getCurrentWindow(),
      `sand-browser-${crypto.randomUUID()}`,
      {
        url,
        ...bounds,
        focus: false,
      },
    );
    browser = next;
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
    if (payload.label !== browser?.label || disposed) return;
    updateBrowserLocation(tab, payload.url);
  }).then((unlisten) => {
    if (disposed) {
      unlisten();
      return;
    }
    stopNavigationEvents = unlisten;
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

function browserBounds(element: HTMLElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const bounds = element.getBoundingClientRect();
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
  };
}

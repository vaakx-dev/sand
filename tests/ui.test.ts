import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const manifestPaths = [
  "extensions/theme-sand/sand.extension.json",
  "extensions/files/sand.extension.json",
  "extensions/right-sidebar/sand.extension.json",
  "extensions/terminal/sand.extension.json",
  "extensions/tool-plan/sand.extension.json",
].map((path) => resolve(process.cwd(), path));
const browserPath = resolve(process.cwd(), "extensions/right-sidebar/browser.ts");
const surfacesPath = resolve(process.cwd(), "extensions/right-sidebar/ui.ts");
const planPath = resolve(process.cwd(), "extensions/tool-plan/ui.ts");
const capabilityPath = resolve(process.cwd(), "src-tauri/capabilities/main.json");
const cargoPath = resolve(process.cwd(), "src-tauri/Cargo.toml");
const rustPath = resolve(process.cwd(), "src-tauri/src/lib.rs");
const threadsPath = resolve(process.cwd(), "extensions/workbench/views/sidebar/threads.ts");
const pickerPath = resolve(process.cwd(), "extensions/workbench/views/projects/picker.ts");

describe("Sand UI contracts", () => {
  test("uses named stacking layers", async () => {
    const theme = await readTheme();

    expect(theme).not.toMatch(/z-index:\s*-?\d/u);
    expect(theme).toContain("--z-chrome:");
    expect(theme).toContain("--z-popover:");
    expect(theme).toContain("--z-modal:");
    expect(theme).toContain("--z-window:");
  });

  test("keeps interactions immediate", async () => {
    const theme = await readTheme();

    expect(theme).not.toMatch(/\b(?:animation|transition)\s*:/u);
    expect(theme).not.toContain("@keyframes");
  });

  test("keeps disabled controls out of hover states", async () => {
    const theme = await readTheme();
    const controls = [
      "sidebar-trigger",
      "icon-button",
      "open-menu-row",
      "right-add-row",
      "surface-card",
      "terminal-action",
      "top-action",
      "composer-chip",
      "send-button",
    ];

    for (const control of controls) {
      expect(theme).not.toContain(`.${control}:hover`);
    }
  });

  test("keeps icon controls fixed and selected states visible", async () => {
    const theme = await readTheme();

    expect(theme).toContain("button > .vrui-icon");
    expect(theme).toContain("min-width: var(--control-height)");
    expect(theme).toContain("max-width: var(--control-height)");
    expect(theme).toContain(".icon-button.active");
    expect(theme).toContain("background: var(--control-selected-bg)");
  });

  test("anchors the surface menu in the fixed panel action strip", async () => {
    const theme = await readTheme();

    expect(theme).toContain("grid-template-columns: minmax(0, 1fr) 28px 112px");
    expect(theme).toContain("grid-template-columns: repeat(4, 28px)");
    expect(theme).toContain(".right-add-menu { position: absolute;");
    expect(theme).toContain("right: 0;");
    expect(theme).toContain(".right-panel-host.open) .top-actions { padding-right: 8px;");
    expect(theme).toContain(".right-panel-host.open) .top-panel-controls { display: none;");
  });

  test("uses a native browser surface instead of a blocked iframe", async () => {
    const [browser, capability, cargo, rust, surfaces, plan] = await Promise.all([
      readFile(browserPath, "utf8"),
      readFile(capabilityPath, "utf8"),
      readFile(cargoPath, "utf8"),
      readFile(rustPath, "utf8"),
      readFile(surfacesPath, "utf8"),
      readFile(planPath, "utf8"),
    ]);

    expect(browser).not.toContain("iframe");
    expect(browser).toContain("native_browser(state, tab)");
    expect(browser).toContain("new Webview(");
    expect(browser).toContain("resize_observer(");
    expect(browser).toContain('listen<BrowserNavigation>("sand://browser-navigated"');
    expect(capability).toContain("core:webview:allow-create-webview");
    expect(capability).toContain("core:webview:allow-webview-close");
    expect(capability).toContain("core:event:allow-listen");
    expect(cargo).toContain('features = ["unstable"]');
    expect(rust).toContain(".on_page_load(|webview, payload|");
    expect(rust).toContain('"sand://browser-navigated"');
    expect(surfaces).not.toContain('id: "plan"');
    expect(plan).toContain('id: "plan"');
  });

  test("keeps provider model catalogs on one scroll axis", async () => {
    const theme = await readTheme();

    expect(theme).toContain(".settings-page.panel-scroll { overflow-x: hidden; overflow-y: auto;");
    expect(theme).toContain(".provider-model-list { width: 100%; max-height: 270px; overflow-x: hidden; overflow-y: auto;");
    expect(theme).toContain("grid-template-columns: minmax(0, 1fr) auto;");
  });

  test("routes new threads through project selection and exposes Snoozed separately", async () => {
    const [threads, picker] = await Promise.all([
      readFile(threadsPath, "utf8"),
      readFile(pickerPath, "utf8"),
    ]);

    expect(threads).toContain('open_picker("newThread")');
    expect(threads).toContain('label: "Snoozed"');
    expect(threads).not.toContain("controller.agent.newThread()");
    expect(picker).toContain("controller.projects.select(project.path)");
  });
});

async function readTheme(): Promise<string> {
  const styles = await Promise.all(manifestPaths.flatMap(async (manifestPath) => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { styles?: string[] };
    const root = dirname(manifestPath);
    return Promise.all((manifest.styles ?? []).map((path) => readFile(resolve(root, path), "utf8")));
  }));
  return styles.flat().join("\n");
}

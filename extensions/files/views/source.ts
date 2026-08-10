import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { div, effect, onRaf } from "@vaakx-dev/vrui";

import type { FilesController } from "../controller.ts";
import { languageFor, syntaxTheme } from "./languages.ts";
import type { FilesState } from "../state.ts";

const editorTheme = EditorView.theme({
  "&": {
    width: "100%",
    height: "100%",
    color: "var(--text)",
    backgroundColor: "var(--bg)",
    fontSize: "11.5px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--mono)",
    lineHeight: "1.6",
    overflow: "auto",
  },
  ".cm-content": {
    minHeight: "100%",
    padding: "12px 0 80px",
    caretColor: "var(--text)",
  },
  ".cm-line": { padding: "0 18px" },
  ".cm-gutters": {
    color: "var(--faint)",
    backgroundColor: "var(--bg)",
    borderRight: "1px solid var(--border)",
    paddingTop: "12px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "47px",
    padding: "0 10px 0 6px",
  },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--surface)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--editor-selection)",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--text)" },
  ".cm-panels": { color: "var(--text)", backgroundColor: "var(--surface-2)" },
  ".cm-searchMatch": { backgroundColor: "color-mix(in srgb, var(--warning) 35%, transparent)" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--accent-bg)" },
  ".cm-tooltip": { border: "1px solid var(--border-strong)", backgroundColor: "var(--surface-2)" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--control-selected-bg)" },
});

export function sourceEditor(
  controller: FilesController,
  state: FilesState,
  path: string,
): HTMLElement {
  return div({
    class: "file-code",
    onMount: (element) => mountEditor(element, controller, state, path),
  });
}

function mountEditor(
  element: HTMLElement,
  controller: FilesController,
  files: FilesState,
  path: string,
): () => void {
  let syncing = false;
  const content = currentContent(files, path);
  const view = new EditorView({
    parent: element,
    state: EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        languageFor(path),
        syntaxTheme,
        editorTheme,
        EditorState.tabSize.of(2),
        EditorView.contentAttributes.of({ "aria-label": `Edit ${path}`, spellcheck: "false" }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncing) controller.update(path, update.state.doc.toString());
        }),
        keymap.of([
          indentWithTab,
          {
            key: "Mod-s",
            preventDefault: true,
            run: () => {
              void controller.save();
              return true;
            },
          },
        ]),
      ],
    }),
  });
  const stopSync = effect(() => {
    const next = currentContent(files, path);
    const current = view.state.doc.toString();
    if (next === current) return;
    syncing = true;
    view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
    syncing = false;
  });
  const cancelFocus = onRaf(() => view.focus());
  return () => {
    cancelFocus();
    stopSync();
    view.destroy();
  };
}

function currentContent(state: FilesState, path: string): string {
  return state.tabs.get().find((file) => file.path === path)?.content ?? "";
}

import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags } from "@lezer/highlight";

const highlight = HighlightStyle.define([
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: "var(--muted)", fontStyle: "italic" },
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword], color: "var(--accent)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--text)" },
  { tag: [tags.typeName, tags.className, tags.namespace, tags.macroName, tags.tagName], color: "var(--warning)" },
  { tag: [tags.variableName, tags.definition(tags.variableName), tags.local(tags.variableName), tags.special(tags.variableName)], color: "var(--text)" },
  { tag: [tags.string, tags.docString, tags.character, tags.attributeValue, tags.special(tags.string), tags.regexp, tags.escape], color: "var(--success)" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom, tags.unit, tags.color], color: "var(--warning)" },
  { tag: [tags.propertyName, tags.attributeName, tags.labelName], color: "var(--accent)" },
  { tag: [tags.operator, tags.punctuation, tags.separator, tags.bracket], color: "var(--muted)" },
  { tag: [tags.meta, tags.documentMeta, tags.annotation, tags.processingInstruction], color: "var(--muted)" },
  { tag: [tags.heading, tags.strong], color: "var(--warning)", fontWeight: "650" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: [tags.link, tags.url], color: "var(--accent)", textDecoration: "underline" },
  { tag: tags.invalid, color: "var(--danger)", textDecoration: "underline wavy" },
]);

export const syntaxTheme = syntaxHighlighting(highlight);

export function languageFor(path: string): Extension {
  const name = path.split(/[\\/]/u).at(-1)?.toLocaleLowerCase() ?? "";
  const extension = name.includes(".") ? name.split(".").at(-1) ?? "" : "";

  switch (extension) {
    case "js":
    case "mjs":
    case "cjs": return javascript();
    case "jsx": return javascript({ jsx: true });
    case "ts":
    case "mts":
    case "cts": return javascript({ typescript: true });
    case "tsx": return javascript({ typescript: true, jsx: true });
    case "html":
    case "htm":
    case "vue":
    case "svelte": return html();
    case "css":
    case "scss":
    case "less": return css();
    case "json":
    case "jsonc": return json();
    case "md":
    case "mdx":
    case "markdown": return markdown();
    case "rs": return rust();
    case "py":
    case "pyw": return python();
    case "yaml":
    case "yml": return yaml();
    case "sql": return sql();
    case "c":
    case "h":
    case "cc":
    case "cpp":
    case "cxx":
    case "hpp": return cpp();
    case "java": return java();
    case "xml":
    case "svg": return xml();
    default: return [];
  }
}

import { a, div, el, h1, h2, h3, li, ol, p, strong, ul } from "@vaakx-dev/vrui";

export function markdown(content: string): HTMLElement {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: HTMLElement[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]!.startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      index += index < lines.length ? 1 : 0;
      blocks.push(el(
        "pre",
        { class: "markdown-code", "data-language": language || "text" },
        el("code", code.join("\n")),
      ));
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const children = inline(heading[2] ?? "");
      blocks.push(heading[1]!.length === 1 ? h1(...children) : heading[1]!.length === 2 ? h2(...children) : h3(...children));
      index += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: HTMLElement[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? "")) {
        items.push(li(...inline((lines[index] ?? "").replace(/^\s*[-*]\s+/, ""))));
        index += 1;
      }
      blocks.push(ul(...items));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: HTMLElement[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) {
        items.push(li(...inline((lines[index] ?? "").replace(/^\s*\d+\.\s+/, ""))));
        index += 1;
      }
      blocks.push(ol(...items));
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quote.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(el("blockquote", ...inline(quote.join("\n"))));
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length
      && Boolean(lines[index]?.trim())
      && !lines[index]!.startsWith("```")
      && !/^(#{1,3})\s+/.test(lines[index]!)
      && !/^\s*[-*]\s+/.test(lines[index]!)
      && !/^\s*\d+\.\s+/.test(lines[index]!)
      && !/^>\s?/.test(lines[index]!)
    ) {
      paragraph.push(lines[index] ?? "");
      index += 1;
    }
    blocks.push(p(...inline(paragraph.join("\n"))));
  }

  return div({ class: "message-content markdown" }, ...blocks);
}

function inline(value: string): Node[] {
  const nodes: Node[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  let offset = 0;
  for (const match of value.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > offset) nodes.push(document.createTextNode(value.slice(offset, start)));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(strong(token.slice(2, -2)));
    } else if (token.startsWith("`")) {
      nodes.push(el("code", { class: "markdown-inline-code" }, token.slice(1, -1)));
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (link) {
        nodes.push(a({ href: link[2], target: "_blank", rel: "noreferrer" }, link[1]));
      }
    }
    offset = start + token.length;
  }
  if (offset < value.length) nodes.push(document.createTextNode(value.slice(offset)));
  return nodes;
}

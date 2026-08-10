import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import {
  objectSchema,
  requiredString,
  type HostExtension,
  type JsonValue,
} from "@sand/extension-api";

interface Edit {
  oldText: string;
  newText: string;
}

const extension: HostExtension = {
  activate(context) {
    context.tools.register({
      definition: {
        name: "edit",
        description: "Edit one file with exact replacements. Every edits[].oldText must identify one unique, non-overlapping region of the original file.",
        parameters: objectSchema(
          {
            path: { type: "string", description: "Path to the file to edit" },
            edits: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  oldText: { type: "string", description: "Unique exact text to replace" },
                  newText: { type: "string", description: "Replacement text" },
                },
                required: ["oldText", "newText"],
                additionalProperties: false,
              },
            },
          },
          ["path", "edits"],
        ),
      },
      async execute(input) {
        const path = requiredString(input, "path");
        const edits = parseEdits(input.edits);
        const absolute = isAbsolute(path) ? resolve(path) : resolve(context.workspace, path);
        const original = await readFile(absolute, "utf8");
        const replacements = edits.map((edit) => locate(original, edit, path));
        const ordered = replacements.sort((left, right) => left.start - right.start);
        for (let index = 1; index < ordered.length; index += 1) {
          if (ordered[index]!.start < ordered[index - 1]!.end) {
            throw new Error(`edits overlap in ${path}`);
          }
        }
        let content = original;
        for (const item of ordered.toReversed()) {
          content = `${content.slice(0, item.start)}${item.newText}${content.slice(item.end)}`;
        }
        await writeFile(absolute, content, "utf8");
        context.events.emit("workspace.changed", { path });
        const firstLine = original.slice(0, ordered[0]!.start).split("\n").length;
        return `Successfully replaced ${ordered.length} block(s) in ${path}. First changed line: ${firstLine}.`;
      },
    });
  },
};

function locate(content: string, edit: Edit, path: string) {
  if (!edit.oldText) throw new Error(`oldText cannot be empty in ${path}`);
  const start = content.indexOf(edit.oldText);
  if (start < 0) throw new Error(`oldText was not found in ${path}`);
  if (content.indexOf(edit.oldText, start + edit.oldText.length) >= 0) {
    throw new Error(`oldText matches more than once in ${path}`);
  }
  return { start, end: start + edit.oldText.length, newText: edit.newText };
}

function parseEdits(value: JsonValue | undefined): Edit[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("edits must contain at least one replacement");
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("each edit must be an object");
    if (typeof item.oldText !== "string" || typeof item.newText !== "string") {
      throw new Error("each edit requires oldText and newText strings");
    }
    return { oldText: item.oldText, newText: item.newText };
  });
}

export default extension;

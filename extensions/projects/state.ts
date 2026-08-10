import { sig } from "@vaakx-dev/vrui";

import type { PickerIntent, Project } from "./api.ts";

export function createState() {
  return {
    root: sig(""),
    items: sig<Project[]>([]),
    menuOpen: sig(false),
    pickerOpen: sig(false),
    pickerIntent: sig<PickerIntent>("switch"),
    sourceOpen: sig(false),
    sourceView: sig<"sources" | "git">("sources"),
    query: sig(""),
    index: sig(0),
    sourceIndex: sig(0),
    cloneUrl: sig(""),
    error: sig(""),
  };
}

export type ProjectsState = ReturnType<typeof createState>;

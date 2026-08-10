export const commands = {
  list: "projects.list",
  pick: "projects.pick",
  add: "projects.add",
  clone: "projects.clone",
} as const;

export type PickerIntent = "switch" | "newThread";

export interface Project {
  name: string;
  path: string;
  updatedAt: string;
}

import type { ThreadChangeRequestState } from "@sand/extension-api";

export const commands = {
  status: "git.status",
  diff: "git.diff",
  initialize: "git.init",
} as const;

export interface Status {
  repository: boolean;
  output: string;
  error: string;
  changeRequestState: ThreadChangeRequestState | null;
}

export interface Diff {
  repository: boolean;
  diff: string;
  error: string;
}

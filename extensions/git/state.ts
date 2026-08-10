import { sig } from "@vaakx-dev/vrui";

export function createGitState() {
  return {
    threadId: sig<string | null>(null),
    repository: sig(false),
    status: sig(""),
    diff: sig(""),
    error: sig(""),
  };
}

export type GitState = ReturnType<typeof createGitState>;

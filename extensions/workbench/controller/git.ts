import { batch } from "@vaakx-dev/vrui";

import type { GitDiff, GitStatus } from "../models.ts";
import { ControllerRuntime } from "./runtime.ts";

export class GitController {
  constructor(private readonly runtime: ControllerRuntime) {}

  async refresh(): Promise<void> {
    await this.runtime.guard(async () => {
      const [status, diff] = await Promise.all([
        this.runtime.command<GitStatus>("git.status"),
        this.runtime.command<GitDiff>("git.diff"),
      ]);
      batch(() => {
        this.runtime.state.gitStatus.set(status.output || status.error);
        this.runtime.state.gitDiff.set(diff.diff || diff.error);
        this.runtime.state.gitRepository.set(status.repository);
      });
      const threadId = this.runtime.state.threadId.get();
      if (threadId) {
        await this.runtime.call("orchestration.thread.changeRequest", {
          threadId,
          ...(status.changeRequestState ? { state: status.changeRequestState } : {}),
        });
      }
    });
  }

  async initialize(): Promise<void> {
    await this.runtime.guard(async () => {
      await this.runtime.command("git.init");
      await this.refresh();
      this.runtime.notice("Git repository initialized");
    });
  }
}

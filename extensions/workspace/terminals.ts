import type { EventApi, JsonValue } from "@sand/extension-api";
import { resolveWorkspacePath } from "../../packages/extension-runtime/src/index.ts";


interface TerminalProcess {
  process: Bun.Subprocess<"pipe", "pipe", "pipe">;
  cwd: string;
  sequence: number;
}

export class Terminals {
  private readonly processes = new Map<string, TerminalProcess>();

  constructor(
    private readonly workspace: string,
    private readonly events: EventApi,
  ) {}

  open(cwd?: string): JsonValue {
    const id = crypto.randomUUID();
    const directory = resolveWorkspacePath(this.workspace, cwd || ".");
    const process = Bun.spawn(interactiveShell(), {
      cwd: directory,
      env: { ...globalThis.process.env },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    this.processes.set(id, { process, cwd: directory, sequence: 0 });
    this.events.emit("terminal.start", { id, cwd: directory });
    this.events.emit("terminal.output", {
      id,
      stream: "prompt",
      text: prompt(directory),
    });
    void this.pipe(id, "stdout", process.stdout, true);
    void this.pipe(id, "stderr", process.stderr, false);
    void process.exited.then((exitCode) => {
      this.processes.delete(id);
      this.events.emit("terminal.exit", { id, exitCode });
    });
    return { id, cwd: directory };
  }

  write(id: string, data: string): boolean {
    const terminal = this.processes.get(id);
    if (!terminal || terminal.process.exitCode !== null) return false;
    const command = data.replace(/[\r\n]+$/u, "");
    if (!command.trim()) return false;
    terminal.sequence += 1;
    const marker = `__SAND_PROMPT_${id.replaceAll("-", "")}_${terminal.sequence}__`;
    this.events.emit("terminal.output", {
      id,
      stream: "command",
      text: `${prompt(terminal.cwd)}${command}\n`,
    });
    terminal.process.stdin.write(`${command}\n${promptCommand(marker)}\n`);
    terminal.process.stdin.flush();
    return true;
  }

  stop(id: string): boolean {
    const process = this.processes.get(id)?.process;
    if (!process) return false;
    process.kill();
    return true;
  }

  async closeAll(): Promise<void> {
    const processes = [...this.processes.values()].map((terminal) => terminal.process);
    for (const process of processes) process.kill();
    await Promise.all(processes.map((process) => process.exited.catch(() => -1)));
    this.processes.clear();
  }

  private async pipe(
    id: string,
    stream: "stdout" | "stderr",
    source: ReadableStream<Uint8Array> | number | undefined,
    parsePrompts: boolean,
  ): Promise<void> {
    if (!source || typeof source === "number") return;
    const reader = source.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const text = decoder.decode(next.value, { stream: true });
      if (!text) continue;
      if (!parsePrompts) {
        this.events.emit("terminal.output", { id, stream, text });
        continue;
      }
      pending += text;
      while (true) {
        const newline = pending.indexOf("\n");
        if (newline < 0) break;
        const line = pending.slice(0, newline + 1);
        pending = pending.slice(newline + 1);
        this.emitStdoutLine(id, line);
      }
    }
    pending += decoder.decode();
    if (pending) this.emitStdoutLine(id, pending);
  }

  private emitStdoutLine(id: string, line: string): void {
    const match = line.trimEnd().match(/^__SAND_PROMPT_[a-f\d]+_\d+__(.*)$/u);
    if (match) {
      const directory = match[1] || this.processes.get(id)?.cwd || this.workspace;
      const terminal = this.processes.get(id);
      if (terminal) terminal.cwd = directory;
      this.events.emit("terminal.output", {
        id,
        stream: "prompt",
        text: prompt(directory),
      });
      return;
    }
    this.events.emit("terminal.output", { id, stream: "stdout", text: line });
  }
}

function interactiveShell(): string[] {
  return process.platform === "win32"
    ? ["powershell", "-NoLogo", "-NoProfile", "-Command", "-"]
    : ["bash", "--noprofile", "--norc"];
}

function promptCommand(marker: string): string {
  return process.platform === "win32"
    ? `Write-Output (\"${marker}\" + (Get-Location).Path)`
    : `printf '${marker}%s\\n' \"$PWD\"`;
}

function prompt(cwd: string): string {
  return process.platform === "win32" ? `PS ${cwd}> ` : `${cwd}$ `;
}

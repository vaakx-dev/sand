import type { EventApi, JsonValue } from "@sand/extension-api";
import { resolveWorkspacePath } from "@sand/extension-runtime";

import type { TerminalOutput, TerminalSnapshot, TerminalStream } from "./models.ts";

interface ProcessRecord {
  process: Bun.Subprocess<"pipe", "pipe", "pipe">;
  cwd: string;
  sequence: number;
  status: "running" | "exited";
  output: TerminalOutput[];
}

export class TerminalProcesses {
  private readonly values = new Map<string, ProcessRecord>();

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
    const terminal: ProcessRecord = {
      process,
      cwd: directory,
      sequence: 0,
      status: "running",
      output: [],
    };
    this.values.set(id, terminal);
    this.emit(id, "prompt", prompt(directory));
    void this.pipe(id, "stdout", process.stdout, true);
    void this.pipe(id, "stderr", process.stderr, false);
    void process.exited.then((exitCode) => {
      terminal.status = "exited";
      this.emit(id, "status", `\n[process exited with code ${exitCode}]`);
      this.events.emit("terminal.exit", { id, exitCode });
    });
    return { id, cwd: directory };
  }

  list(): TerminalSnapshot {
    return {
      panes: [...this.values.entries()].map(([id, terminal]) => ({
        id,
        cwd: terminal.cwd,
        status: terminal.status,
      })),
      output: [...this.values.values()].flatMap((terminal) => terminal.output),
    };
  }

  write(id: string, data: string): boolean {
    const terminal = this.values.get(id);
    if (!terminal || terminal.process.exitCode !== null) return false;
    const command = data.replace(/[\r\n]+$/u, "");
    if (!command.trim()) return false;
    terminal.sequence += 1;
    const marker = `__SAND_PROMPT_${id.replaceAll("-", "")}_${terminal.sequence}__`;
    this.emit(id, "command", `${prompt(terminal.cwd)}${command}\n`);
    terminal.process.stdin.write(`${command}\n${promptCommand(marker)}\n`);
    terminal.process.stdin.flush();
    return true;
  }

  close(id: string): boolean {
    const terminal = this.values.get(id);
    if (!terminal || terminal.status !== "running") return false;
    terminal.process.kill();
    return true;
  }

  async closeAll(): Promise<void> {
    const processes = [...this.values.values()]
      .filter((terminal) => terminal.status === "running")
      .map((terminal) => terminal.process);
    for (const process of processes) process.kill();
    await Promise.all(processes.map((process) => process.exited.catch(() => -1)));
    this.values.clear();
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
        this.emit(id, stream, text);
        continue;
      }
      pending += text;
      while (true) {
        const newline = pending.indexOf("\n");
        if (newline < 0) break;
        const line = pending.slice(0, newline + 1);
        pending = pending.slice(newline + 1);
        this.emitStdout(id, line);
      }
    }
    pending += decoder.decode();
    if (pending) this.emitStdout(id, pending);
  }

  private emitStdout(id: string, line: string): void {
    const match = line.trimEnd().match(/^__SAND_PROMPT_[a-f\d]+_\d+__(.*)$/u);
    if (!match) {
      this.emit(id, "stdout", line);
      return;
    }
    const terminal = this.values.get(id);
    const directory = match[1] || terminal?.cwd || this.workspace;
    if (terminal) terminal.cwd = directory;
    this.emit(id, "prompt", prompt(directory));
  }

  private emit(id: string, stream: TerminalStream, text: string): void {
    const terminal = this.values.get(id);
    if (terminal) {
      terminal.output.push({ terminalId: id, stream, text });
      if (terminal.output.length > 2_000) terminal.output.splice(0, terminal.output.length - 2_000);
    }
    this.events.emit("terminal.output", { id, stream, text });
  }
}

function interactiveShell(): string[] {
  return process.platform === "win32"
    ? ["powershell", "-NoLogo", "-NoProfile", "-Command", "-"]
    : ["bash", "--noprofile", "--norc"];
}

function promptCommand(marker: string): string {
  return process.platform === "win32"
    ? `Write-Output ("${marker}" + (Get-Location).Path)`
    : `printf '${marker}%s\\n' "$PWD"`;
}

function prompt(cwd: string): string {
  return process.platform === "win32" ? `PS ${cwd}> ` : `${cwd}$ `;
}

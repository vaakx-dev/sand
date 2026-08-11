export type TerminalStream = "command" | "stdout" | "stderr" | "prompt" | "status";

export interface TerminalLine {
  id: number;
  terminalId: string;
  stream: TerminalStream;
  text: string;
}

export interface TerminalPane {
  id: string;
  cwd: string;
  status: "running" | "exited";
}

export interface TerminalOutput {
  terminalId: string;
  stream: TerminalStream;
  text: string;
}

export interface TerminalSnapshot {
  panes: TerminalPane[];
  output: TerminalOutput[];
}

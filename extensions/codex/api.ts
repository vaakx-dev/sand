export const commands = {
  launch: "codex.launch",
} as const;

export interface Launch {
  command: string;
  args: string[];
}

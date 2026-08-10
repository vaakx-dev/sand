import type { JsonValue } from "@sand/extension-api";

export async function search(
  workspace: string,
  query: string,
  path?: string,
  glob?: string,
): Promise<JsonValue> {
  const args = ["rg", "--json", "--hidden", "--glob", "!.git", "--glob", "!node_modules"];
  if (glob) args.push("--glob", glob);
  args.push(query, path || ".");
  const process = Bun.spawn(args, {
    cwd: workspace,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout as ReadableStream).text(),
    new Response(process.stderr as ReadableStream).text(),
    process.exited,
  ]);
  if (exitCode > 1) throw new Error(stderr.trim() || `rg exited with ${exitCode}`);

  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RgMessage)
    .filter((message) => message.type === "match")
    .flatMap((message) => {
      if (!message.data) return [];
      return message.data.submatches.map((match) => ({
        path: message.data!.path.text,
        line: message.data!.lineNumber,
        column: match.start + 1,
        text: message.data!.lines.text.trimEnd(),
      }));
    }) as JsonValue;
}

interface RgMessage {
  type: string;
  data?: {
    path: { text: string };
    lines: { text: string };
    lineNumber: number;
    submatches: { start: number }[];
  };
}

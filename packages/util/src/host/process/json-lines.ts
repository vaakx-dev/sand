export interface JsonLinesOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  onMessage(message: unknown): void
  onExit?(code: number, stderr: string): void
}

export interface JsonLines {
  send(message: unknown): void
  close(): void
  exited: Promise<number>
}

const keepStderr = 4_000

const linesOf = async function* (stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true })
    for (let at = buffer.indexOf('\n'); at >= 0; at = buffer.indexOf('\n')) {
      const line = buffer.slice(0, at).trim()
      buffer = buffer.slice(at + 1)
      if (line) yield line
    }
  }
}

const parsed = (line: string): unknown => {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

export const spawnJsonLines = (command: string[], { cwd, env, onMessage, onExit }: JsonLinesOptions): JsonLines => {
  const child = Bun.spawn(command, { cwd, env, stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  let stderr = ''
  const reading = (async () => {
    for await (const line of linesOf(child.stdout)) {
      const message = parsed(line)
      if (message !== undefined) onMessage(message)
    }
  })()
  const collecting = (async () => {
    for await (const chunk of child.stderr) stderr = (stderr + new TextDecoder().decode(chunk)).slice(-keepStderr)
  })()
  const exited = Promise.all([child.exited, reading, collecting]).then(([code]) => {
    onExit?.(code, stderr.trim())
    return code
  })
  return {
    send(message) {
      if (child.exitCode !== null) return
      child.stdin.write(`${JSON.stringify(message)}\n`)
      void child.stdin.flush()
    },
    close: () => child.kill(),
    exited,
  }
}

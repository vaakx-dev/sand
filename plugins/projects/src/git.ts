const quiet = { ...process.env, GIT_TERMINAL_PROMPT: '0' }

const lines = async function* (stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  let rest = ''
  for await (const chunk of stream) {
    const parts = (rest + decoder.decode(chunk, { stream: true })).split(/[\r\n]+/)
    rest = parts.pop() ?? ''
    yield* parts.filter(Boolean)
  }
  if (rest) yield rest
}

export const git = async (args: string[], cwd: string, progress?: (text: string) => void) => {
  const child = Bun.spawn(['git', ...args], { cwd, env: quiet, stdin: 'ignore', stdout: 'ignore', stderr: 'pipe' })
  let last = ''
  for await (const line of lines(child.stderr)) {
    last = line
    progress?.(line)
  }
  if ((await child.exited) !== 0) throw new Error(last || `git ${args[0]} failed`)
}

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
  const child = Bun.spawn(['git', ...args], { cwd, env: quiet, stdin: 'ignore', stdout: 'ignore', stderr: 'pipe', windowsHide: true })
  let last = ''
  for await (const line of lines(child.stderr)) {
    last = line
    progress?.(line)
  }
  if ((await child.exited) !== 0) throw new Error(last || `git ${args[0]} failed`)
}

export const throttled = (send: (text: string) => void, every = 150) => {
  let last = 0
  let pending: string | undefined
  let timer: Timer | undefined
  const flush = () => {
    timer = undefined
    if (pending === undefined) return
    last = Date.now()
    send(pending)
    pending = undefined
  }
  return {
    push(text: string) {
      pending = text
      if (timer) return
      const wait = every - (Date.now() - last)
      if (wait <= 0) flush()
      else timer = setTimeout(flush, wait)
    },
    done() {
      clearTimeout(timer)
      flush()
    },
  }
}

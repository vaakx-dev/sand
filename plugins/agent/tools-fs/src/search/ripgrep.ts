export const ripgrep = Bun.which('rg')

const nothingSearched = /No files were searched/

const separator = () => (process.platform === 'win32' ? ['--path-separator', '/'] : [])

export const scope = (includeIgnored = false) => [
  ...(includeIgnored
    ? ['--follow', '--no-messages', '--no-ignore', '--hidden', '--glob', '!.git']
    : ['--hidden', '--no-require-git', '--glob', '!.git', '--glob', '!node_modules']),
  ...separator(),
]

export async function* lines(binary: string, args: string[], cwd: string, signal?: AbortSignal) {
  const child = Bun.spawn([binary, ...args], { cwd, signal, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const decoder = new TextDecoder()
  let rest = ''
  try {
    for await (const chunk of child.stdout) {
      const parts = (rest + decoder.decode(chunk, { stream: true })).split('\n')
      rest = parts.pop() ?? ''
      yield* parts
    }
    if (rest) yield rest
    if ((await child.exited) < 2) return
    const error = (await new Response(child.stderr).text()).trim()
    if (error && !nothingSearched.test(error)) throw new Error(error)
  } finally {
    child.kill()
  }
}

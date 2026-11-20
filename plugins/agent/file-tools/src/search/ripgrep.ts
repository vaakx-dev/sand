import { spawnIn } from '@sand/util/host'
import { ripgrepBinary } from '@sand/util/release'

const nothingSearched = /No files were searched/

const separator = process.platform === 'win32' ? ['--path-separator', '/'] : []

const everything = ['--no-messages', '--no-ignore', '--hidden', '--glob', '!.git']

const tracked = ['--hidden', '--no-require-git', '--glob', '!.git', '--glob', '!node_modules']

type Ripgrep = () => Promise<string>

const ownRipgrep =
  (root: string): Ripgrep =>
  async () => {
    const binary = ripgrepBinary(root)
    if (await Bun.file(binary).exists()) return binary
    throw new Error(`Sand's ripgrep is missing from ${binary}. Update or reinstall sand to get it back.`)
  }

const scope = (includeIgnored = false) => [...(includeIgnored ? everything : tracked), ...separator]

async function* lines(binary: string, args: string[], cwd: string, signal?: AbortSignal) {
  const child = spawnIn(cwd, () => Bun.spawn([binary, ...args], { cwd, signal, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true }))
  const decoder = new TextDecoder()
  let rest = ''
  try {
    for await (const chunk of child.stdout) {
      const parts = (rest + decoder.decode(chunk, { stream: true })).split('\n')
      rest = parts.pop() ?? ''
      yield* parts
    }
    signal?.throwIfAborted()
    if (rest) yield rest
    if ((await child.exited) < 2) return
    const error = (await new Response(child.stderr).text()).trim()
    if (error && !nothingSearched.test(error)) throw new Error(error)
  } finally {
    child.kill()
  }
}

export { lines, ownRipgrep, type Ripgrep, scope }

import { spawnIn } from '@sand/util/host'
import { install, ripgrepBinary } from './install'

const nothingSearched = /No files were searched/

const separator = process.platform === 'win32' ? ['--path-separator', '/'] : []

const everything = ['--no-messages', '--no-ignore', '--hidden', '--glob', '!.git']

const tracked = ['--hidden', '--no-require-git', '--glob', '!.git', '--glob', '!node_modules']

class Ripgrep {
  readonly #binary: string
  #ready: Promise<string> | undefined

  constructor(folder: string) {
    this.#binary = ripgrepBinary(folder)
  }

  binary() {
    this.#ready ??= this.#find().catch(error => {
      this.#ready = undefined
      throw error
    })
    return this.#ready
  }

  async #find() {
    return (await Bun.file(this.#binary).exists()) ? this.#binary : install(this.#binary)
  }
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

export { lines, Ripgrep, scope }

import type { SignInFlow } from '@sand/accounts/contract'

interface PasteSignIn {
  app: string
  command: string[]
  env: Record<string, string | undefined>
  link: RegExp
  signal: AbortSignal
  signedIn(): Promise<boolean>
}

const NO_BROWSER = 'none'
const BAD_CODE = /invalid code/i
const LINK_TIMEOUT_MS = 20_000

const refusal = () => {
  const made = Promise.withResolvers<never>()
  made.promise.catch(() => {})
  return made
}

const watch = (stream: ReadableStream<Uint8Array>, onText: (all: string) => void) =>
  (async () => {
    const decoder = new TextDecoder()
    let all = ''
    for await (const chunk of stream) {
      all += decoder.decode(chunk, { stream: true })
      onText(all)
    }
  })()

const pasteSignIn = async ({ app, command, env, link, signal, signedIn }: PasteSignIn): Promise<SignInFlow<void>> => {
  const child = Bun.spawn(command, { env: { ...env, BROWSER: NO_BROWSER }, stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  signal.addEventListener('abort', () => child.kill(), { once: true })

  const shown = Promise.withResolvers<string>()
  let rejected = refusal()
  const watchers = [child.stdout, child.stderr].map(stream => {
    let seen = 0
    return watch(stream, all => {
      const url = link.exec(all)?.[0]
      if (url) shown.resolve(url)
      if (!BAD_CODE.test(all.slice(seen))) return
      seen = all.length
      rejected.reject(new Error("That code didn't work. Copy the whole code from the sign-in page and try again."))
    })
  })
  void Promise.all(watchers)

  const finished = child.exited.then(async code => {
    if (await signedIn()) return
    throw new Error(code ? `${app} sign-in stopped (exit ${code})` : `${app} didn't finish signing in`)
  })
  finished.catch(() => {})

  const timeout = setTimeout(() => shown.reject(new Error(`${app} didn't show a sign-in link`)), LINK_TIMEOUT_MS)
  const url = await shown.promise
    .catch(error => {
      child.kill()
      throw error
    })
    .finally(() => clearTimeout(timeout))

  return {
    kind: 'paste',
    url,
    async finish(code: string) {
      rejected = refusal()
      child.stdin.write(`${code.trim()}\n`)
      await child.stdin.flush()
      await Promise.race([finished, rejected.promise])
    },
    wait: () => finished,
  }
}

export { pasteSignIn }

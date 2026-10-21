import type { SignInFlow } from '@sand/accounts/contract'
import { claudeEnv } from '../cli/args'
import { requireClaude } from '../cli/binary'
import { readStatus } from './status'

const authorizeUrl = /https:\/\/[^\s\x07\x1b]+\/oauth\/authorize[^\s\x07\x1b]*/
const badCode = /invalid code/i
const startTimeout = 20_000

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

export const signInClaude = async (signal: AbortSignal): Promise<SignInFlow<void>> => {
  const binary = await requireClaude()
  const child = Bun.spawn([binary, 'auth', 'login', '--claudeai'], { env: claudeEnv(), stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  signal.addEventListener('abort', () => child.kill(), { once: true })

  const shown = Promise.withResolvers<string>()
  let rejected = refusal()
  void watch(child.stdout, all => {
    const url = authorizeUrl.exec(all)?.[0]
    if (url) shown.resolve(url)
  })
  let seen = 0
  void watch(child.stderr, all => {
    if (!badCode.test(all.slice(seen))) return
    seen = all.length
    rejected.reject(new Error("That code didn't work. Copy the whole code from the sign-in page and try again."))
  })

  const finished = child.exited.then(async code => {
    if ((await readStatus()).signedIn) return
    throw new Error(code ? `Claude Code sign-in stopped (exit ${code})` : "Claude Code didn't finish signing in")
  })
  finished.catch(() => {})

  const timeout = setTimeout(() => shown.reject(new Error("Claude Code didn't show a sign-in link")), startTimeout)
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

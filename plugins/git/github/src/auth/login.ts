import { GitHubError, sentence } from '../api/errors'
import type { GitHubAuth, GitHubLoginCode } from '../contract'
import type { Auth } from './auth'
import { findCode, readText } from './device-code'
import { ghPath, lastLine, startGh } from './gh'
import { envToken } from './token'

const loginMs = 15 * 60_000
const urlWaitMs = 1500

export interface LoginDeps {
  host: string
  auth: Auth
  code(code: GitHubLoginCode): void
}

export const createLogin = ({ host, auth, code }: LoginDeps) => {
  let running: Promise<GitHubAuth> | undefined
  let child: ReturnType<typeof startGh> | undefined

  const run = async (path: string) => {
    const started = startGh(path, ['auth', 'login', '--web', '--hostname', host, '--git-protocol', 'https'], loginMs)
    child = started
    let text = ''
    let sent = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const send = () => {
      const found = findCode(text)
      if (sent || !found) return
      sent = true
      clearTimeout(timer)
      code({ code: found.code, url: found.url ?? `https://${host}/login/device` })
    }
    const onText = (chunk: string) => {
      text += chunk
      const found = findCode(text)
      if (found?.url) send()
      else if (found) timer ??= setTimeout(send, urlWaitMs)
    }
    const [, , exit] = await Promise.all([readText(started.stdout, onText), readText(started.stderr, onText), started.exited])
    clearTimeout(timer)
    child = undefined
    const next = await auth.reload()
    if (exit !== 0 && next.state !== 'signed-in') throw new GitHubError(sentence(`GitHub sign-in didn't finish${text.trim() ? `: ${lastLine(text)}` : ''}`))
    return next
  }

  const login = () => {
    if (envToken()) return Promise.reject(new GitHubError('This PC uses the GH_TOKEN or GITHUB_TOKEN variable for GitHub; change that variable instead of signing in.'))
    const path = ghPath()
    if (!path) return Promise.reject(new GitHubError('Install the GitHub CLI (gh) on this PC to sign in to GitHub, or set GH_TOKEN.'))
    running ??= run(path).finally(() => {
      running = undefined
    })
    return running
  }

  const stop = () => {
    child?.kill()
    child = undefined
  }

  return { login, stop }
}

import { GitHubError, sentence } from '../api/errors'
import type { GitHubAuth } from '../contract'
import type { Auth } from './auth'
import { type GhResult, ghPath, lastLine, runGh } from './gh'
import { envToken } from './token'

const logoutMs = 30_000

const lacksUserFlag = (result: GhResult) => result.code !== 0 && /unknown flag:?\s*--user/i.test(result.err)

const ghLogout = async (path: string, host: string, login: string) => {
  const args = ['auth', 'logout', '--hostname', host]
  const result = await runGh(path, [...args, '--user', login], logoutMs)
  return lacksUserFlag(result) ? runGh(path, args, logoutMs) : result
}

export const logout = async (host: string, auth: Auth): Promise<GitHubAuth> => {
  if (envToken()) throw new GitHubError('This PC signs in to GitHub with the GH_TOKEN or GITHUB_TOKEN variable; remove that variable from the environment sand runs in, then restart sand to sign out.')
  const current = await auth.auth()
  if (current.state !== 'signed-in') return auth.reload()
  const path = ghPath()
  if (!path) return auth.reload()
  const result = await ghLogout(path, host, current.login)
  const next = await auth.reload()
  if (result.code !== 0 && next.state === 'signed-in') {
    const why = lastLine(`${result.out}\n${result.err}`)
    throw new GitHubError(sentence(`GitHub sign-out didn't finish${why ? `: ${why}` : ''}`))
  }
  return next
}

import { errorMessage } from '@sand/util'
import { ghPath, runGh } from './gh'

export type TokenSource = { token: string; from: 'env' | 'gh' } | { token?: undefined; gh: boolean; failed?: string }

export const envToken = () => process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || undefined

const fromGh = async (gh: string, host: string): Promise<TokenSource> => {
  try {
    const result = await runGh(gh, ['auth', 'token', '--hostname', host])
    const token = result.code === 0 ? result.out.trim() : ''
    return token ? { token, from: 'gh' } : { gh: true }
  } catch (error) {
    return { gh: true, failed: `Couldn't run the GitHub CLI (gh): ${errorMessage(error)}` }
  }
}

export const readToken = async (host: string): Promise<TokenSource> => {
  const env = envToken()
  if (env) return { token: env, from: 'env' }
  const gh = ghPath()
  return gh ? fromGh(gh, host) : { gh: false }
}

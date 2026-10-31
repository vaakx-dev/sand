import { ghPath, runGh } from './gh'

export type TokenSource = { token: string; from: 'env' | 'gh' } | { token?: undefined; gh: boolean }

export const envToken = () => process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || undefined

export const readToken = async (host: string): Promise<TokenSource> => {
  const env = envToken()
  if (env) return { token: env, from: 'env' }
  const gh = ghPath()
  if (!gh) return { gh: false }
  const result = await runGh(gh, ['auth', 'token', '--hostname', host]).catch(() => undefined)
  const token = result?.code === 0 ? result.out.trim() : ''
  return token ? { token, from: 'gh' } : { gh: true }
}

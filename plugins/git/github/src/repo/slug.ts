import { githubHost } from '../api/endpoint'

const withScheme = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:]+)(?::\d*)?\/(.+)$/i
const scpLike = /^(?:[^@/]+@)?([^/:]{2,}):(?!\/\/)(.+)$/
const repoPattern = /^[\w.-]+\/[\w.-]+$/

const hosts = new Set([githubHost, `www.${githubHost}`, `ssh.${githubHost}`])

export const isRepoName = (text: string) => repoPattern.test(text)

export const repoSlug = (url: string | undefined) => {
  const text = url?.trim()
  if (!text) return undefined
  const match = withScheme.exec(text) ?? scpLike.exec(text)
  const host = match?.[1]?.toLowerCase()
  if (!match?.[2] || !host || !hosts.has(host)) return undefined
  const path = match[2].replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.git$/, '')
  return isRepoName(path) ? path : undefined
}

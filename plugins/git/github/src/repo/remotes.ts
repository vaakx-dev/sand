import type { GitRunner } from '@sand/git-runner/contract'
import { githubHost } from '../api/endpoint'
import { repoSlug } from './slug'

const urlLine = /^remote\.(.+)\.url\s+(.+)$/

export const readRemotes = async (git: GitRunner, cwd: string) => {
  const out = await git.maybe(cwd, ['config', '--get-regexp', '^remote\..*\.url$'], { read: true })
  const remotes = new Map<string, string>()
  for (const line of out?.split(/\r?\n/) ?? []) {
    const [, name, url] = urlLine.exec(line.trim()) ?? []
    const slug = repoSlug(url)
    if (name && slug && !remotes.has(name)) remotes.set(name, slug)
  }
  return remotes
}

export const remoteFor = async (git: GitRunner, cwd: string, repo: string) => {
  const wanted = repo.toLowerCase()
  for (const [name, slug] of await readRemotes(git, cwd)) if (slug.toLowerCase() === wanted) return name
  return `https://${githubHost}/${repo}.git`
}

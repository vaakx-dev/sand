import type { GitRunner } from '@sand/git/contract'
import { repoSlug } from './slug'

const urlLine = /^remote\.(.+)\.url\s+(.+)$/

export const readRemotes = async (git: GitRunner, cwd: string) => {
  const out = await git.maybe(cwd, ['config', '--get-regexp', '^remote\\..*\\.url$'], { read: true })
  const remotes = new Map<string, string>()
  for (const line of out?.split(/\r?\n/) ?? []) {
    const [, name, url] = urlLine.exec(line.trim()) ?? []
    const slug = repoSlug(url)
    if (name && slug && !remotes.has(name)) remotes.set(name, slug)
  }
  return remotes
}

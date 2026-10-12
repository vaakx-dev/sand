import { join } from 'node:path'
import { repoDirs } from './repo'

const withoutCredentials = (url: string) => {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url
    parsed.username = ''
    parsed.password = ''
    return parsed.toString()
  } catch {
    return url
  }
}

const unquote = (value: string) => value.replace(/^"(.*)"$/, '$1')

const parseRemotes = (config: string) => {
  const remotes: Record<string, string> = {}
  let remote: string | undefined
  for (const line of config.split(/\r?\n/)) {
    const section = /^\s*\[\s*([^\s\]]+)(?:\s+"(.*)")?\s*\]/.exec(line)
    if (section) remote = section[1]?.toLowerCase() === 'remote' ? section[2] : undefined
    const url = /^\s*url\s*=\s*(.+?)\s*$/i.exec(line)
    if (remote && url?.[1]) remotes[remote] = withoutCredentials(unquote(url[1]))
  }
  return remotes
}

export const remotesOf = async (folder: string) => {
  const repo = await repoDirs(folder)
  if (!repo) return {}
  return parseRemotes(await Bun.file(join(repo.commonDir, 'config')).text().catch(() => ''))
}

export const branchOf = async (folder: string) => {
  const repo = await repoDirs(folder)
  if (!repo) return undefined
  const head = await Bun.file(join(repo.gitDir, 'HEAD')).text().catch(() => '')
  return /^ref:\s*refs\/heads\/(.+?)\s*$/.exec(head)?.[1]
}

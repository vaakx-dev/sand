import { git } from '../git/run'

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

export const remotesOf = async (folder: string) => {
  const listed = await git(['config', '--get-regexp', '^remote\\..*\\.url$'], { cwd: folder })
  const remotes: Record<string, string> = {}
  for (const line of listed.out.split('\n')) {
    const match = /^remote\.(.+)\.url (.+)$/.exec(line)
    if (match?.[1] && match[2]) remotes[match[1]] = withoutCredentials(match[2])
  }
  return remotes
}

export const branchOf = async (folder: string) => {
  const found = await git(['symbolic-ref', '--short', '-q', 'HEAD'], { cwd: folder })
  return found.code === 0 && found.out.trim() ? found.out.trim() : undefined
}

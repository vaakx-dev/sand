import type { GitPlace, GitRepoLocal, GitStatus } from '@sand/git/contract'

const flat = (path: string) => path.replace(/\\/g, '/').replace(/\/+$/, '')

const normal = (path: string) => {
  const plain = flat(path)
  return /^[a-z]:/i.test(plain) ? plain.toLowerCase() : plain
}

export const samePath = (a: string | undefined, b: string | undefined) => Boolean(a && b && normal(a) === normal(b))

export const isInside = (path: string, folder: string) => samePath(path, folder) || normal(path).startsWith(`${normal(folder)}/`)

export const folderName = (path: string) => flat(path).split('/').pop() || path

export const placeKey = (place: GitPlace) => `${place.device}\u0000${place.cwd}`

export const repoOf = (status: GitStatus | undefined): GitRepoLocal | undefined => (status?.local.repo ? status.local : undefined)

export const defaultBranch = (local: GitRepoLocal | undefined) => local?.defaultBranch ?? 'the default branch'

export const waitReason = 'Waits until the agent finishes'

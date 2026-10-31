import { gitMaybe } from '../run/run'

const originHead = 'refs/remotes/origin/HEAD'
const originPrefix = 'refs/remotes/origin/'
const fallbacks = ['main', 'master']

const candidates = [originHead, ...fallbacks.flatMap(name => [`refs/heads/${name}`, `${originPrefix}${name}`])]

export const readDefaultBranch = async (root: string): Promise<string | undefined> => {
  const out = await gitMaybe(root, ['for-each-ref', '--format=%(refname) %(symref)', ...candidates], { read: true })
  if (!out) return undefined
  const refs = new Map(out.split(/\r?\n/).map(line => line.split(' ') as [string, string | undefined]))
  const target = refs.get(originHead)
  if (target?.startsWith(originPrefix)) return target.slice(originPrefix.length)
  return fallbacks.find(name => refs.has(`refs/heads/${name}`) || refs.has(`${originPrefix}${name}`))
}

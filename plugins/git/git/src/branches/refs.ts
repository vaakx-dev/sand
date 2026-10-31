export interface Ref {
  name: string
  remote?: string
  current: boolean
  updated: number
}

const localPrefix = 'refs/heads/'
const remotePrefix = 'refs/remotes/'

const splitRemote = (path: string, remotes: string[]) => {
  const remote = remotes.filter(name => path.startsWith(`${name}/`)).sort((a, b) => b.length - a.length)[0]
  if (remote) return { remote, name: path.slice(remote.length + 1) }
  const slash = path.indexOf('/')
  return slash < 0 ? undefined : { remote: path.slice(0, slash), name: path.slice(slash + 1) }
}

const parseRef = (line: string, remotes: string[]): Ref | undefined => {
  const [refname = '', symref, head, date] = line.split('\0')
  if (symref) return undefined
  const updated = Number(date) * 1000 || 0
  if (refname.startsWith(localPrefix)) return { name: refname.slice(localPrefix.length), current: head === '*', updated }
  if (!refname.startsWith(remotePrefix)) return undefined
  const split = splitRemote(refname.slice(remotePrefix.length), remotes)
  return split && { ...split, current: false, updated }
}

export const parseRefs = (out: string, remotes: string[]) => out.split(/\r?\n/).flatMap(line => (line ? (parseRef(line, remotes) ?? []) : []))

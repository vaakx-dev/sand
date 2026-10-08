import type { Remote, Remotes } from '@sand/protocol'

export const findRemote = (remotes: Remotes | undefined, name: string): Remote => {
  if (!remotes) throw new Error('The remotes plugin is not loaded')
  const remote = remotes.find(name)
  if (remote) return remote
  const known = remotes.list().map(other => other.name)
  throw new Error(`No paired PC named ${name}${known.length ? `; paired: ${known.join(', ')}` : '; pair one with sand remote add <link>'}`)
}

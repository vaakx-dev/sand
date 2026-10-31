import type { GitRunner } from '@sand/git/contract'
import type { SnapshotSide } from '../contract'

const keptTurns = 100

const sessionPrefix = (session: string) => `refs/sand/turns/${session}/`

const indexOf = (ref: string) => Number(ref.slice(ref.lastIndexOf('/') + 1).split('-')[0])

export const turnRef = (session: string, index: number, side: SnapshotSide) => `${sessionPrefix(session)}${index}-${side}`

export const writeTurnRef = (git: GitRunner, root: string, ref: string, commit: string) => git.ok(root, ['update-ref', ref, commit])

export const sessionRefs = async (git: GitRunner, root: string, session: string) =>
  (await git.ok(root, ['for-each-ref', '--format=%(refname)', sessionPrefix(session)], { read: true })).split(/\r?\n/).filter(Boolean)

const deleteRefs = async (git: GitRunner, root: string, refs: string[]) => {
  if (refs.length) await git.ok(root, ['update-ref', '--stdin'], { input: refs.map(ref => `delete ${ref}\n`).join('') })
}

export const deleteSessionRefs = async (git: GitRunner, root: string, session: string) => deleteRefs(git, root, await sessionRefs(git, root, session))

export const pruneSessionRefs = async (git: GitRunner, root: string, session: string) => {
  const refs = await sessionRefs(git, root, session)
  const oldestKept = [...new Set(refs.map(indexOf))].sort((a, b) => b - a)[keptTurns - 1]
  if (oldestKept !== undefined) await deleteRefs(git, root, refs.filter(ref => indexOf(ref) < oldestKept))
}

import type { GitRunner } from '@sand/git/contract'
import { gitFailure, gitStep } from '../repo/run'

export interface Carried {
  message: string
  commit: string
  files: number
}

interface StashEntry {
  ref: string
  commit: string
}

export const changedFiles = async (git: GitRunner, dir: string) => {
  const out = await gitStep(git, dir, ['status', '--porcelain', '--untracked-files=all'], "Couldn't read the changes", { read: true })
  return out ? out.split(/\r?\n/).length : 0
}

const parseEntry = (line: string) => {
  const [ref = '', commit = '', subject = ''] = line.split('\0')
  return { ref, commit, subject }
}

const findStash = async (git: GitRunner, dir: string, message: string): Promise<StashEntry | undefined> => {
  const listed = await gitStep(git, dir, ['stash', 'list', '--format=%gd%x00%H%x00%gs'], "Couldn't list stashes", { read: true })
  const entry = listed
    .split(/\r?\n/)
    .map(parseEntry)
    .find(({ subject }) => subject.endsWith(`: ${message}`))
  return entry && { ref: entry.ref, commit: entry.commit }
}

export const stashChanges = async (git: GitRunner, root: string): Promise<Carried | undefined> => {
  const files = await changedFiles(git, root)
  if (!files) return undefined
  const message = `sand-move-${crypto.randomUUID()}`
  await gitStep(git, root, ['stash', 'push', '--include-untracked', '--message', message], "Couldn't set your changes aside")
  const entry = await findStash(git, root, message)
  if (!entry) throw new Error(`Your changes were set aside, but sand couldn't find them again. Look for "${message}" in "git stash list" in ${root}.`)
  return { message, commit: entry.commit, files }
}

export const applyStash = async (git: GitRunner, dir: string, carried: Carried) => {
  const args = ['stash', 'apply', '--index', carried.commit]
  const result = await git.run(dir, args)
  return result.code === 0 ? undefined : gitFailure(git, result, args, "Couldn't apply the changes")
}

export const dropStash = async (git: GitRunner, root: string, carried: Carried) => {
  const entry = await findStash(git, root, carried.message)
  if (!entry || entry.commit !== carried.commit) return
  await gitStep(git, root, ['stash', 'drop', entry.ref], "Couldn't drop the carried stash")
}

export const restoreStash = async (git: GitRunner, root: string, carried: Carried) => {
  const failed = await applyStash(git, root, carried)
  if (failed) throw new Error(`${failed.message}\nYour changes are safe in the stash: run "git stash apply ${carried.commit}" in ${root}.`)
  await dropStash(git, root, carried)
}

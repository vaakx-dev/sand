import type { GitRunner } from '@sand/git/contract'

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
  const out = await git.ok(dir, ['status', '--porcelain', '--untracked-files=all'], { read: true, what: "Couldn't read the changes" })
  return out ? out.split(/\r?\n/).length : 0
}

const parseEntry = (line: string) => {
  const [ref = '', commit = '', subject = ''] = line.split('\0')
  return { ref, commit, subject }
}

const findStash = async (git: GitRunner, dir: string, message: string): Promise<StashEntry | undefined> => {
  const listed = await git.ok(dir, ['stash', 'list', '--format=%gd%x00%H%x00%gs'], { read: true, what: "Couldn't list stashes" })
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
  await git.ok(root, ['stash', 'push', '--include-untracked', '--message', message], { what: "Couldn't set your changes aside" })
  const entry = await findStash(git, root, message)
  if (!entry) throw new Error(`Your changes were set aside, but sand couldn't find them again. Look for "${message}" in "git stash list" in ${root}.`)
  return { message, commit: entry.commit, files }
}

export const applyStash = async (git: GitRunner, dir: string, carried: Carried) => {
  const args = ['stash', 'apply', '--index', carried.commit]
  const result = await git.run(dir, args)
  return result.code === 0 ? undefined : new Error(git.classify(result, args, "Couldn't apply the changes").message)
}

export const dropStash = async (git: GitRunner, root: string, carried: Carried) => {
  const entry = await findStash(git, root, carried.message)
  if (!entry || entry.commit !== carried.commit) return
  await git.ok(root, ['stash', 'drop', entry.ref], { what: "Couldn't drop the carried stash" })
}

export const restoreStash = async (git: GitRunner, root: string, carried: Carried) => {
  const failed = await applyStash(git, root, carried)
  if (failed) throw new Error(`${failed.message}\nYour changes are safe in the stash: run "git stash apply ${carried.commit}" in ${root}.`)
  await dropStash(git, root, carried)
}

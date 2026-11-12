import { GitError } from './error'
import { gitOutput } from './run'

const objectId = /^[0-9a-f]{40,64}$/

const lineBreak = /[\r\n]/

export const commits = async (cwd: string, revisions: string[]): Promise<(string | undefined)[]> => {
  if (!revisions.length) return []
  const unreadable = revisions.find(revision => lineBreak.test(revision))
  if (unreadable !== undefined) throw new GitError('not-found', `${JSON.stringify(unreadable)} isn't a revision.`)
  const input = revisions.map(revision => `${revision}^{commit}\n`).join('')
  const out = await gitOutput(cwd, ['cat-file', '--batch-check=%(objectname)'], { input, read: true })
  const lines = out.split('\n')
  return revisions.map((_, index) => {
    const line = lines[index]?.trim() ?? ''
    return objectId.test(line) ? line : undefined
  })
}

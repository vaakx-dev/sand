import type { Session } from '@sand/chats/contract'
import type { WorktreeDeps } from '../deps'
import { currentBranch, hasUpstream, uniqueBranch } from '../repo/refs'
import { askBranchName } from './ask'

export const nameOnFirstTurn = async (deps: WorktreeDeps, session: Session, prompt: string) => {
  await deps.store.ready()
  const record = deps.store.containing(session.cwd)
  const temp = record?.temp
  if (!record || !temp) return
  delete record.temp
  await deps.store.save()
  const sub = deps.sub()
  if (!sub) throw new Error('no model is available because the sub model plugin is off')
  const slug = await askBranchName(sub, session, prompt)
  const renamed = await deps.queue(record.main, async () => {
    if ((await currentBranch(deps.git, record.path)) !== temp || (await hasUpstream(deps.git, record.path, temp))) return false
    const branch = await uniqueBranch(deps.git, record.path, `${deps.prefix}${slug}`)
    await deps.git.ok(record.path, ['branch', '-m', temp, branch], { what: `Couldn't rename ${temp}` })
    record.branch = branch
    await deps.store.save()
    return true
  })
  if (renamed) await deps.changed(record.main, record.path)
}

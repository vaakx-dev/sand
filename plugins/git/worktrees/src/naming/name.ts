import type { Session } from '@sand/chats/contract'
import type { WorktreeDeps } from '../deps'
import { currentBranch, hasUpstream, uniqueBranch } from '../repo/refs'
import { gitStep } from '../repo/run'
import { askBranchName } from './ask'

export const nameOnFirstTurn = async (deps: WorktreeDeps, session: Session, prompt: string) => {
  await deps.store.ready()
  const record = deps.store.containing(session.cwd)
  const temp = record?.temp
  if (!record || !temp) return
  delete record.temp
  await deps.store.save()
  const ask = deps.ask()
  if (!ask) throw new Error('no model is available because the ask plugin is off')
  const slug = await askBranchName(ask, session.id, session.title, prompt)
  const renamed = await deps.queue(record.main, async () => {
    if ((await currentBranch(deps.git, record.path)) !== temp || (await hasUpstream(deps.git, record.path, temp))) return false
    const branch = await uniqueBranch(deps.git, record.path, `${deps.prefix}${slug}`)
    await gitStep(deps.git, record.path, ['branch', '-m', temp, branch], `Couldn't rename ${temp}`)
    record.branch = branch
    await deps.store.save()
    return true
  })
  if (renamed) await deps.changed(record.main, record.path)
}

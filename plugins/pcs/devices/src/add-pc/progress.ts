import type { InstallProgress, InstallStage } from '@sand/host-dist/contract'
import type { Kit, StepState } from '@sand/ui-kit/contract'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'

const stages: InstallStage[] = ['installing', 'joining', 'sharing']

const tones: Record<StepState, string> = { done: 'text-neutral-100', running: 'text-neutral-100', failed: 'text-danger-400', waiting: 'text-neutral-500' }

export const installedName = (list: InstallProgress[]) => list.findLast(entry => entry.name)?.name

const reached = (list: InstallProgress[]) => {
  const known = list.filter(entry => entry.stage !== 'failed')
  const last = known.at(-1)
  if (!last) return 0
  return last.stage === 'ready' ? 4 : stages.indexOf(last.stage) + 1
}

const labels = (name: string | undefined) => ['Waiting for the new PC', name ? `Installing sand on ${name}` : 'Installing sand', 'Joining your PCs', 'Sharing accounts']

const markOf = (index: number, at: number, failed: boolean): StepState => {
  if (index < at) return 'done'
  if (index > at) return 'waiting'
  return failed ? 'failed' : 'running'
}

const rows = (kit: Kit, list: InstallProgress[]) => {
  const { stepMark } = kit
  const at = Math.min(reached(list), 3)
  const failed = list.at(-1)?.stage === 'failed'
  return labels(installedName(list)).map((text, index) => {
    const mark = markOf(index, at, failed)
    return div({ class: ['flex items-center gap-2 text-sm', tones[mark]] }, stepMark(mark), span({ class: 'min-w-0 wrap-anywhere' }, text))
  })
}

export const progressList = (kit: Kit, progress: Sig<InstallProgress[]>) =>
  div(
    { role: 'status', 'aria-live': 'polite' },
    dynamicChild(progress, list => div({ class: 'flex flex-col gap-2' }, rows(kit, list))),
  )

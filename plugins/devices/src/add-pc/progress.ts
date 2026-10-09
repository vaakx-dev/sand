import { div, dynamicChild, icon, span, spinner, type Child, type Sig } from '@sand/dom'
import type { InstallProgress, InstallStage } from '@sand/protocol'

type Mark = 'done' | 'now' | 'failed' | 'waiting'

const stages: InstallStage[] = ['installing', 'joining', 'sharing']

const circle = 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full'

const marks: Record<Mark, () => Child> = {
  done: () => span({ class: [circle, 'bg-success-400 text-neutral-950'] }, icon('check', 12)),
  now: () => span({ class: [circle, 'text-accent-400'] }, spinner(14)),
  failed: () => span({ class: [circle, 'bg-danger-400 text-neutral-950'] }, icon('x', 12)),
  waiting: () => span({ class: [circle, 'ring-1 ring-neutral-600'] }),
}

const tones: Record<Mark, string> = { done: 'text-neutral-100', now: 'text-neutral-100', failed: 'text-danger-400', waiting: 'text-neutral-500' }

export const installedName = (list: InstallProgress[]) => list.findLast(entry => entry.name)?.name

const reached = (list: InstallProgress[]) => {
  const known = list.filter(entry => entry.stage !== 'failed')
  const last = known.at(-1)
  if (!last) return 0
  return last.stage === 'ready' ? 4 : stages.indexOf(last.stage) + 1
}

const labels = (name: string | undefined) => ['Waiting for the new PC', name ? `Installing sand on ${name}` : 'Installing sand', 'Joining your PCs', 'Sharing accounts']

const markOf = (index: number, at: number, failed: boolean): Mark => {
  if (index < at) return 'done'
  if (index > at) return 'waiting'
  return failed ? 'failed' : 'now'
}

const rows = (list: InstallProgress[]) => {
  const at = Math.min(reached(list), 3)
  const failed = list.at(-1)?.stage === 'failed'
  return labels(installedName(list)).map((text, index) => {
    const mark = markOf(index, at, failed)
    return div({ class: ['flex items-center gap-3 text-sm', tones[mark]] }, marks[mark](), span({ class: 'min-w-0 wrap-anywhere' }, text))
  })
}

export const progressList = (progress: Sig<InstallProgress[]>) =>
  div(
    { role: 'status', 'aria-live': 'polite' },
    dynamicChild(progress, list => div({ class: 'flex flex-col gap-3' }, rows(list))),
  )

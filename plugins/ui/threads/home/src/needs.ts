import type { ThreadChanges } from '@sand/changes/contract'
import type { Need, NeedAction } from '@sand/needs-you/contract'
import { panel } from '@sand/panel/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Shell } from '@sand/ui-shell/contract'
import { turns, type Projects, type Thread } from '@sand/web-client/contract'
import { derive, div, dynamicChild, show, sig, span } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { mergeTrouble, type Changes } from './changes'
import { visibleThreads } from './items/items'
import { openThread } from './open'

export interface NeedsParts {
  ctx: Context
  kit: Kit
  threads: { list(): Thread[]; get(id: string): Thread | undefined }
  projects: Projects
  shell: Shell
  changes: Changes
  pulse: { version: { get(): number } }
}

const changesTab = 'changes'

const markSize = 16

const titleOf = (thread: Thread) => thread.info.title || 'Untitled thread'

const projectMark = ({ kit, projects }: NeedsParts, thread: Thread) => () => {
  const { name, icon } = projects.shown({ path: thread.info.cwd, device: thread.device, project: thread.info.project, quick: thread.info.kind === 'quick' })
  return kit.projectIcon(name, icon, markSize)
}

const fileCount = (count: number) => `${count} ${count === 1 ? 'file' : 'files'}`

const fixPrompt = (clashes: string[]) =>
  `Your work clashes with the project in ${clashes.join(', ')}. Bring your work up to date with the project and resolve the clash, then tell me when it's ready to merge.`

const listed = (parts: NeedsParts) => {
  parts.pulse.version.get()
  return visibleThreads(parts.threads.list())
}

const opener = (parts: NeedsParts, thread: Thread): NeedAction => ({ label: 'Open', run: () => openThread(parts.ctx, parts.shell, thread.id) })

const clashText = ({ kit, changes }: NeedsParts, thread: Thread) => {
  const clashes = derive(() => changes.get(thread.id)?.clashes ?? [])
  const open = sig(false)
  return div(
    { class: 'flex min-w-0 flex-col gap-2' },
    span({}, 'Its changes clash with the project in ', kit.textToggle(open, () => fileCount(clashes.get().length)), '.'),
    show(open, () => dynamicChild(clashes, paths => div({ class: 'flex min-w-0 flex-col' }, ...paths.map(path => kit.monoMeta(path))))),
  )
}

const askToFix = (parts: NeedsParts, thread: Thread, clashes: string[]): NeedAction | undefined => {
  const sender = parts.ctx.get(turns)
  return sender && { label: 'Ask it to fix', run: () => sender.send(thread.id, fixPrompt(clashes)) }
}

const conflictNeed = (parts: NeedsParts, thread: Thread, change: ThreadChanges, trouble: string): Need => {
  const base = { id: `conflict:${thread.id}`, kind: 'conflict' as const, who: titleOf(thread), mark: projectMark(parts, thread), at: thread.info.updated }
  const clashes = change.clashes ?? []
  const fix = clashes.length ? askToFix(parts, thread, clashes) : undefined
  if (!fix) return { ...base, title: trouble, main: opener(parts, thread) }
  return { ...base, title: `Its changes clash with the project in ${fileCount(clashes.length)}`, text: () => clashText(parts, thread), main: fix, second: opener(parts, thread) }
}

export const conflictNeeds = (parts: NeedsParts) => ({
  id: 'conflicts',
  items: (): Need[] =>
    listed(parts).flatMap(thread => {
      const change = parts.changes.get(thread.id)
      const trouble = mergeTrouble(change)
      return change && trouble ? [conflictNeed(parts, thread, change, trouble)] : []
    }),
})

const reviewText = ({ kit, changes }: NeedsParts, thread: Thread) => {
  const change = () => changes.get(thread.id)
  return span(
    {},
    'Done. ',
    kit.emphasis(() => fileCount(change()?.files.length ?? 0)),
    ', ',
    span({ class: kit.toneText.success }, () => `+${change()?.add ?? 0}`),
    ' ',
    span({ class: kit.toneText.danger }, () => `−${change()?.del ?? 0}`),
    '.',
  )
}

const review = (parts: NeedsParts, thread: Thread) => {
  openThread(parts.ctx, parts.shell, thread.id)
  parts.ctx.get(panel)?.show(changesTab)
}

const reviewNeed = (parts: NeedsParts, thread: Thread): Need => ({
  id: `review:${thread.id}`,
  kind: 'review',
  who: titleOf(thread),
  mark: projectMark(parts, thread),
  title: 'Done and ready to merge',
  text: () => reviewText(parts, thread),
  at: thread.info.updated,
  main: { label: 'Merge', run: () => parts.changes.merge(thread) },
  second: { label: 'Review', run: () => review(parts, thread) },
})

export const reviewNeeds = (parts: NeedsParts) => ({
  id: 'review',
  items: (): Need[] => listed(parts).flatMap(thread => (thread.running || parts.changes.get(thread.id)?.state !== 'ready' ? [] : [reviewNeed(parts, thread)])),
})

const secretNeed = (parts: NeedsParts, thread: Thread, call: string, asked: string): Need => ({
  id: `secret:${thread.id}:${call}`,
  kind: 'secret',
  who: titleOf(thread),
  mark: projectMark(parts, thread),
  title: `Waiting on you: ${asked}`,
  text: () => span({}, 'Waiting on you: ', parts.kit.emphasis(asked), '.'),
  at: thread.started ?? thread.info.updated,
  main: { label: 'Sign in', run: () => openThread(parts.ctx, parts.shell, thread.id) },
})

export const secretNeeds = (parts: NeedsParts) => ({
  id: 'secrets',
  items: (): Need[] =>
    listed(parts).flatMap(thread => {
      const waiting = thread.waiting
      return waiting?.kind === 'secret' ? [secretNeed(parts, thread, waiting.call, waiting.title)] : []
    }),
})

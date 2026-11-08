import { botName, type BotTab } from '@sand/bots/contract'
import { planChangeWire, planRead } from '@sand/bot-plan/contract'
import { changesMerge } from '@sand/changes/contract'
import { featureState } from '@sand/features/contract'
import type { Status } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild, li, list, show, sig, span, ul, type Sig } from '@vaakx-dev/vrui'
import { statusLabel } from '../marks'
import { projectName, type Parts } from '../parts'
import { settled } from '../work'
import { parsePlan, type PlanItem } from './plan'

type Group = 'Ready' | 'Waiting' | 'In progress' | 'Next' | 'Done'

interface Shown {
  key: string
  item: PlanItem
  live?: BotTab
}

interface Block {
  key: string
  title?: string
  items: Shown[]
}

const order: Group[] = ['Ready', 'Waiting', 'In progress', 'Next', 'Done']

const groupOf: Record<Status, Group> = { ready: 'Ready', merging: 'Ready', waiting: 'Waiting', running: 'In progress', merged: 'Done', done: 'Done' }

const threadOf = (ref: string) => (ref.startsWith('thread:') ? ref.slice('thread:'.length) : undefined)

const planText = (parts: Parts, bot: string) => {
  const text = sig<string | undefined>(undefined)
  void parts.ctx.wire.call(planRead, { bot }).then(
    found => text.set(found),
    error => parts.ctx.report(error),
  )
  const stop = parts.ctx.wire.on(planChangeWire, ([changed, found]) => {
    if (changed === bot) text.set(found)
  })
  return { text, stop }
}

const mergeButton = (parts: Parts, ref: string, live: () => BotTab | undefined) => {
  const { kit } = parts.ctx
  const session = threadOf(ref)
  const sending = sig(false)
  const merging = () => sending.get() || live()?.status === 'merging'
  const merge = () => {
    if (!session) return
    sending.set(true)
    parts.ctx.wire
      .call(changesMerge, { session })
      .catch(error => parts.ctx.report(error))
      .finally(() => sending.set(false))
  }
  return kit.secondaryAction(
    { size: 'sm', class: 'shrink-0', disabled: merging, onClick: merge },
    dynamicChild(derive(merging), busy => (busy ? span({ class: 'flex items-center gap-2' }, kit.spinner('sm'), 'Merging') : span({}, 'Merge'))),
  )
}

const itemRow = (parts: Parts, bot: string, shown: Sig<Shown>) => {
  const { kit, markdown } = parts.ctx
  const { item } = shown.get()
  const ref = item.ref
  const live = () => shown.get().live
  const note = () => live()?.note || item.note
  const canMerge = () => {
    const status = live()?.status
    return status !== undefined && groupOf[status] === 'Ready' && parts.ctx.get(featureState)?.on('merge') !== false
  }
  const settledNow = () => {
    const status = live()?.status
    return status !== undefined && settled(status)
  }
  return li(
    { class: '-mx-2 flex' },
    kit.listRow({
      class: 'flex-1',
      title: span({ class: ['font-medium', () => (settledNow() ? 'text-neutral-400' : 'text-neutral-100')] }, ...markdown.inline(item.title)),
      meta: span({}, note),
      trail: dynamicChild(
        derive(() => {
          const found = live()
          return found ? `${found.status}:${found.at}` : ''
        }),
        () => {
          const found = live()
          return found ? statusLabel(kit, found.status, found.at) : null
        },
      ),
      ...(ref && { actions: show(canMerge, () => mergeButton(parts, ref, live)) }),
      disabled: () => !(ref && live()),
      onClick: () => {
        if (ref) parts.open(bot, ref)
      },
    }),
  )
}

const groupView = (parts: Parts, bot: string, group: Group, items: () => Shown[]) => {
  const { kit } = parts.ctx
  return show(
    () => items().length > 0,
    () =>
      kit.pageSection({ title: group }, list(derive(items), shown => shown.key, shown => itemRow(parts, bot, shown), ul({ class: 'flex flex-col' }))),
  )
}

const shownItems = (parts: Parts, items: PlanItem[]): Shown[] =>
  items.map((item, index) => {
    const live = item.ref ? parts.work.get(item.ref) : undefined
    return { key: item.ref ?? `${index}:${item.title}`, item, ...(live && { live }) }
  })

const blocksOf = (projects: string[], shown: Shown[], name: (project: string) => string): Block[] => {
  if (!projects.length) return [{ key: '', items: shown }]
  const projectOf = ({ live }: Shown) => (live ? (live.project ?? null) : projects.length === 1 ? (projects[0] ?? null) : null)
  const blocks = projects.map(project => ({ key: project, title: name(project), items: shown.filter(item => projectOf(item) === project) }))
  const other = shown.filter(item => {
    const project = projectOf(item)
    return project === null || !projects.includes(project)
  })
  return other.length ? [...blocks, { key: 'other', title: 'Other', items: other }] : blocks
}

const blockView = (parts: Parts, bot: string, block: Sig<Block>) => {
  const { kit } = parts.ctx
  const inGroup = (group: Group) => () => block.get().items.filter(item => (item.live ? groupOf[item.live.status] : 'Next') === group)
  const title = block.get().title
  return div(
    { class: 'flex flex-col gap-6' },
    title ? kit.pageTitle(() => block.get().title ?? '') : null,
    ...order.map(group => groupView(parts, bot, group, inGroup(group))),
    show(
      () => !block.get().items.length,
      () => kit.emptyState({ text: () => `Nothing planned yet. Work ${botName(parts.store.find(bot) ?? { name: '' })} starts shows here.`, flush: true }),
    ),
  )
}

export const projectPage = (parts: Parts, bot: string) => {
  const { kit, markdown } = parts.ctx
  const { text, stop } = planText(parts, bot)
  const plan = derive(() => {
    const source = text.get()
    return source === undefined ? undefined : parsePlan(source, parts.work.schemes())
  })
  const shown = derive(() => {
    const items = plan.get()?.items ?? []
    const planned = new Set(items.map(item => item.ref))
    const unplanned = parts.work
      .list(bot)
      .filter(tab => !settled(tab.status) && !planned.has(tab.ref))
      .map(tab => ({ title: tab.title, note: '', ref: tab.ref }))
    return shownItems(parts, [...items, ...unplanned])
  })
  const blocks = derive(() => (plan.get() === undefined ? [] : blocksOf(parts.store.find(bot)?.projects ?? [], shown.get(), project => projectName(parts, project))))

  return kit.pageBody(
    { onMount: () => stop },
    dynamicChild(
      derive(() => plan.get()?.rest ?? ''),
      rest => (rest ? div({ class: 'text-sm text-neutral-400' }, ...markdown.nodes(rest)) : null),
    ),
    list(blocks, block => block.key, block => blockView(parts, bot, block), div({ class: 'flex flex-col gap-10' })),
    show(
      () => plan.get() === undefined,
      () => kit.loadingState(),
    ),
  )
}

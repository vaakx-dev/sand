import type { Command, PickItem, ReportRow, UI } from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { commandThread } from '@sand/kit'
import type { LoopsContext } from './context'
import type { LoopInfo, Loops } from './contract'

type Active = (session: Session) => boolean

const describe = (loop: LoopInfo) => (loop.quarantined ? `${loop.label} (switched off: ${loop.quarantined})` : loop.label)

const safeNote = (ctx: LoopsContext) => (ctx.cli.safe ? ' Safe mode is on, so turns use react until you restart normally.' : '')

const choose = (ctx: LoopsContext, ui: UI, loops: Loops, active: Active, name: string | null) => {
  if (name !== null && !loops.get(name)) return ui.notify(`No agent loop named ${name}. Try /loop to see them.`, 'error')
  const session = ctx.sessions ? commandThread(ui, ctx.sessions, ctx.modelSettings) : ui.session()
  if (!session) return ui.notify('Open a thread first', 'error')
  loops.choose(session, name)
  const state = loops.state(session)
  const timing = active(session) ? ' from the next turn' : ''
  ui.notify(`This thread uses ${state.label} (${state.name})${timing}.${safeNote(ctx)}`)
}

const report = (ctx: LoopsContext, ui: UI, loops: Loops) => {
  const session = ui.session()
  const current = session && loops.state(session)
  const rows: ReportRow[] = loops.list().map(loop => ({
    kind: 'pair',
    label: `${loop.name}${current?.name === loop.name ? ' *' : ''}`,
    value: describe(loop),
  }))
  ui.report('Agent loops', [...rows, { kind: 'text', text: `Default: ${loops.defaultName()}.${safeNote(ctx)}` }])
}

const itemOf = (loop: LoopInfo): PickItem<string | null> => ({
  label: loop.label,
  detail: loop.quarantined ? `switched off: ${loop.quarantined}` : loop.description,
  value: loop.name,
  ...(loop.quarantined && { tone: 'warning' as const }),
})

const pick = async (ctx: LoopsContext, ui: UI, loops: Loops, active: Active) => {
  const session = ui.session()
  const chosen = session ? loops.state(session).chosen : null
  const items: PickItem<string | null>[] = [{ label: 'Default', detail: loops.defaultName(), value: null }, ...loops.list().map(itemOf)]
  const selected = Math.max(0, items.findIndex(item => item.value === chosen))
  const picked = await ui.choose('Agent loop', items, { selected })
  if (!picked || picked.value === undefined) return
  choose(ctx, ui, loops, active, picked.value)
}

const setDefault = async (ctx: LoopsContext, ui: UI, loops: Loops, name: string) => {
  if (!name) return ui.notify(`The default loop is ${loops.defaultName()}.`)
  await loops.setDefault(name)
  ui.notify(`New threads use ${name} unless they choose another loop.${safeNote(ctx)}`)
}

export const loopCommand = (ctx: LoopsContext, ui: UI, loops: Loops, active: Active): Command => ({
  name: 'loop',
  title: 'Agent loop',
  description: 'Choose how the agent works in this thread',
  args: '[name | default [name]]',
  async run(args) {
    const [first = '', ...rest] = args.trim().split(/\s+/).filter(Boolean)
    if (!first) return ctx.cli.mode === 'print' ? report(ctx, ui, loops) : pick(ctx, ui, loops, active)
    if (first === 'default') return setDefault(ctx, ui, loops, rest.join(' '))
    choose(ctx, ui, loops, active, first)
  },
})

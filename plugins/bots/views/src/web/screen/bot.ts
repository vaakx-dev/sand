import { botName, botRoute, type BotPatch, type BotSummary } from '@sand/bots/contract'
import type { ChatAction } from '@sand/transcript/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { Route, Screen } from '@sand/ui-shell/contract'
import { div, dynamicChild, onRaf, show, span, untrack } from '@vaakx-dev/vrui'
import { chatView } from '../chat/view'
import { jobsView } from '../jobs/view'
import type { BotView, Parts } from '../parts'
import { botStatus } from '../work'

const fill = 'flex min-h-0 min-w-0 flex-1 flex-col'

const CHOICES: { value: BotView; label: string }[] = [
  { value: 'jobs', label: 'Jobs' },
  { value: 'chat', label: 'Chat' },
]

const faceStateOf = (bot: BotSummary): FaceState | undefined => (botStatus(bot) === 'running' ? 'running' : undefined)

const missing = ({ ctx: { kit } }: Parts) => kit.pageBody({}, kit.emptyState({ text: 'This bot is gone.' }))

const headerOf = (parts: Parts, id: string, view: () => BotView) => {
  const { kit } = parts.ctx
  const bot = () => parts.store.find(id)
  const title = () => botName(bot() ?? { name: '' })
  const face = (found: BotSummary | undefined) => {
    if (!found) return null
    const state = faceStateOf(found)
    return span({ class: 'shrink-0' }, kit.botFace(id, found.color, 26, state ? { state, label: botName(found) } : { label: botName(found) }))
  }
  const choose = (tab: BotView) => parts.ctx.shell.open({ kind: botRoute, id, tab }, { replace: true })
  const actions = () => (view() === 'chat' ? parts.ctx.shownChats.actions() : [])
  const actionButton = ({ label, icon, run }: ChatAction) => kit.iconButton({ title: label, 'aria-label': label, onClick: () => run(id) }, kit.icon(icon))
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-3' },
    dynamicChild(bot, face),
    kit.barTitle(title),
    span({ class: 'flex-1' }),
    dynamicChild(actions, shown => div({ class: 'flex md:hidden' }, shown.map(actionButton))),
    kit.segmented(CHOICES, view, choose, { label: 'View', class: 'shrink-0' }),
  )
}

export const botScreen = (parts: Parts, route: () => Route): Screen => {
  const id = untrack(route).id ?? ''
  const known = () => Boolean(parts.store.find(id))
  const gone = () => parts.store.bots.get() !== undefined && !known()
  const save = (patch: BotPatch) => void parts.toasts.attempt('Couldn’t save the bot', () => parts.store.update(id, patch))
  const view = (): BotView => {
    const tab = route().tab
    if (tab === 'jobs' || tab === 'chat') return tab
    return parts.store.find(id)?.jobs.length ? 'jobs' : 'chat'
  }

  const screen = () => {
    const chat = chatView({
      ctx: parts.ctx,
      id,
      talk: parts.chats.get(id),
      bot: () => parts.store.find(id),
      shown: () => view() === 'chat',
      profile: () => parts.profile(id),
      resume: () => save({ paused: false }),
      save,
      defaults: () => parts.defaults.get(),
      advanced: () => parts.advanced.get(),
    })
    const inChat = (then: () => void) => {
      parts.open(id, 'chat')
      onRaf(then, chat.view)
    }
    const jobs = {
      parts,
      bot: id,
      answer: ({ question }: { question: string }) => inChat(() => chat.answer(question)),
      reveal: (entry: string) => {
        parts.open(id, 'chat')
        void parts.ctx.shownChats.show({ conversation: id, entry, words: [] })
      },
    }
    return div(
      { class: fill },
      show(
        () => view() === 'jobs',
        () => jobsView(jobs),
      ),
      div({ class: fill, hidden: () => view() !== 'chat' }, chat.view),
    )
  }

  return {
    head: () => headerOf(parts, id, view),
    main: () =>
      div(
        { class: fill },
        show(gone, () => missing(parts)),
        show(known, screen),
      ),
  }
}

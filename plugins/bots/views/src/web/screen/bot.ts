import { botName, type BotPatch, type BotSummary } from '@sand/bots/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { Route, Screen } from '@sand/ui-shell/contract'
import { div, dynamicChild, show, span, untrack } from '@vaakx-dev/vrui'
import { chatView } from '../chat/view'
import type { Parts } from '../parts'
import { botStatus } from '../work'

const fill = 'flex min-h-0 min-w-0 flex-1 flex-col'

const faceStateOf = (bot: BotSummary): FaceState | undefined => (botStatus(bot) === 'running' ? 'running' : undefined)

const missing = ({ ctx: { kit } }: Parts) => kit.pageBody({}, kit.emptyState({ text: 'This bot is gone.' }))

const headerOf = (parts: Parts, id: string) => {
  const { kit } = parts.ctx
  const bot = () => parts.store.find(id)
  const title = () => botName(bot() ?? { name: '' })
  const face = (found: BotSummary | undefined) => {
    if (!found) return null
    const state = faceStateOf(found)
    return span({ class: 'shrink-0' }, kit.botFace(id, found.color, 26, state ? { state, label: botName(found) } : { label: botName(found) }))
  }
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-3' },
    dynamicChild(bot, face),
    kit.barTitle(title),
  )
}

export const botScreen = (parts: Parts, route: () => Route): Screen => {
  const id = untrack(route).id ?? ''
  const known = () => Boolean(parts.store.find(id))
  const gone = () => parts.store.bots.get() !== undefined && !known()
  const save = (patch: BotPatch) => void parts.toasts.attempt('Couldn’t save the bot', () => parts.store.update(id, patch))
  return {
    head: () => headerOf(parts, id),
    main: () =>
      div(
        { class: fill },
        show(gone, () => missing(parts)),
        show(known, () =>
          div(
            { class: fill },
            chatView({
              ctx: parts.ctx,
              id,
              talk: parts.chats.get(id),
              bot: () => parts.store.find(id),
              profile: () => parts.profile(id),
              resume: () => save({ paused: false }),
              save,
              defaults: () => parts.defaults.get(),
              advanced: () => parts.advanced.get(),
            }),
          ),
        ),
      ),
  }
}

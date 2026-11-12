import { botName, type BotPatch, type BotSummary } from '@sand/bots/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { Route, Screen } from '@sand/ui-shell/contract'
import { div, show, span, untrack } from '@vaakx-dev/vrui'
import { chatView } from '../chat/view'
import type { Parts } from '../parts'
import { botStatus } from '../work'

const fill = 'flex min-h-0 min-w-0 flex-1 flex-col'

const faceStateOf = (bot: BotSummary | undefined): FaceState | undefined => {
  if (!bot) return undefined
  const status = botStatus(bot)
  return status === 'running' ? 'running' : undefined
}

const missing = ({ ctx: { kit } }: Parts) => kit.pageBody({}, kit.emptyState({ text: 'This bot is gone.' }))

const headerOf = (parts: Parts, id: string) => {
  const { kit } = parts.ctx
  const bot = () => parts.store.find(id)
  const faceState = () => faceStateOf(bot())
  const title = () => botName(bot() ?? { name: '' })
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-3' },
    span({ class: 'shrink-0' }, kit.botFace(id, bot()?.color ?? 'grey', 26, faceState() ? { state: faceState(), label: title() } : { label: title() })),
    kit.barTitle(title),
  )
}

export const botScreen = (parts: Parts, route: () => Route): Screen => {
  const id = untrack(route).id ?? ''
  const known = () => Boolean(parts.store.find(id))
  const gone = () => parts.store.bots.get() !== undefined && !known()
  const save = (patch: BotPatch) => void parts.store.update(id, patch).catch(error => parts.ctx.report(error))
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

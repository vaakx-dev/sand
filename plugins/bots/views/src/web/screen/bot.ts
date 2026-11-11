import { botName, type BotPatch, type BotSummary } from '@sand/bots/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { Route, Screen } from '@sand/ui-shell/contract'
import { div, show, span, untrack } from '@vaakx-dev/vrui'
import { chatView } from '../chat/view'
import type { Parts } from '../parts'

const fill = 'flex min-h-0 min-w-0 flex-1 flex-col'

const faceStateOf = (parts: Parts, bot: BotSummary | undefined): FaceState | undefined => {
  if (!bot) return undefined
  const status = parts.work.status(bot)
  if (status === 'running' || status === 'merging') return 'running'
  if (status === 'waiting') return 'waiting'
  return undefined
}

const missing = (parts: Parts) =>
  div(
    { class: [fill, 'items-center justify-center px-6'] },
    parts.ctx.kit.emptyState({ text: 'This bot is gone.' }),
  )

const headerOf = (parts: Parts, id: string) => {
  const { kit } = parts.ctx
  const bot = () => parts.store.find(id)
  const faceState = () => faceStateOf(parts, bot())
  const detail = () => (bot() ? parts.work.detailOf(bot()!) : undefined)
  const title = () => botName(bot() ?? { name: '' })
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-3' },
    span({ class: 'shrink-0' }, kit.botFace(id, bot()?.color ?? 'grey', 26, faceState() ? { state: faceState(), label: title() } : { label: title() })),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      kit.barTitle(title),
      show(
        () => Boolean(detail()?.text),
        () => span({ class: detail()?.waiting ? 'text-xs text-warning-400' : 'text-xs text-neutral-500' }, () => detail()?.text ?? ''),
      ),
    ),
  )
}

export const botScreen = (parts: Parts, route: () => Route): Screen => {
  const id = untrack(route).id ?? ''
  const known = () => Boolean(parts.store.find(id))
  const save = (patch: BotPatch) => void parts.store.update(id, patch).catch(error => parts.ctx.report(error))
  return {
    head: () => headerOf(parts, id),
    main: () =>
      div(
        { class: fill },
        show(
          () => !known(),
          () => missing(parts),
        ),
        show(known, () =>
          div(
            { class: fill },
            chatView({
              ctx: parts.ctx,
              id,
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

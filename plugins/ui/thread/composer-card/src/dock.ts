import { div } from '@sand/dom'
import { chatDrop } from './attachments/drop'
import { card, type Card, type CardParts } from './card'
import { completionPopup } from './components/glass'
import { errorBanners } from './errors'
import { parentRect, publishHeight } from './integrations/measure'
import { queueBanner } from './queue/banner'
import { tray } from './tray'

export const dock = (parts: CardParts, built: (card: Card) => void) => {
  const current = card(parts)
  built(current)
  const view = div(
    { class: 'cc-dock pointer-events-none relative z-10 shrink-0 px-3 pt-12 pb-3 md:px-4' },
    div(
      { class: 'pointer-events-auto relative mx-auto w-full max-w-3xl' },
      div({ class: 'relative flex flex-col', hidden: () => current.completion.open() }, ...errorBanners(parts.ctx, parts.model), queueBanner(parts.ctx, parts.model), parts.slots.host('banner', 'relative flex flex-col')),
      div({ class: 'relative' }, completionPopup(() => !current.completion.open(), ...current.completion.view), div({ class: 'relative z-10' }, current.node)),
      tray(parts.slots),
    ),
    chatDrop(parts.dropping, () => parentRect(view)),
  )
  publishHeight(view, '--dock-h')
  return view
}

import type { BotChat, BotChatPart } from '@sand/bots/contract'
import type { ChatDock } from '@sand/composer/contract'
import { byOrder, joinDisposers } from '@sand/util'
import { derive, effect, list, sig, untrack, type Sig } from '@vaakx-dev/vrui'

export const chatParts = () => {
  const parts = sig<BotChatPart[]>([])
  const host: BotChat = {
    part(part) {
      parts.update(all => [...all.filter(other => other.id !== part.id), part].sort(byOrder))
      return () => parts.update(all => all.filter(other => other !== part))
    },
  }
  return { parts, host }
}

export const beside = (parts: Sig<BotChatPart[]>, bot: string, into: HTMLElement) =>
  list(
    derive(() =>
      parts.get().flatMap(part => {
        const render = part.beside
        return render ? [{ id: part.id, render }] : []
      }),
    ),
    shown => shown.id,
    shown => untrack(() => shown.get()).render(bot),
    into,
  )

export const aboveDock = (parts: Sig<BotChatPart[]>, bot: string, dock: ChatDock) =>
  effect(() => {
    const shown = parts.get().flatMap(part => (part.above ? [{ render: part.above, order: part.order }] : []))
    return untrack(() => joinDisposers(...shown.map(({ render, order }) => dock.slot('above', () => render(bot), order))))
  })

import type { BotChat, BotChatPart } from '@sand/bots/contract'
import { byOrder } from '@sand/util'
import { derive, list, sig, untrack, type Sig } from '@vaakx-dev/vrui'

export type ChatSlot = 'beside' | 'above'

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

export const slotted = (parts: Sig<BotChatPart[]>, slot: ChatSlot, bot: string, into: HTMLElement) =>
  list(
    derive(() =>
      parts.get().flatMap(part => {
        const render = part[slot]
        return render ? [{ id: part.id, render }] : []
      }),
    ),
    shown => shown.id,
    shown => untrack(() => shown.get()).render(bot),
    into,
  )

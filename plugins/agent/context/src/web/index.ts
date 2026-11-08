import type { ContextRecord } from '@sand/chats/contract'
import { place } from '@sand/ui-shell/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin, type Dispose } from 'drydock'
import { contextChips, type ChipKind, type ChipLink } from '../contract'
import { chipView } from './chip'
import { detailsSheet } from './details'
import { kindRegistry } from '../registry'
import { fallbackChip, fileChip, threadChip } from './kinds'

export default definePlugin({
  name: 'context-chips',
  description: 'Draws context links as chips and shows what each one points at',
  inject: { kit, threads },
  apply(ctx) {
    const kinds = kindRegistry<ChipKind>()
    let closeDetails: Dispose | undefined

    const kindOf = (name: string) => kinds.get(name) ?? fallbackChip(name)

    const close = () => {
      void closeDetails?.()
      closeDetails = undefined
    }

    const details = (link: ChipLink, record: ContextRecord | undefined) => {
      close()
      closeDetails = place(ctx, 'overlay', () => detailsSheet(ctx.kit, kindOf(link.kind), link, record, close), 100)
    }

    const chip = (link: ChipLink, record?: ContextRecord) => chipView(ctx.kit, kindOf(link.kind), link, record, () => details(link, record))

    ctx.provide(contextChips, { register: kinds.register, chip })
    ctx.effect(() => kinds.register(fileChip))
    ctx.effect(() => kinds.register(threadChip(ctx.kit, ctx.threads)))
  },
})

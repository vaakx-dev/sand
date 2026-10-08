import { effect, untrack, type Pulse, type Sig } from '@sand/dom'
import type { Composer } from '@sand/protocol'
import type { PickerContext } from '../target'
import { sendBackFor, sendBackKey } from './target'
import { sendBackView } from './view'

export const mountSendBack = (ctx: PickerContext, composer: Composer, changes: Pulse, armed: Sig<string | undefined>) => {
  const key = changes.read(() => sendBackKey(sendBackFor(ctx, armed.get())))
  return effect(() => {
    if (!key.get()) return
    const remove = untrack(() => {
      const found = sendBackFor(ctx, armed.get())
      return found ? composer.slot('above', () => sendBackView(ctx, found), -5) : undefined
    })
    return () => void remove?.()
  })
}

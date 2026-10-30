import type { PagePairing } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, effect, sig, untrack } from '@vaakx-dev/vrui'
import { overlaySlot } from '../shared/overlay'
import type { Ui } from '../ui'
import { busyCard, type CardParts, deniedCard, expiredCard, failedCard, removedCard, waitingCard, wrongKindCard } from './cards'

const hidden = new Set<PagePairing['phase']>(['checking', 'paired'])

const cardOf = (parts: CardParts, state: PagePairing, error: string) => {
  if (state.phase === 'requesting') return waitingCard(parts, state.request)
  if (state.phase === 'removed') return removedCard(parts, state)
  if (state.phase === 'denied') return deniedCard(parts)
  if (state.phase === 'failed') return failedCard(parts, state.error)
  if (state.phase === 'redeeming') return busyCard(parts, 'Pairing this browser…')
  if (state.phase === 'unpaired' && state.refused === 'invalid') return expiredCard(parts)
  if (state.phase === 'unpaired' && state.refused === 'wrong-kind') return wrongKindCard(parts)
  if (error) return failedCard(parts, error)
  return busyCard(parts, 'Asking to join…')
}

const autoAsk = (state: PagePairing) => state.phase === 'expired' || (state.phase === 'unpaired' && !state.refused)

const cover = (ui: Ui, parts: CardParts, state: () => PagePairing, error: () => string) =>
  div(
    { class: [ui.kit.layer.dialog, 'fixed inset-0 flex justify-center overflow-auto bg-neutral-900 px-3 py-4 md:px-4 md:py-8'], style: ui.kit.stableGutter },
    div(
      { class: 'flex h-fit w-full max-w-xl flex-col gap-4 rounded-xl bg-neutral-800 p-4', role: 'dialog', 'aria-label': 'Pair this browser' },
      dynamicChild(
        derive(() => ({ state: state(), error: error() })),
        current => cardOf(parts, current.state, current.error),
      ),
    ),
  )

export const unpairedPage = (ui: Ui) => {
  const slot = overlaySlot(ui.ctx, 200)
  const asking = sig(false)
  const error = sig('')
  const state = ui.data.paired
  const shown = derive(() => !hidden.has(state.get().phase))

  const ask = async () => {
    if (asking.get()) return
    asking.set(true)
    error.set('')
    try {
      await ui.ctx.pcs.requestJoin()
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      asking.set(false)
    }
  }

  const parts: CardParts = { ui, pc: () => ui.data.nameOf(ui.data.homeId()), ask: () => void ask(), asking: () => asking.get() }

  effect(() => {
    const current = state.get()
    if (autoAsk(current)) untrack(() => void ask())
  })
  effect(() => {
    const on = shown.get()
    untrack(() => (on ? slot.open(() => cover(ui, parts, () => state.get(), () => error.get())) : slot.close()))
  })
}

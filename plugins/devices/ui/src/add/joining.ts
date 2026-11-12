import { type OutgoingJoin, type PairJoinResult, unjoinedText } from '@sand/devices-contract'
import type { Ui } from '../ui'
import { joinedText } from './words'

export const othersThan = (ui: Ui, pc: string) =>
  ui.data.pcs
    .get()
    .filter(view => view.id !== pc)
    .map(view => ui.data.nameOf(view.id))

const nameOf = (ui: Ui, result: PairJoinResult, join: OutgoingJoin | undefined) => join?.name ?? ui.data.nameOf(result.pc)

export const reportJoins = (ui: Ui, shown: () => boolean) =>
  ui.data.joins.onResult((result, join) => {
    const name = nameOf(ui, result, join)
    if (result.outcome === 'cancelled') return
    if (result.outcome !== 'approved') return ui.toasts.show({ tone: 'danger', title: unjoinedText(name, result.outcome, result.error) })
    if (!shown()) ui.toasts.show({ tone: 'success', title: `${name} joined your PCs` })
  })

export const whenJoined = (ui: Ui, joined: (title: string, text: string) => void) =>
  ui.data.joins.onResult((result, join) => {
    if (result.outcome === 'approved') joined(`${nameOf(ui, result, join)} joined your PCs`, joinedText(othersThan(ui, result.pc)))
  })

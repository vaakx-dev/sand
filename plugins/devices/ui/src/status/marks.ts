import type { PcMarks, PcTone } from '@sand/devices-contract'
import type { Ui } from '../ui'
import { toneDot } from './dot'
import { statusWords, toneOf } from './words'

export const createMarks = (ui: Ui): PcMarks => {
  const { data } = ui
  const tone = (pc: string): PcTone => {
    data.changes.version.get()
    const view = ui.ctx.pcs.get(pc)
    return view ? toneOf(view.status) : 'off'
  }
  const words = (pc: string) => {
    data.changes.version.get()
    data.now.get()
    const view = ui.ctx.pcs.get(pc)
    return view ? statusWords(view, data.nameOf, ui.device()) : 'Not one of your PCs'
  }
  return {
    tone,
    words,
    dot: pc => toneDot(ui.kit, () => tone(pc), () => `${data.nameOf(pc)}: ${words(pc)}`),
    why: pc => ui.open.why(pc),
  }
}

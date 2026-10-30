import type { PcView } from '@sand/devices-contract'
import { derive, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import { toneDot } from '../../status/dot'
import { statusWords, toneOf } from '../../status/words'
import type { Ui } from '../../ui'

const whyLook = (view: PcView) => {
  const { status } = view
  if (status.phase === 'connected') return undefined
  return status.phase === 'blocked' ? 'strong' : 'quiet'
}

const whyButton = (ui: Ui, view: Sig<PcView>) => {
  const { quietButton, secondaryAction } = ui.kit
  const open = () => ui.open.why(view.get().id)
  return dynamicChild(
    derive(() => whyLook(view.get())),
    look => {
      if (look === 'strong') return secondaryAction({ size: 'sm', onClick: open }, 'Why?')
      return look ? quietButton({ size: 'sm', surface: 'group', onClick: open }, 'Why?') : null
    },
  )
}

export const pcRow = (ui: Ui, view: Sig<PcView>) => {
  const { chevron, listRow, statusLine } = ui.kit
  const words = () => statusWords(view.get(), ui.data.nameOf, ui.device(), ui.data.now.get())
  return listRow({
    surface: 'group',
    title: () => ui.data.nameOf(view.get().id),
    meta: statusLine({ mark: toneDot(ui.kit, () => toneOf(view.get().status), words), text: words, title: words }),
    trail: chevron(() => false),
    actions: whyButton(ui, view),
    onClick: () => ui.open.details(view.get().id),
  })
}

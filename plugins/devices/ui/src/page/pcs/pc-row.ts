import type { PcView } from '@sand/devices-contract'
import type { Sig } from '@vaakx-dev/vrui'
import { withIconPicker } from '../../icon/row'
import { toneDot } from '../../status/dot'
import { statusWords, toneOf } from '../../status/words'
import type { Ui } from '../../ui'

export const whyLook = ({ status }: PcView) => {
  if (status.phase === 'connected') return undefined
  return status.phase === 'blocked' ? 'strong' : 'quiet'
}

const whyButton = (ui: Ui, view: Sig<PcView>) => {
  const { quietButton, secondaryAction } = ui.kit
  const open = () => ui.open.why(view.get().id)
  const look = whyLook(view.get())
  if (look === 'strong') return secondaryAction({ size: 'sm', onClick: open }, 'Why?')
  return look ? quietButton({ size: 'sm', onClick: open }, 'Why?') : null
}

export const pcRow = (ui: Ui, view: Sig<PcView>) => {
  const { settingsRow, statusLine } = ui.kit
  const words = () => statusWords(view.get(), ui.data.nameOf, ui.device(), ui.data.now.get())
  return withIconPicker(ui, view, lead =>
    settingsRow(
      {
        lead,
        title: () => ui.data.nameOf(view.get().id),
        detail: statusLine({ mark: toneDot(ui.kit, () => toneOf(view.get().status), words), text: words, title: words }),
        onOpen: () => ui.open.details(view.get().id),
      },
      whyButton(ui, view),
    ),
  )
}

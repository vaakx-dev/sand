import type { PcView } from '@sand/devices-contract'
import { derive, dynamicChild } from '@vaakx-dev/vrui'
import type { Ui } from '../../ui'
import { installRow, waitingRow } from './install-row'
import { pcRow, whyLook } from './pc-row'

const byHomeThenName = (a: PcView, b: PcView) => Number(b.home) - Number(a.home) || a.name.localeCompare(b.name)

export const pcsSection = (ui: Ui) => {
  const { errorState, icon, quietButton, rowList, settingsSection } = ui.kit
  const { data } = ui
  const pcs = derive(() => [...data.pcs.get()].sort(byHomeThenName))
  const running = derive(() => data.installs.running(data.now.get()))
  const waiting = derive(() => data.installs.waiting(data.now.get()))
  return settingsSection(
    { title: 'PCs', action: quietButton({ size: 'sm', 'aria-label': 'Add a PC', onClick: () => ui.open.add('list') }, icon('plus', 'sm'), 'Add') },
    rowList(pcs, pc => `${pc.id} ${whyLook(pc) ?? ''}`, view => pcRow(ui, view)),
    rowList(running, entry => entry.install, entry => installRow(ui, entry)),
    rowList(waiting, grant => grant.id, grant => waitingRow(ui, grant)),
    dynamicChild(data.installs.progress.error, error =>
      error ? errorState({ flush: true, text: `Couldn’t load installs: ${error}`, retry: () => void data.installs.progress.refresh() }) : null,
    ),
  )
}

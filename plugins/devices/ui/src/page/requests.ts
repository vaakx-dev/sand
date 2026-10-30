import { derive, show } from '@vaakx-dev/vrui'
import { requestRow } from '../requests/row'
import type { Ui } from '../ui'

export const requestsSection = (ui: Ui) => {
  const { rowList, settingsSection } = ui.kit
  const waiting = derive(() => ui.data.requests.live(ui.data.now.get()))
  return show(
    () => waiting.get().length > 0,
    () =>
      settingsSection(
        { title: 'Asking to join' },
        rowList(waiting, request => request.id, request => requestRow(ui, request)),
      ),
  )
}

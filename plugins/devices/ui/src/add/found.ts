import type { DiscoveredPc } from '@sand/devices-contract'
import { derive, div, dynamicChild, sig, span, type Sig } from '@vaakx-dev/vrui'
import { kindIcon, platformWords } from '../requests/words'
import { command, note } from '../shared/parts'
import { pinCode } from '../shared/pin'
import type { Ui } from '../ui'
import { sourceWords } from './words'

export interface FoundPc {
  id: string
  name: string
  platform: string
  urls: DiscoveredPc[]
}

const rank = (pc: DiscoveredPc) => (pc.via === 'lan' ? 0 : 1)

export const groupFound = (list: DiscoveredPc[]): FoundPc[] => {
  const byId = new Map<string, FoundPc>()
  for (const pc of [...list].sort((a, b) => rank(a) - rank(b))) {
    const known = byId.get(pc.id) ?? { id: pc.id, name: pc.name, platform: pc.platform, urls: [] }
    byId.set(pc.id, { ...known, urls: [...known.urls, pc] })
  }
  return [...byId.values()]
}

const waitingDetail = (ui: Ui, name: string, code: string) =>
  div(
    { class: 'flex flex-col gap-1.5' },
    ui.kit.statusLine({ mark: ui.kit.spinner('xs'), text: `Tap Allow on ${name}`, title: '' }),
    pinCode(code, 'sm'),
  )

const foundRow = (ui: Ui, found: Sig<FoundPc>) => {
  const { icon, primaryAction, quietButton, settingsRow } = ui.kit
  const busy = sig(false)
  const join = derive(() => ui.data.joins.joinOf(found.get().id))
  const connect = async () => {
    const [first] = found.get().urls
    if (!first) return
    busy.set(true)
    await ui.toasts.attempt(`Couldn’t ask ${found.get().name} to let you in`, ui.data.joins.join(first.url, first.id))
    busy.set(false)
  }
  const detail = () => [platformWords(found.get().platform), ...found.get().urls.map(url => sourceWords[url.via])].filter(Boolean).join(' · ')
  return settingsRow(
    {
      lead: span({ class: 'inline-flex text-neutral-400' }, icon(kindIcon('pc', found.get().platform), 'md')),
      title: () => found.get().name,
      detail: dynamicChild(join, current => (current ? waitingDetail(ui, found.get().name, current.code) : span(detail))),
    },
    dynamicChild(join, current =>
      current
        ? quietButton({ size: 'sm', surface: 'group', onClick: () => void ui.toasts.attempt('Couldn’t cancel the request', ui.data.joins.cancel(current.id)) }, 'Cancel')
        : primaryAction({ size: 'sm', disabled: busy, onClick: () => void connect() }, 'Connect'),
    ),
  )
}

export const foundSection = (ui: Ui, useLink: () => void) => {
  const { emptyState, errorState, linkButton, rowList, settingsSection, sheetText, spinner } = ui.kit
  const { found } = ui.data.joins
  void found.refresh()
  const pcs = derive(() => groupFound(ui.data.joins.unpaired()))
  const waiting = derive(() => pcs.get().map(pc => ui.data.joins.joinOf(pc.id)).find(Boolean))
  return div(
    { class: 'flex flex-col gap-3' },
    settingsSection(
      { title: 'PCs found on your network', action: span({ class: 'inline-flex', title: 'Still looking' }, spinner('xs')) },
      rowList(pcs, pc => pc.id, pc => foundRow(ui, pc)),
      dynamicChild(
        derive(() => !pcs.get().length && !found.error.get()),
        empty => (empty ? emptyState({ surface: 'group', text: 'No PCs found yet. Still looking…' }) : null),
      ),
      dynamicChild(found.error, error =>
        error ? errorState({ surface: 'group', text: `Couldn’t look for PCs: ${error}`, retry: () => void found.refresh() }) : null,
      ),
    ),
    dynamicChild(waiting, join =>
      join
        ? note(`${join.name} shows the same code on its own screen and on devices paired with it. Nothing paired with it? Run `, command(`sand devices approve ${join.code}`), ' on it.')
        : sheetText('Not listed? Check that sand is running on it and it’s on the same wifi or Tailscale. ', linkButton({ onClick: useLink }, 'Use a link instead')),
    ),
  )
}

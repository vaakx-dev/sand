import type { Kit } from '@sand/ui-kit/contract'
import { div, p, show, sig } from '@vaakx-dev/vrui'
import type { AddonSource } from '../contract'
import { busy, working } from './rows'
import type { FeatureStore } from './store'

const TRUST = 'Add-ons from other people run on this PC with the same access as sand, like any plugin you add. Add sources you trust.'

const sourceDetail = ({ removable, error }: AddonSource) => error ?? (removable ? 'Added by you' : "sand's own add-ons")

const removeSourceButton = (kit: Kit, store: FeatureStore, { id, label }: AddonSource) => {
  const action = { id: 'remove', label: `Remove ${label}`, icon: 'trash', danger: true, confirm: `Add-ons you installed from ${label} stay, but get no updates.`, run: () => store.removeSource(id) }
  return kit.iconButton({ title: 'Remove', 'aria-label': `Remove ${label}`, disabled: () => busy(store), onClick: (event: MouseEvent) => kit.confirm(event)(action) }, kit.icon('trash'))
}

const sourceRow = (kit: Kit, store: FeatureStore, source: AddonSource) =>
  kit.settingsRow({ title: source.label, detail: sourceDetail(source) }, working(kit, store, source.id), source.removable ? removeSourceButton(kit, store, source) : null)

const addForm = (kit: Kit, store: FeatureStore) => {
  const open = sig(false)
  const address = sig('')
  const submit = async () => {
    if (!address.get().trim()) return
    if (!(await store.addSource(address.get()))) return
    address.set('')
    open.set(false)
  }
  const form = () =>
    div(
      { class: 'flex flex-col gap-3 pb-3' },
      kit.field(
        { label: 'GitHub repository or catalog address' },
        kit.textInput({ placeholder: 'owner/name or https://…', bindValue: address, onMount: node => node.focus(), onKeyDown: (event: KeyboardEvent) => event.key === 'Enter' && void submit() }),
      ),
      p({ class: 'text-xs text-neutral-500' }, TRUST),
      div(
        { class: 'flex items-center gap-2' },
        kit.primaryAction({ size: 'sm', disabled: () => busy(store) || !address.get().trim(), onClick: () => void submit() }, 'Add source'),
        kit.quietButton({ size: 'sm', onClick: () => open.set(false) }, 'Cancel'),
        show(() => busy(store), () => kit.spinner()),
      ),
    )
  return div(
    { class: 'contents' },
    show(
      () => !open.get(),
      () => kit.settingsRow({ title: 'Add a source', detail: 'Another GitHub repository or server that publishes add-ons' }, kit.secondaryAction({ size: 'sm', onClick: () => open.set(true) }, 'Add')),
    ),
    show(() => open.get(), form),
  )
}

const sourcesSection = (kit: Kit, store: FeatureStore, sources: AddonSource[]) =>
  kit.settingsSection({ title: 'Sources' }, ...sources.map(source => sourceRow(kit, store, source)), addForm(kit, store))

export { sourcesSection }

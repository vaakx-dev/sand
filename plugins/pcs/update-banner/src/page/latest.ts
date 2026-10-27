import type { Kit } from '@sand/ui-kit/contract'
import { ago, exactTime, plural } from '@sand/util'
import { clock, derive, dynamicChild, show } from '@vaakx-dev/vrui'
import { changesRow } from '../changes'
import type { Fleet } from '../fleet/model'
import { changesFor } from '../fleet/status'

const listedWhenCurrent = 10

const localState = (fleet: Fleet) => fleet.pcs.get().find(pc => pc.local)?.state

const checkedText = (fleet: Fleet) => {
  const state = localState(fleet)
  if (state?.checking) return 'Checking now…'
  if (!state?.checkedAt) return 'Not checked yet'
  const when = ago(state.checkedAt)
  return when === 'now' ? 'Checked just now' : `Checked ${when} ago`
}

const latestLabel = (fleet: Fleet) => {
  const target = fleet.target.get()
  if (target) return target.name
  return localState(fleet)?.checking ? 'Checking GitHub…' : 'No release found yet'
}

export const latestSection = (kit: Kit, fleet: Fleet, open: () => void) => {
  const { errorState, openTab, primaryAction, quietButton, secondaryAction, settingsRow, settingsSection } = kit
  const now = clock(30_000)
  const pending = fleet.pending
  const changes = derive(() => {
    const target = fleet.target.get()
    if (pending.get().length) return changesFor(target, pending.get().map(pc => pc.status))
    return (target?.changes ?? []).slice(0, listedWhenCurrent)
  })
  const checkError = () => localState(fleet)?.checkError ?? ''
  const published = () => {
    now.get()
    const target = fleet.target.get()
    return [target ? `Published ${exactTime(target.publishedAt)}` : '', checkedText(fleet)].filter(Boolean).join(' · ')
  }
  return settingsSection(
    { title: 'Latest', action: quietButton({ size: 'sm', disabled: fleet.busy, onClick: () => void fleet.check() }, 'Check now') },
    settingsRow(
      { title: () => latestLabel(fleet), detail: published },
      [
        show(
          () => !!fleet.target.get(),
          () => secondaryAction({ size: 'sm', onClick: () => openTab(fleet.target.get()?.notesUrl ?? '') }, 'Release notes'),
        ),
        show(
          () => pending.get().length > 0,
          () => primaryAction({ size: 'sm', onClick: open }, () => `Update ${plural(pending.get().length, 'PC')}`),
        ),
      ],
    ),
    dynamicChild(
      changes.map(list => list.map(change => change.commit).join()),
      () => (changes.get().length ? changesRow(kit, changes.get()) : null),
    ),
    show(() => !!checkError(), () => errorState({ surface: 'group', text: checkError })),
  )
}

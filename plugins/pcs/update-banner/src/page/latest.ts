import { ago, clock, derive, div, dynamicChild, exactTime, p, primaryAction, secondaryAction, settingsRow, settingsSection, show } from '@sand/dom'
import { changeList } from '../changes'
import type { Fleet } from '../fleet/model'
import { changesFor } from '../fleet/status'
import { plural } from '../fleet/text'

const openTab = (url: string) => void window.open(url, '_blank', 'noopener,noreferrer')

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

const errorText = (text: () => string) =>
  div({ class: 'bg-neutral-900 px-4 py-3' }, p({ class: 'text-xs wrap-anywhere whitespace-pre-wrap text-danger-400' }, text))

export const latestSection = (fleet: Fleet, open: () => void) => {
  const now = clock(30_000)
  const pending = fleet.pending
  const changes = derive(() => {
    const target = fleet.target.get()
    if (pending.get().length) return changesFor(target, pending.get().map(pc => pc.status))
    return (target?.changes ?? []).slice(0, listedWhenCurrent)
  })
  const checkError = () => localState(fleet)?.checkError ?? ''
  return settingsSection(
    { title: 'Latest' },
    settingsRow(
      () => latestLabel(fleet),
      [
        show(
          fleet.target.map(target => !!target),
          () => secondaryAction({ size: 'sm', onClick: () => openTab(fleet.target.get()?.notesUrl ?? '') }, 'Release notes'),
        ),
        show(
          pending.map(list => list.length > 0),
          () => primaryAction({ size: 'sm', onClick: open }, () => `Update ${plural(pending.get().length, 'PC')}`),
        ),
      ],
      () => {
        now.get()
        const target = fleet.target.get()
        return [target ? `Published ${exactTime(target.publishedAt)}` : '', checkedText(fleet)].filter(Boolean).join(' · ')
      },
    ),
    dynamicChild(
      changes.map(list => list.map(change => change.commit).join()),
      () => (changes.get().length ? div({ class: 'bg-neutral-900 px-4 py-3' }, changeList(changes.get())) : div()),
    ),
    show(derive(() => !!checkError()), () => errorText(checkError)),
  )
}

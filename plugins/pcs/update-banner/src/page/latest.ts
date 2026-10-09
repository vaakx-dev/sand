import type { UpdateState } from '@sand/protocol'
import { ago, clock, div, exactTime, p, primaryAction, secondaryAction, settingsRow, settingsSection, show, spinner } from '@sand/dom'
import type { UpdateSource } from '../source'
import { isBusy, progressText, short } from '../text'

const openTab = (url: string) => void window.open(url, '_blank', 'noopener,noreferrer')

const latestLabel = (state: UpdateState | undefined) => {
  if (state?.latest) return `Sand ${state.latest.name}`
  return state?.checking ? 'Checking GitHub…' : 'No release found yet'
}

const latestDetail = (state: UpdateState | undefined) => {
  const latest = state?.latest
  if (!state || !latest) return ''
  const published = `Published ${exactTime(latest.publishedAt)} · build ${short(latest.build.id)}`
  if (state.available) return published
  if (latest.build.id === state.current?.id) return `${published} · this PC is up to date`
  return `${published} · this PC runs a newer build`
}

const canInstall = (state: UpdateState | undefined) =>
  !!state?.installed && !!state.latest && state.latest.build.id !== state.current?.id && !isBusy(state)

const checkedText = (state: UpdateState | undefined) => {
  if (state?.checking) return 'Checking now…'
  if (!state?.checkedAt) return 'Not checked yet'
  const when = ago(state.checkedAt)
  return when === 'now' ? 'Just now' : `${when} ago`
}

const errorText = (text: () => string) =>
  div({ class: 'bg-neutral-900 px-4 py-3' }, p({ class: 'text-xs wrap-anywhere whitespace-pre-wrap text-danger-400' }, text))

export const latestSection = (source: UpdateSource) => {
  const state = () => source.state.get()
  const now = clock(30_000)
  const idle = () => !source.busy.get() && !isBusy(state())
  return settingsSection(
    { title: 'Updates' },
    settingsRow(
      () => latestLabel(state()),
      [
        show(
          source.state.map(current => !!current?.latest),
          () => secondaryAction({ size: 'sm', onClick: () => openTab(source.state.get()?.latest?.notesUrl ?? '') }, 'Release notes'),
        ),
        show(
          source.state.map(current => canInstall(current)),
          () =>
            primaryAction(
              { size: 'sm', disabled: () => !idle(), onClick: () => void source.apply() },
              () => (state()?.available ? 'Update' : 'Install this build'),
            ),
        ),
      ],
      () => latestDetail(state()),
    ),
    show(
      source.state.map(current => isBusy(current)),
      () => settingsRow(() => progressText(state()!), spinner()),
    ),
    show(
      source.state.map(current => current?.phase === 'failed'),
      () => errorText(() => state()?.error ?? 'Could not update sand'),
    ),
    settingsRow(
      'Last checked',
      secondaryAction({ size: 'sm', disabled: () => !idle() || !!state()?.checking, onClick: () => void source.check() }, 'Check now'),
      () => {
        now.get()
        return checkedText(state())
      },
    ),
    show(
      source.state.map(current => !!current?.checkError),
      () => errorText(() => state()?.checkError ?? ''),
    ),
  )
}

import type { UpdateState } from '@sand/protocol'
import { exactTime, settingsRow, settingsSection, toggleSwitch } from '@sand/dom'
import type { UpdateSource } from '../source'
import { isBusy, short } from '../text'

const versionLabel = (state: UpdateState | undefined) => {
  const current = state?.current
  if (!current) return 'Sand'
  const build = `build ${short(current.id)}`
  return state.latest?.build.id === current.id ? `Sand ${state.latest.name} · ${build}` : `Sand ${build}`
}

const versionDetail = (state: UpdateState | undefined) => {
  if (!state) return 'Loading…'
  const built = state.current ? `Built ${exactTime(state.current.time)}` : ''
  return state.installed ? built : [built, 'runs from a source folder, so it does not update itself'].filter(Boolean).join(' · ')
}

export const versionSection = (source: UpdateSource) => {
  const nightly = () => source.state.get()?.channel === 'nightly'
  return settingsSection(
    { title: 'This PC' },
    settingsRow(
      () => versionLabel(source.state.get()),
      null,
      () => versionDetail(source.state.get()),
    ),
    settingsRow(
      'Nightly builds',
      toggleSwitch({
        on: nightly,
        'aria-label': 'Nightly builds',
        disabled: () => source.busy.get() || isBusy(source.state.get()) || !source.state.get(),
        onClick: () => void source.setChannel(nightly() ? 'release' : 'nightly'),
      }),
      'Get the newest build from every night instead of waiting for releases. Nightly builds may break.',
    ),
  )
}

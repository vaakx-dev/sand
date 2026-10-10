import type { UpdateChannel, UpdateState } from '@sand/host-updates/contract'
import { exactTime, segmented, settingsRow, settingsSection } from '@sand/dom'
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

const channels: { value: UpdateChannel; label: string; detail: string }[] = [
  { value: 'release', label: 'Releases', detail: 'Get tested releases only.' },
  { value: 'nightly', label: 'Nightly', detail: 'Get the newest build once a day. Nightly builds may break.' },
  { value: 'dev', label: 'Dev', detail: 'Get a build for every change pushed to sand. Dev builds break more often.' },
]

const channelDetail = (state: UpdateState | undefined) => channels.find(channel => channel.value === state?.channel)?.detail ?? ''

export const versionSection = (source: UpdateSource) => {
  const locked = () => source.busy.get() || isBusy(source.state.get()) || !source.state.get()
  const choose = (channel: UpdateChannel) => {
    if (!locked() && channel !== source.state.get()?.channel) void source.setChannel(channel)
  }
  return settingsSection(
    { title: 'This PC' },
    settingsRow(
      () => versionLabel(source.state.get()),
      null,
      () => versionDetail(source.state.get()),
    ),
    settingsRow(
      'Updates from',
      segmented(channels, () => source.state.get()?.channel, choose, { label: 'Updates from', inset: true }),
      () => channelDetail(source.state.get()),
    ),
  )
}

import { settingMark, type SettingsItem } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { show } from '@vaakx-dev/vrui'
import type { AppUpdate } from '../app/update'

const appItem: SettingsItem = { id: 'app', label: 'Android app', keywords: ['phone', 'apk', 'update app', 'install'] }

const appTitle = ({ offer }: AppUpdate) => (offer.get() ? 'A newer app is ready' : 'The app is up to date')

const appDetail = ({ install }: AppUpdate) => {
  const state = install.get()
  return state.step === 'downloading' ? `Downloading ${Math.round(state.fraction * 100)}%` : ''
}

const failure = ({ install }: AppUpdate) => {
  const state = install.get()
  return state.step === 'failed' ? state.reason : ''
}

const appSection = (kit: Kit, update: AppUpdate) => {
  const { errorState, primaryAction, settingsRow, settingsSection } = kit
  const downloading = () => update.install.get().step === 'downloading'
  return settingsSection(
    { ...settingMark(appItem.id), title: 'This app' },
    settingsRow(
      { title: () => appTitle(update), detail: () => appDetail(update) },
      show(
        () => !!update.offer.get(),
        () => primaryAction({ size: 'sm', disabled: downloading, onClick: update.start }, 'Update app'),
      ),
    ),
    show(
      () => !!failure(update),
      () => errorState({ text: () => failure(update) }),
    ),
  )
}

export { appItem, appSection }

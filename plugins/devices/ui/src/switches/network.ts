import { derive, dynamicChild, show, sig, span } from '@vaakx-dev/vrui'
import type { PcSettings } from '../data/pc-settings'
import type { Ui } from '../ui'

export const networkRows = (ui: Ui, settings: PcSettings, name: () => string) => {
  const { callout, errorState, loadingState, primaryAction, rowDetail, settingsRow, toggleSwitch } = ui.kit
  const { network } = settings
  const busy = sig(false)
  const confirming = sig(false)
  const open = () => network.value.get()?.scope === 'network'
  const view = ui.data.view(settings.pc)
  const overNetwork = derive(() => {
    const status = view.get()?.status
    return status?.phase === 'connected' && status.route.kind !== 'local'
  })

  const apply = async (on: boolean) => {
    confirming.set(false)
    busy.set(true)
    await ui.toasts.attempt(`Couldn’t change who can reach ${name()}`, settings.setScope(on ? 'network' : 'local'))
    busy.set(false)
  }
  const toggle = () => {
    if (open() && overNetwork.get()) return confirming.update(value => !value)
    void apply(!open())
  }

  return [
    show(
      () => !network.loaded.get() && !network.error.get(),
      () => loadingState({ surface: 'group' }),
    ),
    dynamicChild(network.error, error =>
      error ? errorState({ surface: 'group', text: `Couldn’t check ${name()}’s network setting: ${error}`, retry: () => void network.refresh() }) : null,
    ),
    show(network.loaded, () =>
      settingsRow(
        { title: 'Open to your network', detail: () => `Phones and PCs on your wifi can reach ${name()}. When off, only ${name()} itself can.` },
        toggleSwitch({ on: open, 'aria-label': 'Open to your network', disabled: busy, onClick: toggle }),
      ),
    ),
    show(confirming, () =>
      rowDetail(
        callout(
          'warning',
          span({ class: 'min-w-0 flex-1' }, `${ui.device()} reaches ${name()} over your network, so it will lose its connection.`),
          primaryAction({ size: 'sm', onClick: () => void apply(false) }, 'Turn off anyway'),
        ),
      ),
    ),
  ]
}

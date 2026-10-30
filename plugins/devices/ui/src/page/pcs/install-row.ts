import type { InstallGrant, InstallProgress, InstallStep } from '@sand/devices-contract'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { clockWords } from '../../shared/time'
import type { Ui } from '../../ui'

const steps: Partial<Record<InstallStep, [number, string]>> = {
  connected: [1, 'connected'],
  sand: [2, 'downloading sand'],
  plugins: [3, 'adding plugins'],
  pairing: [4, 'joining your PCs'],
  checking: [4, 'checking it works'],
  sharing: [5, 'sharing accounts'],
}

const stepCount = 5

const cancel = (ui: Ui, id: string) => () => void ui.toasts.attempt('Couldn’t cancel the install', ui.data.installs.cancel(id))

const progressDetail = (ui: Ui, entry: InstallProgress) => {
  const { icon, progressSteps, spinner, statusLine } = ui.kit
  if (entry.step === 'failed')
    return statusLine({ mark: span({ class: 'inline-flex text-danger-400' }, icon('alert', 'xs')), text: `Couldn’t install: ${entry.error ?? 'unknown error'}`, title: entry.error ?? '' })
  const [at, words] = steps[entry.step] ?? [stepCount, 'finishing']
  return div(
    { class: 'flex flex-col gap-1' },
    statusLine({ mark: spinner('xs'), text: `Installing (step ${at} of ${stepCount}) · ${words}`, title: words }),
    progressSteps(stepCount, at),
  )
}

export const installRow = (ui: Ui, entry: Sig<InstallProgress>) => {
  const { quietButton, settingsRow } = ui.kit
  const { install } = entry.get()
  return settingsRow(
    { title: () => entry.get().name ?? 'New PC', detail: dynamicChild(entry, current => progressDetail(ui, current)) },
    dynamicChild(
      entry.map(current => current.step === 'failed'),
      failed =>
        failed
          ? quietButton({ size: 'sm', surface: 'group', onClick: () => ui.data.installs.dismiss(install) }, 'Dismiss')
          : quietButton({ size: 'sm', surface: 'group', onClick: cancel(ui, install) }, 'Cancel'),
    ),
  )
}

export const waitingRow = (ui: Ui, grant: Sig<InstallGrant>) => {
  const { icon, quietButton, settingsRow, statusLine } = ui.kit
  const { id, expires } = grant.get()
  return settingsRow(
    {
      title: span({ class: 'text-neutral-400' }, 'Waiting for new PC…'),
      detail: statusLine({ mark: icon('clock', 'xs'), text: `Run the command on it · works until ${clockWords(expires)}`, title: '' }),
    },
    quietButton({ size: 'sm', surface: 'group', onClick: () => ui.open.command(id) }, 'Show command'),
    quietButton({ size: 'sm', surface: 'group', onClick: cancel(ui, id) }, 'Cancel'),
  )
}

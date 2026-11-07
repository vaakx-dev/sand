import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, show, sig, span } from '@vaakx-dev/vrui'
import { externalSources, type External, type SourceStatus } from '../../../contract'
import { task } from '../../task'
import type { LoginsModel } from '../model'
import { editForm, field, rowProblem } from '../parts'
import { managers, type Manager } from './catalog'

type Status = SourceStatus['status']

const missing: SourceStatus = { status: 'missing' }

const checkable: Status[] = ['missing', 'signed-out', 'failed']

const withAccount = (label: string, account?: string) => (account ? `${label} · ${account}` : label)

const removable = (status: SourceStatus) => (status.status === 'ready' || status.status === 'failed') && status.saved

const statusText = ({ command, install, signedOut, ready, app }: Manager, status: SourceStatus) => {
  switch (status.status) {
    case 'missing':
      return `${command} CLI not found. Install it from ${install}. sand looks for ${command} on PATH, or at the path set as ${command} under [plugins.logins] in sand.toml.`
    case 'signed-out':
      return signedOut
    case 'locked':
      return withAccount('Locked', status.account)
    case 'ready':
      return withAccount(!status.saved && app ? app : ready, status.account)
    case 'failed':
      return status.message
  }
}

const connectForm = (kit: Kit, { label, save, note, autocomplete }: Manager['connect'], connect: (secret: string) => Promise<unknown>, close: () => void) => {
  const secret = sig('')
  return editForm(
    kit,
    { save, ready: () => Boolean(secret.get()), submit: () => connect(secret.get()), done: close, cancel: close },
    field(kit, label, { type: 'password', autocomplete, bindValue: secret, onMount: node => node.focus() }),
    div({ class: 'text-xs text-neutral-400' }, note),
  )
}

const managerRow = (kit: Kit, model: LoginsModel, source: External) => {
  const { secondaryAction, settingsRow, rowDetail, toneText } = kit
  const manager = managers[source]
  const status = derive(() => model.state.get()?.sources[source] ?? missing)
  const has = (statuses: Status[]) => () => statuses.includes(status.get().status)
  const connectable = has(manager.connect.statuses)
  const opened = sig(false)
  const work = task()
  const action = (label: string, run: () => Promise<unknown>) => secondaryAction({ size: 'sm', disabled: work.busy, onClick: () => void work.run(run) }, label)
  return div(
    { class: 'contents' },
    settingsRow(
      {
        title: manager.name,
        detail: span({ class: () => (status.get().status === 'failed' ? toneText.danger : undefined) }, () => statusText(manager, status.get())),
      },
      show(has(checkable), () => action('Check again', model.load)),
      show(() => removable(status.get()), () => action(manager.disconnect, () => model.disconnect(source))),
      show(
        () => !opened.get() && connectable(),
        () => secondaryAction({ size: 'sm', onClick: () => opened.set(true) }, manager.connect.open),
      ),
    ),
    show(
      () => opened.get() && connectable(),
      () => rowDetail(connectForm(kit, manager.connect, secret => model.connect(source, secret), () => opened.set(false))),
    ),
    rowProblem(kit, work),
  )
}

export const managersSection = (kit: Kit, model: LoginsModel) =>
  kit.settingsSection({ title: 'Password managers' }, ...externalSources.map(source => managerRow(kit, model, source)))

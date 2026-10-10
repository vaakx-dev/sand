import { badge, div, dynamicChild, primaryAction, secondaryAction, settingsSection, sig } from '@sand/dom'
import type { DetectedServer } from '../../contract'
import { accountLogo } from '../names'
import { accountRow, actions, note } from '../parts'
import type { LoginControl } from '../state'

const modelCount = (count: number) => (count === 1 ? '1 model' : `${count} models`)

const hostOf = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/v1\/?$/, '')

const isAdded = (control: LoginControl, server: DetectedServer) => !!control.state.get()?.accounts.some(account => account.kind === 'server' && account.url === server.url)

const foundRow = (control: LoginControl, server: DetectedServer, add: (server: DetectedServer) => void) =>
  accountRow(
    accountLogo(server.provider),
    server.name,
    `${hostOf(server.url)} · ${modelCount(server.models)}`,
    isAdded(control, server) ? badge('success', 'Added') : primaryAction({ size: 'sm', onClick: () => add(server) }, 'Add'),
  )

const nothing = (look: () => void, custom: () => void) =>
  div(
    { class: 'flex flex-col gap-4' },
    note("Didn't find Ollama at localhost:11434 or LM Studio at localhost:1234. Start one and look again, or enter its URL."),
    actions(secondaryAction({ onClick: custom }, 'Enter a URL'), primaryAction({ onClick: look }, 'Look again')),
  )

export const detectStep = (control: LoginControl, add: (server: DetectedServer) => void, custom: () => void) => {
  const found = sig<DetectedServer[] | undefined>(undefined)
  const look = async () => {
    found.set(undefined)
    found.set(await control.detect())
  }
  void look()
  return dynamicChild(found, list => {
    if (!list) return note('Looking for Ollama and LM Studio on this PC…')
    if (!list.length) return nothing(() => void look(), custom)
    return settingsSection({}, list.map(server => foundRow(control, server, add)))
  })
}

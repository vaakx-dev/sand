import { plural } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, sig } from '@vaakx-dev/vrui'
import type { DetectedServer } from '../../contract'
import { accountLogo } from '../names'
import type { LoginControl } from '../state'

const shortUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/v1\/?$/, '')

const isAdded = (control: LoginControl, server: DetectedServer) => !!control.state.get()?.accounts.some(account => account.kind === 'server' && account.url === server.url)

const foundRow = (kit: Kit, control: LoginControl, server: DetectedServer, add: (server: DetectedServer) => void) => {
  const { badge, itemRow, primaryAction } = kit
  return itemRow(
    {},
    accountLogo(kit, server.provider),
    server.name,
    `${shortUrl(server.url)} · ${plural(server.models, 'model')}`,
    isAdded(control, server) ? badge('success', 'Added') : primaryAction({ size: 'sm', onClick: () => add(server) }, 'Add'),
  )
}

const nothing = ({ note, primaryAction, secondaryAction, sheetStep }: Kit, look: () => void, custom: () => void) =>
  sheetStep(
    note("Didn't find Ollama at localhost:11434 or LM Studio at localhost:1234. Start one and look again, or enter its URL."),
    secondaryAction({ onClick: custom }, 'Enter a URL'),
    primaryAction({ onClick: look }, 'Look again'),
  )

export const detectStep = (kit: Kit, control: LoginControl, add: (server: DetectedServer) => void, custom: () => void) => {
  const { note, settingsSection, sheetStep } = kit
  const found = sig<DetectedServer[] | undefined>(undefined)
  const look = async () => {
    found.set(undefined)
    found.set(await control.detect())
  }
  void look()
  return dynamicChild(found, list => {
    if (!list) return sheetStep(note('Looking for Ollama and LM Studio on this PC…'))
    if (!list.length) return nothing(kit, () => void look(), custom)
    return sheetStep(settingsSection({}, list.map(server => foundRow(kit, control, server, add))))
  })
}

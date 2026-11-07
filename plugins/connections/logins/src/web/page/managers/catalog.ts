import type { External, Source, SourceStatus } from '../../../contract'

type Status = SourceStatus['status']

export interface Manager {
  name: string
  short: string
  command: string
  install: string
  signedOut: string
  ready: string
  app?: string
  pick: string
  connect: { open: string; label: string; save: string; note: string; autocomplete: AutoFill; statuses: Status[] }
  disconnect: string
}

export const managers: Record<External, Manager> = {
  bitwarden: {
    name: 'Bitwarden',
    short: 'Bitwarden',
    command: 'bw',
    install: 'bitwarden.com/help/cli',
    signedOut: 'Signed out. Run bw login in a terminal, then unlock it here.',
    ready: 'Unlocked',
    pick: 'A login or secure note from your Bitwarden vault',
    connect: {
      open: 'Unlock',
      label: 'Master password',
      save: 'Unlock',
      note: 'Used once to unlock Bitwarden. sand keeps only the session, encrypted.',
      autocomplete: 'current-password',
      statuses: ['locked', 'failed'],
    },
    disconnect: 'Lock',
  },
  'bitwarden-secrets': {
    name: 'Bitwarden Secrets Manager',
    short: 'Secrets Manager',
    command: 'bws',
    install: 'bitwarden.com/help/secrets-manager-cli',
    signedOut: 'No access token yet.',
    ready: 'Ready',
    pick: 'A secret from a project the machine account can read',
    connect: {
      open: 'Set token',
      label: 'Access token',
      save: 'Save token',
      note: 'A machine account access token. sand keeps it encrypted.',
      autocomplete: 'off',
      statuses: ['signed-out', 'ready', 'failed'],
    },
    disconnect: 'Remove token',
  },
  '1password': {
    name: '1Password',
    short: '1Password',
    command: 'op',
    install: 'developer.1password.com/docs/cli',
    signedOut: 'Not signed in. Turn on the CLI integration in the 1Password app, or set a service account token.',
    ready: 'Ready',
    app: 'Ready, uses the 1Password app',
    pick: 'A login or API credential from your 1Password vaults',
    connect: {
      open: 'Set token',
      label: 'Service account token',
      save: 'Save token',
      note: 'Optional: without one, sand uses the 1Password app. sand keeps it encrypted.',
      autocomplete: 'off',
      statuses: ['signed-out', 'ready', 'failed'],
    },
    disconnect: 'Remove token',
  },
}

export const placeOf = (source: Source) => (source === 'sand' ? 'sand' : managers[source].short)

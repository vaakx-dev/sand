import type { Kind } from '@sand/connections/contract'
import { call, type Address } from './graph'

export interface Endpoints {
  api: string
  authorize: string
  token: string
}

const login = 'https://login.microsoftonline.com/common/oauth2/v2.0'

export const microsoft: Endpoints = {
  api: 'https://graph.microsoft.com/v1.0',
  authorize: `${login}/authorize`,
  token: `${login}/token`,
}

export const kindId = 'microsoft-calendar'

const scope = (name: string) => `https://graph.microsoft.com/${name}`

const steps = [
  '1. Sign in to the Microsoft Entra admin center (entra.microsoft.com) and open App registrations, then New registration. A personal Microsoft account works too: it gets a free directory of its own.',
  '2. Name the app and, under Supported account types, choose accounts in any organizational directory and personal Microsoft accounts.',
  '3. Under Redirect URI, pick "Public client/native (mobile & desktop)" and enter http://localhost.',
  '4. Register it, then paste the Application (client) ID from its overview here. It needs no client secret.',
  'Work and school accounts may need an administrator to allow the app to read and change calendars.',
].join('\n')

export const kindOf = ({ api, authorize, token }: Endpoints): Kind => ({
  id: kindId,
  label: 'Outlook Calendar',
  oauth: {
    authorize,
    token,
    scopes: ['offline_access', scope('Calendars.ReadWrite')],
    readOnlyScopes: ['offline_access', scope('Calendars.Read')],
    loopback: 'localhost',
    setup: { help: 'https://learn.microsoft.com/entra/identity-platform/quickstart-register-app', steps },
    async identify(fetch, signal) {
      const { owner } = await call<{ owner?: Address }>(fetch, `${api}/me/calendar?$select=owner`, { signal })
      if (!owner?.address) throw new Error("Outlook didn't say whose calendar this is")
      return owner.address
    },
  },
})

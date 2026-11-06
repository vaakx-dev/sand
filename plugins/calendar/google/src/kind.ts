import type { Kind } from '@sand/connections/contract'
import { call } from './google'

export interface Endpoints {
  api: string
  authorize: string
  token: string
}

export const google: Endpoints = {
  api: 'https://www.googleapis.com/calendar/v3',
  authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
}

export const kindId = 'google-calendar'

const scope = (name: string) => `https://www.googleapis.com/auth/${name}`

const steps = [
  '1. In the Google Cloud console, create a project.',
  '2. Enable the Google Calendar API for it.',
  '3. Set up the OAuth consent screen for external users and set its publishing status to "In production". While it says "Testing", Google ends your sign-in after 7 days.',
  '4. Create an OAuth client of type "Desktop app".',
  '5. Paste its client ID and client secret here.',
  'When you sign in, Google warns that it hasn\'t verified the app. It\'s your own client, so choose Advanced and continue.',
].join('\n')

export const kindOf = ({ api, authorize, token }: Endpoints): Kind => ({
  id: kindId,
  label: 'Google Calendar',
  oauth: {
    authorize,
    token,
    scopes: [scope('calendar.events'), scope('calendar.calendarlist.readonly'), scope('calendar.events.freebusy')],
    readOnlyScopes: [scope('calendar.events.readonly'), scope('calendar.calendarlist.readonly'), scope('calendar.events.freebusy')],
    params: { access_type: 'offline', prompt: 'consent' },
    loopback: '127.0.0.1',
    setup: { help: 'https://developers.google.com/workspace/guides/create-credentials#desktop-app', steps },
    async identify(fetch, signal) {
      const { id } = await call<{ id: string }>(fetch, `${api}/calendars/primary`, { signal })
      return id
    },
  },
})

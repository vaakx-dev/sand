import type { Field, Kind } from '@sand/connections/contract'
import { davClient, type Login } from './dav'
import { discover } from './discover'

interface Service {
  id: string
  label: string
  server?: string
  user: Field
  password: Field
  help?: string
}

const services: Service[] = [
  {
    id: 'icloud',
    label: 'iCloud Calendar',
    server: 'https://caldav.icloud.com',
    user: { key: 'email', label: 'Apple ID email', placeholder: 'you@icloud.com' },
    password: { key: 'password', label: 'App-specific password', secret: true, placeholder: 'xxxx-xxxx-xxxx-xxxx' },
    help: 'https://support.apple.com/en-us/102654',
  },
  {
    id: 'fastmail',
    label: 'Fastmail',
    server: 'https://caldav.fastmail.com',
    user: { key: 'username', label: 'Fastmail email', placeholder: 'you@fastmail.com' },
    password: { key: 'password', label: 'App password', secret: true },
    help: 'https://www.fastmail.help/hc/en-us/articles/360058752854-App-passwords',
  },
  {
    id: 'caldav',
    label: 'CalDAV',
    user: { key: 'username', label: 'Username' },
    password: { key: 'password', label: 'Password', secret: true },
  },
]

const serverField: Field = { key: 'server', label: 'Server', placeholder: 'https://dav.example.com' }

const serverOf = (value: string | undefined) => {
  if (value && URL.canParse(value) && /^https?:$/.test(new URL(value).protocol)) return value
  throw new Error('Enter the server address, starting with https://')
}

export interface CaldavKind {
  kind: Kind
  login(values: Record<string, string>): Login
}

export const kinds = services.map(({ id, label, server, user, password, help }): CaldavKind => {
  const login = (values: Record<string, string>): Login => ({
    server: server ?? serverOf(values.server),
    username: values[user.key] ?? '',
    password: values[password.key] ?? '',
  })
  return {
    login,
    kind: {
      id,
      label,
      form: {
        fields: [...(server ? [] : [serverField]), user, password],
        ...(help && { help }),
        async check(values, signal) {
          const found = login(values)
          await discover(davClient(found), found.server, signal)
          return found.username
        },
      },
    },
  }
})

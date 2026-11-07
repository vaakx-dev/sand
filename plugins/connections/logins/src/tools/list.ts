import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Access, Login } from '../contract'
import { group, type ToolDeps } from './deps'

const input = z.object({})

const asks: Record<Access, string> = { allowed: 'used freely', ask: 'asks the user each time' }

const line = ({ id, name, kind, site, totp, access }: Login & { access: Access }) =>
  [`${id}: ${name}`, kind === 'website' ? `website login for ${site}${totp ? ', with authenticator' : ''}` : 'key', asks[access]].join(' · ')

export const listTool = ({ logins }: ToolDeps): Tool<typeof input> => ({
  name: 'logins',
  group,
  description:
    "List the user's saved logins (website logins and keys) with their ids. You never see their values: fill a website login into the browser with login_fill and login_code, or pass a key to a Shell command with its logins parameter.",
  input,
  effect: 'read',
  run: (_input, { conversation }) => logins.service.list(conversation).map(line).join('\n') || 'The user has no saved logins. Ask for one with request_secret.',
})

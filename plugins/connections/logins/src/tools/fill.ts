import type { Filled } from '@sand/computers/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { websiteOf } from '../service'
import { computerInput, fillerOf, group, loginInput, type ToolDeps } from './deps'

const input = z.object({ login: loginInput, computer: computerInput })

export const filledText = (filled: Filled[]) => (filled.length ? `Filled ${filled.join(' and ')}.` : 'Found no field to fill on this page.')

export const fillTool = (deps: ToolDeps): Tool<typeof input> => ({
  name: 'login_fill',
  group,
  description:
    "Fill a saved website login's username and password into the sign-in form open in the browser; you never see them. The page must be on the login's site. Submit the form yourself, then use login_code if it asks for a code.",
  input,
  needs: ['computer'],
  effect: 'read',
  async run({ login, computer }, { conversation }) {
    const site = websiteOf(deps.logins.find(login))
    const fill = fillerOf(deps, computer)
    const values = await deps.logins.service.use(login, { conversation, action: 'fill', site })
    if (values.kind === 'key') throw new Error(`${login} holds a key, not a website login`)
    return filledText(await fill({ site, username: values.username, password: values.password }))
  },
})

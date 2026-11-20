import type { Conversation } from '@sand/engine/contract'
import { loginValues, type Logins } from '@sand/logins/contract'
import type { Act } from '@sand/tools/contract'
import { z } from 'zod'

type Wanted = Record<string, string>

const envName = /^[A-Za-z_][A-Za-z0-9_]*$/

export const loginsField = z
  .record(z.string(), z.string().min(1))
  .refine(wanted => Object.keys(wanted).every(name => envName.test(name)), 'Variable names use only letters, digits and _, and don’t start with a digit')
  .optional()
  .describe(
    'Saved logins as environment variables: name to "<login id>", or "<login id>/username" for a username. Use them as "$NAME" ($env:NAME in PowerShell); never echo or save them.',
  )

export const loginsAct = (wanted: Wanted, command: string): Act => {
  const used = Object.keys(wanted).length > 0
  return { effect: 'run', summary: command, ...(used && { uses: 'login' }) }
}

export const loginEnv = async (service: Logins, wanted: Wanted, conversation: Conversation) => {
  const values = await loginValues(service, Object.values(wanted), { conversation, action: 'env' })
  return Object.fromEntries(Object.entries(wanted).map(([name, ref]) => [name, values.get(ref)]))
}

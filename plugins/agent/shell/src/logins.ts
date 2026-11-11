import type { Conversation } from '@sand/engine/contract'
import type { Logins, LoginValues } from '@sand/logins/contract'
import { z } from 'zod'

type Wanted = Record<string, string>

const usernameSuffix = '/username'

const envName = /^[A-Za-z_][A-Za-z0-9_]*$/

export const loginsField = z
  .record(z.string(), z.string().min(1))
  .refine(wanted => Object.keys(wanted).every(name => envName.test(name)), 'Variable names use only letters, digits and _, and don’t start with a digit')
  .optional()
  .describe(
    'Saved logins to hand this command as environment variables, by variable name: "<login id>" for a key\'s value or a website\'s password, "<login id>/username" for a website\'s username. Reference them in the command as "$NAME" ($env:NAME in PowerShell). Never echo, print or save them: you never see their values, and they are hidden from the output.',
  )

const refOf = (ref: string) =>
  ref.endsWith(usernameSuffix) ? { id: ref.slice(0, -usernameSuffix.length), username: true } : { id: ref, username: false }

const valueOf = (values: LoginValues, id: string, username: boolean) => {
  if (values.kind === 'website') return username ? values.username : values.password
  if (username) throw new Error(`The login ${id} is a key and has no username`)
  return values.value
}

export const loginEnv = async (service: Logins, wanted: Wanted, conversation: Conversation) => {
  const used = new Map<string, Promise<LoginValues>>()
  const use = (id: string) => {
    const values = used.get(id) ?? service.use(id, { conversation, action: 'env' })
    used.set(id, values)
    return values
  }
  const entries = await Promise.all(
    Object.entries(wanted).map(async ([name, ref]) => {
      const { id, username } = refOf(ref)
      return [name, valueOf(await use(id), id, username)] as const
    }),
  )
  return Object.fromEntries(entries)
}

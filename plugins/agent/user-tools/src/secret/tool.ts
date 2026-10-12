import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { group, secretName } from '../names'
import type { Vault } from './vault'

const input = z.object({
  name: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Name it like an env var: capital letters, digits and _, starting with a letter')
    .describe('Env var name the value is given as, like OPENAI_API_KEY'),
  reason: z.string().min(1).max(300).describe('Why you need it; the user sees this'),
})

export const secretTool = (vault: Vault): Tool<typeof input> => ({
  name: secretName,
  group,
  description:
    "Ask the user for a secret such as an API key and wait. They type it into a password field; you never see it. It's given to this thread's shell commands as env var `name` and shows as *** in their output.",
  input,
  async run({ name }, { session, call, signal }) {
    const given = await vault.wait(call.id, session.id, name, signal)
    if (!given) return `The user did not give ${name}. Carry on without it, or say what you need it for.`
    return `${name} is set as an env var for this thread's shell commands. Its value shows as *** in their output.`
  },
})

import type { Accounts } from '../auth/accounts'
import { discoverAnthropic, discoverCodex, discoverOpenAI, discoverOpenRouter, discoverServer, type Discovered } from '../discover'
import type { SourceMeta } from './types'

const keyOf = async (accounts: Accounts, id: string) => {
  const credential = await accounts.auth(id)
  if (credential.type !== 'api_key') throw new Error(`${accounts.label(id)} has no API key`)
  return credential
}

export const discover = async (accounts: Accounts, meta: SourceMeta): Promise<Discovered[]> => {
  switch (meta.kind) {
    case 'claude':
    case 'anthropic':
      return discoverAnthropic(await accounts.auth(meta.id))
    case 'codex': {
      const credential = await accounts.auth(meta.id)
      if (credential.type !== 'oauth') throw new Error('Codex needs a ChatGPT sign-in')
      return discoverCodex(credential)
    }
    case 'openai':
      return discoverOpenAI(await keyOf(accounts, meta.id))
    case 'openrouter':
      return discoverOpenRouter((await keyOf(accounts, meta.id)).key)
    case 'server': {
      const server = accounts.server(meta.id)
      if (!server) throw new Error(`${meta.label} was removed`)
      return discoverServer(server.url, server.key)
    }
  }
}

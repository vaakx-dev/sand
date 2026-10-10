import type { Credential } from '../auth/store'
import { bearer, trimSlash } from '@sand/kit'

const chatgptUrl = 'https://chatgpt.com/backend-api/codex/responses'
const defaultBase = 'https://api.openai.com/v1'

const stream = { accept: 'text/event-stream', 'content-type': 'application/json' }

export const codexTarget = (credential: Credential, session: string) => {
  if (credential.type === 'api_key') {
    return {
      url: `${trimSlash(credential.base_url ?? defaultBase)}/responses`,
      headers: { ...bearer(credential.key), ...stream },
    }
  }
  if (!credential.accountId) throw new Error('The ChatGPT sign-in has no account id. Sign in again under Settings → Accounts')
  return {
    url: chatgptUrl,
    headers: {
      ...bearer(credential.access),
      'chatgpt-account-id': credential.accountId,
      'OpenAI-Beta': 'responses=experimental',
      originator: 'codex_cli_rs',
      session_id: session,
      ...stream,
    },
  }
}

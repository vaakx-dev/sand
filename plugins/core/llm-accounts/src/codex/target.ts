import type { Credential } from '../auth/store'

const chatgptUrl = 'https://chatgpt.com/backend-api/codex/responses'
const defaultBase = 'https://api.openai.com/v1'

const stream = { accept: 'text/event-stream', 'content-type': 'application/json' }

export const codexTarget = (credential: Credential, session: string) => {
  if (credential.type === 'api_key') {
    return {
      url: `${(credential.base_url ?? defaultBase).replace(/\/+$/, '')}/responses`,
      headers: { authorization: `Bearer ${credential.key}`, ...stream },
    }
  }
  if (!credential.accountId) throw new Error('The ChatGPT sign-in has no account id. Sign in again under Settings → Accounts')
  return {
    url: chatgptUrl,
    headers: {
      authorization: `Bearer ${credential.access}`,
      'chatgpt-account-id': credential.accountId,
      'OpenAI-Beta': 'responses=experimental',
      originator: 'codex_cli_rs',
      session_id: session,
      ...stream,
    },
  }
}

import { badge, choiceButton, choiceList, icon, tile } from '@sand/dom'
import type { LoginProvider, LoginState } from '@sand/protocol'
import { accountLogo } from '../names'

const subscriptions: { provider: LoginProvider; title: string; detail: string }[] = [
  { provider: 'anthropic', title: 'Claude', detail: 'Pro or Max subscription' },
  { provider: 'openai', title: 'ChatGPT', detail: 'Plus or Pro subscription' },
]

const chipFor = (state: LoginState | undefined, provider: LoginProvider) => {
  const here = state?.accounts.find(account => account.provider === provider)
  if (here?.signedIn && here.method === 'oauth') return badge('success', 'On this PC')
  const shared = state?.remote.find(account => account.provider === provider && account.method === 'oauth')
  return shared ? badge('accent', `On ${shared.pc}`) : null
}

export const chooseStep = (state: LoginState | undefined, start: (provider: LoginProvider) => void, key: () => void) =>
  choiceList(
    ...subscriptions.map(({ provider, title, detail }) =>
      choiceButton({ mark: accountLogo(provider), title, detail, chip: chipFor(state, provider), onClick: () => start(provider) }),
    ),
    choiceButton({ mark: tile(icon('lock', 16)), title: 'API key', detail: 'Anthropic or OpenAI', onClick: key }),
  )

import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { LoginState } from '../../contract'
import { accountLogo } from '../names'
import { customServer, type Step } from './steps'

interface Option {
  step: Step
  logo: string
  title: string
  detail: string
}

const groups: { label: string; options: Option[] }[] = [
  {
    label: 'Plans',
    options: [
      { step: { kind: 'sign-in', account: 'claude' }, logo: 'anthropic', title: 'Claude Code', detail: 'Sign in with your Claude Pro or Max plan' },
      { step: { kind: 'sign-in', account: 'codex' }, logo: 'openai', title: 'Codex', detail: 'Sign in with your ChatGPT plan' },
    ],
  },
  {
    label: 'API keys',
    options: [
      { step: { kind: 'key', account: 'anthropic' }, logo: 'anthropic', title: 'Anthropic', detail: 'Pay per token' },
      { step: { kind: 'key', account: 'openai' }, logo: 'openai', title: 'OpenAI', detail: 'Pay per token' },
      { step: { kind: 'key', account: 'openrouter' }, logo: 'openrouter', title: 'OpenRouter', detail: 'Hundreds of models with one key' },
    ],
  },
  {
    label: 'On your machine',
    options: [
      { step: { kind: 'detect' }, logo: 'ollama', title: 'Ollama or LM Studio', detail: 'Finds them on this PC' },
      { step: customServer, logo: 'server', title: 'Custom server', detail: 'Any OpenAI-compatible URL' },
    ],
  },
]

const accountOf = (step: Step) => (step.kind === 'sign-in' || step.kind === 'key' ? step.account : undefined)

const chipFor = ({ badge }: Kit, state: LoginState | undefined, step: Step) => {
  const id = accountOf(step)
  if (!id) return null
  if (state?.accounts.some(account => account.id === id && account.signedIn)) return badge('success', 'On this PC')
  const shared = state?.remote.find(account => account.id === id)
  return shared ? badge('accent', `On ${shared.pc}`) : null
}

export const chooseStep = (kit: Kit, state: LoginState | undefined, go: (step: Step) => void) => {
  const { choiceButton, choiceList, groupLabel } = kit
  return div(
    { class: 'flex flex-col' },
    groups.map(group =>
      div(
        { class: 'flex flex-col' },
        groupLabel(group.label),
        choiceList(
          ...group.options.map(option =>
            choiceButton({ mark: accountLogo(kit, option.logo), title: option.title, detail: option.detail, chip: chipFor(kit, state, option.step), onClick: () => go(option.step) }),
          ),
        ),
      ),
    ),
  )
}

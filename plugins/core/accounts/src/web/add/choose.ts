import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { LoginAccount, LoginState } from '../../contract'
import { accountLogo } from '../names'
import { customServer, type Step } from './steps'

interface Option {
  step: Step
  logo: string
  title: string
  detail: string
}

interface Group {
  label: string
  options: Option[]
}

const groups: Group[] = [
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

const planOption = ({ id, provider, label, signIn }: LoginAccount): Option[] =>
  signIn ? [{ step: { kind: 'sign-in', account: id }, logo: provider, title: label, detail: signIn.detail }] : []

const groupsFor = (state: LoginState | undefined): Group[] => {
  const plans = state?.accounts.flatMap(planOption) ?? []
  return plans.length ? [{ label: 'Plans', options: plans }, ...groups] : groups
}

const accountOf = (step: Step) => (step.kind === 'sign-in' || step.kind === 'key' ? step.account : undefined)

const whereFound = (state: LoginState | undefined, step: Step) => {
  const id = accountOf(step)
  if (!id) return null
  const own = state?.accounts.find(account => account.id === id)
  if (own?.signedIn) return 'On this PC'
  if (own?.app && !own.app.installed) return 'Not installed'
  const shared = state?.remote.find(account => account.id === id)
  return shared ? `On ${shared.pc}` : null
}

export const chooseStep = (kit: Kit, state: LoginState | undefined, go: (step: Step) => void) => {
  const { listRow, settingsSection } = kit
  return div(
    { class: 'flex flex-col gap-4' },
    groupsFor(state).map(group =>
      settingsSection(
        { title: group.label },
        ...group.options.map(option =>
          listRow({
            surface: 'group',
            lead: accountLogo(kit, option.logo),
            title: option.title,
            meta: option.detail,
            trail: whereFound(state, option.step),
            onClick: () => go(option.step),
          }),
        ),
      ),
    ),
  )
}

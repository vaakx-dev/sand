import { createHash } from 'node:crypto'

export const claudeCodeVersion = '2.1.280'
const entrypoint = 'sdk-cli'
const salt = '59cf53e54c78'
const positions = [4, 7, 20]
const identity = "You are a Claude agent, built on Anthropic's Claude Agent SDK."

const replacements = [
  {
    match: 'Here is some useful information about the environment you are running in:',
    replacement: 'Environment context you are running in:',
  },
]

type ApiMessage = { role: string; content: Array<Record<string, unknown>> }
type SystemBlock = { type: string; text: string; [key: string]: unknown }

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

const firstUserText = (messages: ApiMessage[]) => {
  const text = messages.find(message => message.role === 'user')?.content.find(block => block.type === 'text')?.text
  return typeof text === 'string' ? text : ''
}

export const billingHeader = (messages: ApiMessage[]) => {
  const text = firstUserText(messages)
  const sampled = positions.map(index => text[index] || '0').join('')
  const suffix = sha256(`${salt}${sampled}${claudeCodeVersion}`).slice(0, 3)
  return `x-anthropic-billing-header: cc_version=${claudeCodeVersion}.${suffix}; cc_entrypoint=${entrypoint}; cch=${sha256(text).slice(0, 5)};`
}

export const sanitize = (text: string) =>
  replacements.reduce((result, rule) => result.replace(rule.match, rule.replacement), text).trim()

export const claudeSystem = (system: SystemBlock[], messages: ApiMessage[]): SystemBlock[] => {
  const rest = system.map(block => ({ ...block, text: sanitize(block.text) })).filter(block => block.text && block.text !== identity)
  const billing: SystemBlock[] = messages.some(message => message.role === 'user') ? [{ type: 'text', text: billingHeader(messages) }] : []
  return [...billing, { type: 'text', text: identity }, ...rest]
}

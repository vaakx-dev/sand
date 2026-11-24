import type { Answer, Decision } from '../contract'

interface Choice {
  label: string
  answer: Answer
}

const wants: Record<Decision['effect'], string> = {
  read: 'wants to read outside its folder',
  write: 'wants to change files outside its folder',
  run: 'wants to run',
  send: 'wants to send',
  spend: 'wants to spend',
  delete: 'wants to delete',
}

const uses: Record<NonNullable<Decision['uses']>, string> = {
  login: 'wants a saved login',
  agents: 'wants to start agents',
}

export const asked = (decision: Decision) => {
  if (decision.blocked.length) return `auto blocked ${decision.blocked.length + 1}`
  return decision.uses ? uses[decision.uses] : wants[decision.effect]
}

export const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const choicesOf = (decision: Decision): [Choice, ...Choice[]] =>
  decision.once
    ? [
        { label: 'Allow', answer: 'once' },
        { label: 'Deny', answer: 'deny' },
      ]
    : [
        { label: 'Allow', answer: 'once' },
        { label: 'Always', answer: 'always' },
        { label: decision.outcome === 'expired' ? 'Dismiss' : 'Deny', answer: 'deny' },
      ]

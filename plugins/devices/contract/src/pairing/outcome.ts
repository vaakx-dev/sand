import type { OutgoingOutcome } from './types'

export const unjoinedText = (name: string, outcome: Exclude<OutgoingOutcome, 'approved'>, error?: string) => {
  switch (outcome) {
    case 'denied':
      return `${name} said no.`
    case 'expired':
      return `Nobody tapped Allow on ${name} in time. Try again.`
    case 'cancelled':
      return `The request to join ${name} was cancelled.`
    case 'failed':
      return `Couldn’t join ${name}: ${error ?? 'it stopped answering'}`
  }
}

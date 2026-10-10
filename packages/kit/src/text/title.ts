import { oneLine } from './line'

export const agentTitle = (title?: string | null) => {
  const flat = oneLine(title ?? '')
  return /^.*?[.!?](?=\s|$)/.exec(flat)?.[0] ?? (flat || 'Sub-agent')
}

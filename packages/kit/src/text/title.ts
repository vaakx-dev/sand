export const agentTitle = (title?: string | null) => {
  const flat = (title ?? '').replace(/\s+/g, ' ').trim()
  return /^.*?[.!?](?=\s|$)/.exec(flat)?.[0] ?? (flat || 'Sub-agent')
}

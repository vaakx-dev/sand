import type { UserContent } from '@sand/chats/contract'

const now = () => {
  const clock = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return `${clock.format(Date.now())} (${clock.resolvedOptions().timeZone})`
}

export const stamped = (content: UserContent[]): UserContent[] => [{ type: 'text', text: `<time>${now()}</time>`, typed: '' }, ...content]

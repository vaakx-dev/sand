const minute = 60_000
const hour = 60 * minute
const day = 24 * hour

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const dateWords = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export const clockWords = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

export const agoWords = (at: number, now = Date.now()) => {
  const since = now - at
  if (since < minute) return 'just now'
  if (since < hour) return `${Math.floor(since / minute)} min ago`
  if (since < day) return `${plural(Math.floor(since / hour), 'hour')} ago`
  if (since < 7 * day) return `${plural(Math.floor(since / day), 'day')} ago`
  return dateWords(at)
}

export const leftWords = (until: number, now = Date.now()) => {
  const seconds = Math.max(0, Math.ceil((until - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} left`
}

export const secondsUntil = (at: number, now = Date.now()) => Math.max(0, Math.ceil((at - now) / 1000))

export const lifeWords = (until: number, now = Date.now()) => {
  const minutes = Math.round((until - now) / minute)
  if (minutes >= 55) return `the next ${plural(Math.round(minutes / 60), 'hour')}`
  return `the next ${plural(Math.max(1, minutes), 'minute')}`
}

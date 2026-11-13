const sameDay = (at: number) => new Date(at).toDateString() === new Date().toDateString()

const timeText = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const whenText = (at: number) => (sameDay(at) ? timeText(at) : `${new Date(at).toLocaleDateString([], { weekday: 'short' })} ${timeText(at)}`)

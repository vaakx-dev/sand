const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (value: number) => String(value).padStart(2, '0')

const zoneOf = (date: Date) => {
  const offset = -date.getTimezoneOffset()
  const size = Math.abs(offset)
  return `${offset < 0 ? '-' : '+'}${pad(Math.floor(size / 60))}:${pad(size % 60)}`
}

export const timestamp = (at: number) => {
  const date = new Date(at)
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${days[date.getDay()]} ${day} ${pad(date.getHours())}:${pad(date.getMinutes())} ${zoneOf(date)}`
}

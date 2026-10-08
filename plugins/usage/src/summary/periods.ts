import type { UsageBucket } from '@sand/protocol'

const formatter = (zone: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }
  try {
    return new Intl.DateTimeFormat('en-CA', { ...options, timeZone: zone })
  } catch {
    return new Intl.DateTimeFormat('en-CA', options)
  }
}

export const periodKey = (zone: string, bucket: UsageBucket) => {
  const format = formatter(zone)
  return (at: number) => {
    const parts = Object.fromEntries(format.formatToParts(at).map(part => [part.type, part.value]))
    const day = `${parts.year}-${parts.month}-${parts.day}`
    return bucket === 'day' ? day : `${day} ${parts.hour}`
  }
}

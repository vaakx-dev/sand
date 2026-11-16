import type { UsageBucket } from '../contract'

const pad = (value: number) => String(value).padStart(2, '0')

export const keyOf = (date: Date, bucket: UsageBucket) => {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return bucket === 'day' ? day : `${day} ${pad(date.getHours())}`
}

export const hourKey = (at: number) => keyOf(new Date(at), 'hour')

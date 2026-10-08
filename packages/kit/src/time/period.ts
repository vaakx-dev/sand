import type { UsageBucket } from '@sand/protocol'

const periodDate = (key: string) => {
  const [day = key, hour = '0'] = key.split(' ')
  return new Date(`${day}T${hour.padStart(2, '0')}:00:00`)
}

export const periodLabel = (key: string, bucket: UsageBucket) =>
  bucket === 'hour'
    ? periodDate(key).toLocaleTimeString('en', { hour: 'numeric' })
    : periodDate(key).toLocaleDateString('en', { month: 'short', day: 'numeric' })

export const periodTitle = (key: string, bucket: UsageBucket) =>
  bucket === 'hour'
    ? periodDate(key).toLocaleString('en', { weekday: 'short', hour: 'numeric' })
    : periodDate(key).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

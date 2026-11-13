import { ago, dollars } from '@sand/util'

export const tickText = (value: number) => (Number.isInteger(value) ? `$${value}` : dollars(value))

export const agoText = (at: number) => {
  const since = ago(at)
  return since === 'now' ? 'just now' : `${since} ago`
}

export interface Ip {
  family: 4 | 6
  parts: number[]
}

const hexGroup = /^[0-9a-f]{1,4}$/i

export const parseIpv4 = (text: string) => {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text)
  const parts = match?.slice(1).map(Number)
  return parts?.every(part => part <= 255) ? parts : undefined
}

const withHexTail = (text: string) => {
  const cut = text.lastIndexOf(':')
  const tail = parseIpv4(text.slice(cut + 1))
  if (!tail) return text
  const [a = 0, b = 0, c = 0, d = 0] = tail
  return `${text.slice(0, cut + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
}

const groupsOf = (part: string) => (part ? part.split(':') : [])

export const parseIpv6 = (text: string) => {
  const halves = withHexTail(text).split('::')
  if (halves.length > 2) return
  const left = groupsOf(halves[0] ?? '')
  const right = groupsOf(halves[1] ?? '')
  const missing = 8 - left.length - right.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return
  const groups = [...left, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...right]
  return groups.every(group => hexGroup.test(group)) ? groups.map(group => Number.parseInt(group, 16)) : undefined
}

const isMapped = (parts: number[]) => parts.slice(0, 5).every(part => part === 0) && parts[5] === 0xffff

const mappedIpv4 = (parts: number[]) => {
  const [high = 0, low = 0] = parts.slice(6)
  return [high >> 8, high & 0xff, low >> 8, low & 0xff]
}

export const parseIp = (address: string): Ip | undefined => {
  const plain = address.trim().toLowerCase().replace(/^\[(.*)\]$/, '$1').replace(/%.*$/, '')
  const ipv4 = parseIpv4(plain)
  if (ipv4) return { family: 4, parts: ipv4 }
  const ipv6 = parseIpv6(plain)
  if (!ipv6) return
  return isMapped(ipv6) ? { family: 4, parts: mappedIpv4(ipv6) } : { family: 6, parts: ipv6 }
}

const bitsOf = ({ family, parts }: Ip) => parts.reduce((bits, part) => (bits << BigInt(family === 4 ? 8 : 16)) | BigInt(part), 0n)

export const samePrefix = (a: Ip, b: Ip, prefix: number) => {
  if (a.family !== b.family) return false
  const shift = BigInt((a.family === 4 ? 32 : 128) - prefix)
  return bitsOf(a) >> shift === bitsOf(b) >> shift
}

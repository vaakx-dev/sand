import { isIP } from 'node:net'

const privateV4 = (address: string) => {
  const [a = 0, b = 0] = address.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b < 128) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b < 32) ||
    (a === 192 && b === 168)
  )
}

const mappedV4 = (address: string) => {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address)?.[1]
  if (dotted) return dotted
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(address)
  if (!hex) return undefined
  const high = parseInt(hex[1]!, 16)
  const low = parseInt(hex[2]!, 16)
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`
}

const privateV6 = (address: string) => {
  const lower = address.toLowerCase()
  const v4 = mappedV4(lower)
  if (v4) return privateV4(v4)
  return lower === '::' || lower === '::1' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower)
}

const isPrivate = (address: string) => (isIP(address) === 4 ? privateV4(address) : privateV6(address))

const addressesOf = async (host: string) => (isIP(host) ? [host] : (await Bun.dns.lookup(host)).map(entry => entry.address))

export const assertPublic = async (url: URL) => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`web_fetch reads http and https URLs, not ${url.protocol}`)
  const addresses = await addressesOf(url.hostname.replace(/^\[|\]$/g, ''))
  if (addresses.some(isPrivate)) throw new Error(`${url.hostname} is a local or private address. Use the browser agent for local pages.`)
}

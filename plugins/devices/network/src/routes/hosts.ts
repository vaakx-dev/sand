const ipv4Parts = (address: string) => {
  const parts = address.split('.')
  if (parts.length !== 4 || !parts.every(part => /^\d{1,3}$/.test(part))) return
  const numbers = parts.map(Number)
  return numbers.every(part => part <= 255) ? numbers : undefined
}

export const isIpv4 = (address: string) => Boolean(ipv4Parts(address))

export const isTailscaleIp = (address: string) => {
  if (address.toLowerCase().startsWith('fd7a:115c:a1e0:')) return true
  const [first, second = 0] = ipv4Parts(address) ?? []
  return first === 100 && second >= 64 && second <= 127
}

export const isLinkLocal = (address: string) => address.startsWith('169.254.') || /^fe[89ab]/i.test(address)

export const isPrivateIpv4 = (address: string) => {
  const [first, second = 0] = ipv4Parts(address) ?? []
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)
}

export const unmapIpv4 = (address: string) => address.replace(/^::ffff:/i, '')

export const urlFor = (address: string, port: number) => `http://${address.includes(':') ? `[${address}]` : address}:${port}`
